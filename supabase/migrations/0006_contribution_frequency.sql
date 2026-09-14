-- =============================================================================
-- SavR — frecuencia de abono preferida por meta
--
-- El motor de cálculo (engine.ts) sigue siendo 100% diario: cuota, atrasos,
-- buffer y racha se calculan día a día y esto NO cambia. contribution_frequency
-- es sólo la preferencia de cadencia que el usuario elige al crear la meta
-- ("¿cada cuánto planeas abonar?"), usada en la UI para mostrar el monto
-- equivalente por periodo (p. ej. "≈ $455 cada semana"). No participa en
-- ningún cálculo de atraso, buffer o racha.
-- =============================================================================

create type contribution_frequency as enum ('daily', 'weekly', 'biweekly', 'monthly');

alter table public.goals
  add column contribution_frequency contribution_frequency not null default 'daily';
