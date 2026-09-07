-- =============================================================================
-- SavR — RPCs y storage
-- =============================================================================

-- Vista previa de una invitación por código (sin ser aún miembro de la meta).
create or replace function public.peek_invitation(p_code text)
returns table (
  goal_id       uuid,
  goal_name     text,
  goal_image    text,
  target_amount bigint,
  due_date      date,
  share_bps     integer,
  owner_name    text,
  owner_avatar  text,
  already_member boolean,
  invalid_reason text
)
language plpgsql stable security definer set search_path = public as $$
declare
  inv public.invitations;
  g   public.goals;
  p   public.profiles;
  reason text := null;
begin
  select * into inv from public.invitations where code = upper(trim(p_code));
  if not found then
    return query select null::uuid, null::text, null::text, null::bigint, null::date,
                        null::integer, null::text, null::text, false, 'not_found';
    return;
  end if;

  select * into g from public.goals where id = inv.goal_id;
  select * into p from public.profiles where id = g.owner_id;

  if inv.revoked then reason := 'revoked';
  elsif inv.accepted_at is not null then reason := 'already_used';
  elsif inv.expires_at < now() then reason := 'expired';
  elsif g.status in ('archived', 'completed') then reason := 'goal_closed';
  end if;

  return query select g.id, g.name, g.image_url, g.target_amount, g.due_date,
                      inv.share_bps, p.full_name, p.avatar_url,
                      public.is_goal_member(g.id), reason;
end $$;

-- Aceptar una invitación: crea la membresía y reajusta el reparto del owner.
create or replace function public.accept_invitation(p_code text)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  inv public.invitations;
  g   public.goals;
  uid uuid := auth.uid();
  uemail text := lower(auth.jwt() ->> 'email');
  owner_share integer;
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  select * into inv from public.invitations where code = upper(trim(p_code)) for update;
  if not found then raise exception 'invitation_not_found'; end if;
  if inv.revoked then raise exception 'invitation_revoked'; end if;
  if inv.expires_at < now() then raise exception 'invitation_expired'; end if;
  if inv.invited_email is not null and lower(inv.invited_email) <> uemail then
    raise exception 'invitation_email_mismatch';
  end if;

  select * into g from public.goals where id = inv.goal_id;
  if g.status in ('archived', 'completed') then raise exception 'goal_closed'; end if;

  if exists (select 1 from public.goal_members where goal_id = g.id and user_id = uid) then
    return g.id; -- idempotente
  end if;

  insert into public.goal_members (goal_id, user_id, role, share_bps)
  values (g.id, uid, 'collaborator', inv.share_bps);

  -- el resto del porcentaje se reparte al owner
  owner_share := greatest(0, 10000 - (
    select coalesce(sum(share_bps), 0) from public.goal_members
     where goal_id = g.id and user_id <> g.owner_id));
  update public.goal_members set share_bps = owner_share
   where goal_id = g.id and user_id = g.owner_id;

  update public.invitations
     set accepted_by = uid, accepted_at = now()
   where id = inv.id;

  return g.id;
end $$;

-- Promover un item de la wishlist a meta activa.
create or replace function public.promote_wishlist_item(
  p_item_id uuid, p_due_date date, p_surplus_mode surplus_mode default 'buffer')
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  it public.wishlist_items;
  new_goal uuid;
begin
  select * into it from public.wishlist_items where id = p_item_id and user_id = auth.uid();
  if not found then raise exception 'item_not_found'; end if;
  if it.estimated_amount is null then raise exception 'item_has_no_amount'; end if;

  insert into public.goals (owner_id, name, image_url, target_amount, due_date, surplus_mode)
  values (auth.uid(), it.name, it.image_url, it.estimated_amount, p_due_date, p_surplus_mode)
  returning id into new_goal;

  update public.wishlist_items set promoted_goal_id = new_goal where id = it.id;
  return new_goal;
end $$;

grant execute on function public.peek_invitation(text)        to authenticated;
grant execute on function public.accept_invitation(text)      to authenticated;
grant execute on function public.promote_wishlist_item(uuid, date, surplus_mode) to authenticated;

-- --- storage: portadas de metas ---------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('goal-covers', 'goal-covers', true, 5242880,
        array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "goal covers son públicas de lectura"
  on storage.objects for select using (bucket_id = 'goal-covers');

-- cada usuario escribe sólo dentro de su carpeta: goal-covers/<uid>/...
create policy "subir portada propia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'goal-covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "actualizar portada propia"
  on storage.objects for update to authenticated
  using (bucket_id = 'goal-covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borrar portada propia"
  on storage.objects for delete to authenticated
  using (bucket_id = 'goal-covers' and (storage.foldername(name))[1] = auth.uid()::text);
