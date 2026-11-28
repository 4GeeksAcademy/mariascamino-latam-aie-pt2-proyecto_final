-- 001_telemetry_events.sql — append-only telemetry storage (Supabase / PostgreSQL).
--
-- Idempotent: safe to run more than once. The API runs it on startup
-- (database.init_db) and it can also be pasted into the Supabase SQL editor.
-- Column mapping from the Event Envelope: docs/telemetry/telemetry-plan.md §12.

create table if not exists public.telemetry_events (
    id          uuid        primary key default gen_random_uuid(),  -- = envelope eventId (dedupe key)
    "timestamp" timestamptz not null,                                -- when the fact happened (capture time)
    service     text        not null,                                -- envelope source: backoffice | api | scheduler
    event_type  text        not null,                                -- entity_action
    level       text        not null default 'info'
                check (level in ('info', 'warn', 'error')),
    value       numeric,                                             -- main numeric measure of the event, if any
    message     text,                                                -- generated summary, never user free text
    tags        jsonb       not null default '{}'::jsonb             -- allowlisted properties + envelope ids
);

-- The three indexes the analytics queries of the next phase rely on.
create index if not exists ix_telemetry_events_timestamp  on public.telemetry_events ("timestamp");
create index if not exists ix_telemetry_events_event_type on public.telemetry_events (event_type);
create index if not exists ix_telemetry_events_tags       on public.telemetry_events using gin (tags);

-- Events are immutable facts: no UPDATE, DELETE or TRUNCATE, not even by
-- mistake from the SQL editor. (Retention/erasure, plan §8.4, will be an
-- explicit, audited job that disables this guard on purpose.)
create or replace function public.telemetry_events_append_only()
returns trigger
language plpgsql
as $fn$
begin
    raise exception 'telemetry_events is append-only (% is not allowed)', tg_op;
end;
$fn$;

drop trigger if exists telemetry_events_no_update_delete on public.telemetry_events;
create trigger telemetry_events_no_update_delete
    before update or delete on public.telemetry_events
    for each row execute function public.telemetry_events_append_only();

drop trigger if exists telemetry_events_no_truncate on public.telemetry_events;
create trigger telemetry_events_no_truncate
    before truncate on public.telemetry_events
    for each statement execute function public.telemetry_events_append_only();

-- Not reachable through Supabase's public REST API: RLS on and no policies.
-- The FastAPI backend connects as the database owner and is the only writer.
alter table public.telemetry_events enable row level security;

do $roles$
begin
    if exists (select 1 from pg_roles where rolname = 'anon') then
        revoke all on public.telemetry_events from anon;
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        revoke all on public.telemetry_events from authenticated;
    end if;
end;
$roles$;
