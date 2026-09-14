-- =============================================================================
-- SavR — mueve la revisión de "meta completada" a la base de datos
--
-- addContribution y payAllDailyQuotas llamaban a maybeCompleteGoal() desde
-- Node después de cada insert: 2-3 round trips extra a Postgres (leer la
-- meta, sumar aportaciones, actualizar status) por cada aportación. En
-- payAllDailyQuotas, que puede insertar aportaciones para varias metas a la
-- vez, esas llamadas se hacían una por una en un for-loop secuencial — el
-- origen del delay reportado en botones tan simples como "cubrir cuota de
-- hoy" y del botón maestro de la pantalla principal.
--
-- Este trigger hace exactamente lo mismo que maybeCompleteGoal, pero del
-- lado del servidor y por fila insertada: cero round trips adicionales desde
-- Node, sin importar cuántas metas se liquiden en un mismo insert.
-- =============================================================================

create or replace function public.sync_goal_completion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target bigint;
  cur_status goal_status;
  total bigint;
begin
  select target_amount, status into target, cur_status
  from public.goals
  where id = new.goal_id;

  if cur_status is distinct from 'completed' then
    select coalesce(sum(amount), 0) into total
    from public.contributions
    where goal_id = new.goal_id;

    if total >= target then
      update public.goals
        set status = 'completed', completed_at = now()
        where id = new.goal_id;
    end if;
  end if;

  return new;
end $$;

create trigger contributions_sync_completion
  after insert on public.contributions
  for each row execute function public.sync_goal_completion();
