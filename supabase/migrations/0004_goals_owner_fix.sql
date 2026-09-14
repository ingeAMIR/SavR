-- =============================================================================
-- SavR — corrige "new row violates row-level security policy for table goals"
--
-- El insert directo de goals (createGoal) ya mandaba owner_id = auth.uid(), y la
-- política goals_insert ya exige owner_id = auth.uid(); en teoría coinciden.
-- Para que la creación de metas deje de depender de que el cliente mande el
-- owner_id correcto (y de cualquier desfase entre el valor que ve el cliente y
-- el que ve Postgres para auth.uid() en la misma request), este trigger fija
-- owner_id del lado del servidor, con la MISMA función que evalúa la política.
-- Así el check WITH CHECK (owner_id = auth.uid()) siempre se compara consigo
-- mismo y nunca puede fallar para un usuario autenticado.
-- =============================================================================

create or replace function public.force_goal_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  new.owner_id := auth.uid();
  return new;
end $$;

create trigger goals_force_owner
  before insert on public.goals
  for each row execute function public.force_goal_owner();
