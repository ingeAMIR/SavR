-- =============================================================================
-- SavR — Row Level Security
-- Las funciones helper son SECURITY DEFINER para romper la recursión de
-- políticas (goal_members se consulta a sí misma).
-- =============================================================================

create or replace function public.is_goal_member(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.goal_members m
     where m.goal_id = g and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_goal_owner(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.goals gl
     where gl.id = g and gl.owner_id = auth.uid()
  );
$$;

-- ¿comparto alguna meta con este usuario? (para ver su avatar/nombre)
create or replace function public.shares_goal_with(u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.goal_members a
      join public.goal_members b on a.goal_id = b.goal_id
     where a.user_id = auth.uid() and b.user_id = u
  );
$$;

alter table public.profiles       enable row level security;
alter table public.goals          enable row level security;
alter table public.goal_members   enable row level security;
alter table public.contributions  enable row level security;
alter table public.reactions      enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.invitations    enable row level security;

-- --- profiles ----------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_goal_with(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- --- goals -------------------------------------------------------------------
create policy goals_select on public.goals for select to authenticated
  using (public.is_goal_member(id));
create policy goals_insert on public.goals for insert to authenticated
  with check (owner_id = auth.uid());
create policy goals_update on public.goals for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy goals_delete on public.goals for delete to authenticated
  using (owner_id = auth.uid());

-- --- goal_members ------------------------------------------------------------
create policy members_select on public.goal_members for select to authenticated
  using (public.is_goal_member(goal_id));
create policy members_insert on public.goal_members for insert to authenticated
  with check (public.is_goal_owner(goal_id));
-- el owner ajusta cualquier reparto; el colaborador sólo el suyo
create policy members_update on public.goal_members for update to authenticated
  using (public.is_goal_owner(goal_id) or user_id = auth.uid())
  with check (public.is_goal_owner(goal_id) or user_id = auth.uid());
-- el owner expulsa; el colaborador puede salirse
create policy members_delete on public.goal_members for delete to authenticated
  using ((public.is_goal_owner(goal_id) and role <> 'owner') or user_id = auth.uid());

-- --- contributions -----------------------------------------------------------
create policy contributions_select on public.contributions for select to authenticated
  using (public.is_goal_member(goal_id));
create policy contributions_insert on public.contributions for insert to authenticated
  with check (user_id = auth.uid() and public.is_goal_member(goal_id));
create policy contributions_update on public.contributions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy contributions_delete on public.contributions for delete to authenticated
  using (user_id = auth.uid() or public.is_goal_owner(goal_id));

-- --- reactions ---------------------------------------------------------------
create policy reactions_select on public.reactions for select to authenticated
  using (exists (
    select 1 from public.contributions c
     where c.id = contribution_id and public.is_goal_member(c.goal_id)));
create policy reactions_insert on public.reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.contributions c
     where c.id = contribution_id and public.is_goal_member(c.goal_id)));
create policy reactions_delete on public.reactions for delete to authenticated
  using (user_id = auth.uid());

-- --- wishlist ----------------------------------------------------------------
create policy wishlist_all on public.wishlist_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- invitations -------------------------------------------------------------
-- La lectura por código se hace vía RPC (peek_invitation), no por SELECT directo.
create policy invitations_select on public.invitations for select to authenticated
  using (public.is_goal_member(goal_id) or lower(invited_email) = lower(auth.jwt() ->> 'email'));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (created_by = auth.uid() and public.is_goal_owner(goal_id));
create policy invitations_update on public.invitations for update to authenticated
  using (public.is_goal_owner(goal_id)) with check (public.is_goal_owner(goal_id));

-- --- realtime ----------------------------------------------------------------
alter publication supabase_realtime add table public.contributions;
alter publication supabase_realtime add table public.goals;
alter publication supabase_realtime add table public.goal_members;
alter publication supabase_realtime add table public.reactions;
