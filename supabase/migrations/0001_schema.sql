-- =============================================================================
-- SavR — esquema base
-- Todo el dinero es SIMULADO y se guarda en centavos (bigint) para evitar
-- errores de punto flotante.
-- =============================================================================

create extension if not exists "pgcrypto";

-- --- enums -------------------------------------------------------------------
create type goal_status     as enum ('active', 'paused', 'completed', 'archived');
create type surplus_mode    as enum ('buffer', 'accelerate');
create type member_role     as enum ('owner', 'collaborator');
create type contribution_kind as enum ('manual', 'daily', 'global', 'micro', 'adjustment');

-- --- profiles ----------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  email            text not null,
  full_name        text,
  avatar_url       text,
  currency         text not null default 'MXN',
  timezone         text not null default 'America/Mexico_City',
  reminder_enabled boolean not null default true,
  reminder_time    time not null default '21:00',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (lower(email));

-- --- goals -------------------------------------------------------------------
create table public.goals (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  name           text not null check (char_length(trim(name)) between 1 and 80),
  image_url      text,
  target_amount  bigint not null check (target_amount > 0),
  start_date     date not null default current_date,
  due_date       date not null,
  status         goal_status not null default 'active',
  surplus_mode   surplus_mode not null default 'buffer',
  -- paso de redondeo sugerido para la cuota diaria, en centavos (0 = sin redondeo)
  rounding_step  integer not null default 0 check (rounding_step >= 0),
  is_shared      boolean not null default false,
  purchased_at   timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint goals_due_after_start check (due_date >= start_date)
);
create index goals_owner_idx on public.goals (owner_id);

-- --- membresías y reparto de cuotas -----------------------------------------
create table public.goal_members (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.goals (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       member_role not null default 'collaborator',
  -- porcentaje del objetivo que le toca a este miembro, en puntos base (10000 = 100%)
  share_bps  integer not null default 10000 check (share_bps between 0 and 10000),
  joined_at  timestamptz not null default now(),
  unique (goal_id, user_id)
);
create index goal_members_user_idx on public.goal_members (user_id);

-- --- aportaciones (movimientos simulados) ------------------------------------
create table public.contributions (
  id           uuid primary key default gen_random_uuid(),
  goal_id      uuid not null references public.goals (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  amount       bigint not null check (amount <> 0),
  kind         contribution_kind not null default 'manual',
  note         text check (char_length(note) <= 140),
  -- día local del usuario al que se imputa el abono (no el timestamp UTC)
  occurred_on  date not null default current_date,
  created_at   timestamptz not null default now()
);
create index contributions_goal_idx on public.contributions (goal_id, occurred_on desc);
create index contributions_user_day_idx on public.contributions (user_id, occurred_on desc);

-- --- reacciones al feed ------------------------------------------------------
create table public.reactions (
  id              uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  emoji           text not null check (char_length(emoji) <= 8),
  created_at      timestamptz not null default now(),
  unique (contribution_id, user_id, emoji)
);
create index reactions_contribution_idx on public.reactions (contribution_id);

-- --- wishlist ----------------------------------------------------------------
create table public.wishlist_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  name             text not null check (char_length(trim(name)) between 1 and 80),
  estimated_amount bigint check (estimated_amount > 0),
  image_url        text,
  link_url         text,
  promoted_goal_id uuid references public.goals (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index wishlist_user_idx on public.wishlist_items (user_id, created_at desc);

-- --- invitaciones ------------------------------------------------------------
create table public.invitations (
  id            uuid primary key default gen_random_uuid(),
  goal_id       uuid not null references public.goals (id) on delete cascade,
  code          text not null unique,
  invited_email text,
  share_bps     integer not null default 5000 check (share_bps between 0 and 10000),
  created_by    uuid not null references public.profiles (id) on delete cascade,
  expires_at    timestamptz not null default (now() + interval '14 days'),
  accepted_by   uuid references public.profiles (id) on delete set null,
  accepted_at   timestamptz,
  revoked       boolean not null default false
);
create index invitations_goal_idx on public.invitations (goal_id);
create index invitations_email_idx on public.invitations (lower(invited_email));

-- --- updated_at --------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();

-- --- alta automática de perfil al registrarse con Google ---------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end $$;

create trigger on_auth_user_created
  after insert or update of raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

-- --- el creador de una meta siempre es miembro owner -------------------------
create or replace function public.handle_new_goal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.goal_members (goal_id, user_id, role, share_bps)
  values (new.id, new.owner_id, 'owner', 10000)
  on conflict (goal_id, user_id) do nothing;
  return new;
end $$;

create trigger on_goal_created
  after insert on public.goals
  for each row execute function public.handle_new_goal();

-- marca la meta como compartida cuando hay más de un miembro
create or replace function public.sync_goal_is_shared()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  gid uuid := coalesce(new.goal_id, old.goal_id);
begin
  update public.goals g
     set is_shared = (select count(*) from public.goal_members m where m.goal_id = gid) > 1
   where g.id = gid;
  return null;
end $$;

create trigger goal_members_sync_shared
  after insert or delete on public.goal_members
  for each row execute function public.sync_goal_is_shared();
