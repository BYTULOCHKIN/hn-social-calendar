create extension if not exists pgcrypto;

create type public.app_role as enum ('administrator', 'analytics_viewer', 'subdivision_editor', 'viewer');
create type public.publication_topic as enum (
  'Технічні питання',
  'Акції',
  'Нагадування про оплату',
  'Інформаційний пост',
  'Розважальний пост',
  'Аварія'
);

create table public.managements (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subdivisions (
  id uuid primary key default gen_random_uuid(),
  management_id uuid not null references public.managements(id),
  external_id text unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bushes (
  id uuid primary key default gen_random_uuid(),
  subdivision_id uuid not null references public.subdivisions(id),
  external_id text unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subdivision_id, name)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  full_name text not null,
  normalized_full_name text not null,
  employment_end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index employees_normalized_name_idx on public.employees using gin (to_tsvector('simple', normalized_full_name));

create or replace function public.sync_employee_active()
returns trigger language plpgsql as $$
begin
  new.active = new.employment_end_date is null or new.employment_end_date >= current_date;
  return new;
end;
$$;

create trigger employees_active before insert or update of employment_end_date on public.employees
for each row execute function public.sync_employee_active();

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'viewer',
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_subdivisions (
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  subdivision_id uuid not null references public.subdivisions(id) on delete cascade,
  primary key (user_id, subdivision_id)
);

create table public.social_groups (
  id uuid primary key default gen_random_uuid(),
  subdivision_id uuid not null references public.subdivisions(id),
  bush_id uuid not null references public.bushes(id),
  name text not null check (length(trim(name)) > 0),
  url text not null check (url ~ '^https?://'),
  current_employee_id uuid not null references public.employees(id),
  position integer not null default 0 check (position >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index social_groups_subdivision_idx on public.social_groups(subdivision_id, active, position);

create table public.publication_slots (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.social_groups(id),
  publication_date date not null check (publication_date between date '2026-01-01' and date '2035-12-31'),
  version integer not null default 1,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, publication_date)
);

create table public.publication_topics (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.publication_slots(id) on delete cascade,
  topic public.publication_topic not null,
  employee_id_snapshot uuid not null references public.employees(id),
  employee_name_snapshot text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (slot_id, topic)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  entity_type text not null,
  entity_id text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.check_active_group_limit()
returns trigger language plpgsql as $$
declare active_count integer;
begin
  if new.active then
    select count(*) into active_count
    from public.social_groups
    where subdivision_id = new.subdivision_id and active and id <> new.id;
    if active_count >= 20 then
      raise exception 'A subdivision can have no more than 20 active groups' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.check_topic_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.publication_topics where slot_id = new.slot_id and id <> new.id) >= 2 then
    raise exception 'A calendar slot can have no more than two topics' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.write_audit_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_events(user_id, entity_type, entity_id, action, old_value, new_value)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(new.id, old.id)::text,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger managements_updated_at before update on public.managements for each row execute function public.touch_updated_at();
create trigger subdivisions_updated_at before update on public.subdivisions for each row execute function public.touch_updated_at();
create trigger bushes_updated_at before update on public.bushes for each row execute function public.touch_updated_at();
create trigger employees_updated_at before update on public.employees for each row execute function public.touch_updated_at();
create trigger social_groups_updated_at before update on public.social_groups for each row execute function public.touch_updated_at();
create trigger publication_slots_updated_at before update on public.publication_slots for each row execute function public.touch_updated_at();
create trigger social_groups_limit before insert or update of active, subdivision_id on public.social_groups for each row execute function public.check_active_group_limit();
create trigger publication_topics_limit before insert on public.publication_topics for each row execute function public.check_topic_limit();
create trigger social_groups_audit after insert or update or delete on public.social_groups for each row execute function public.write_audit_event();
create trigger publication_topics_audit after insert or update or delete on public.publication_topics for each row execute function public.write_audit_event();

create or replace function public.replace_publication_topics(
  p_group_id uuid,
  p_publication_date date,
  p_topics public.publication_topic[],
  p_expected_updated_at timestamptz default null
)
returns table(slot_id uuid, updated_at timestamptz, version integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_slot public.publication_slots%rowtype;
  v_employee public.employees%rowtype;
  v_topic public.publication_topic;
begin
  if cardinality(p_topics) > 2 or cardinality(p_topics) <> cardinality(array(select distinct unnest(p_topics))) then
    raise exception 'Topics must contain zero to two unique values' using errcode = '23514';
  end if;

  select e.* into strict v_employee
  from public.social_groups g join public.employees e on e.id = g.current_employee_id
  where g.id = p_group_id and g.active;

  insert into public.publication_slots(group_id, publication_date, created_by)
  values (p_group_id, p_publication_date, auth.uid())
  on conflict (group_id, publication_date) do nothing;

  select * into strict v_slot from public.publication_slots
  where group_id = p_group_id and publication_date = p_publication_date for update;

  if p_expected_updated_at is not null and v_slot.updated_at <> p_expected_updated_at then
    raise exception 'Calendar slot was changed by another user' using errcode = '40001';
  end if;

  delete from public.publication_topics where publication_topics.slot_id = v_slot.id;
  foreach v_topic in array p_topics loop
    insert into public.publication_topics(slot_id, topic, employee_id_snapshot, employee_name_snapshot, created_by)
    values (v_slot.id, v_topic, v_employee.id, v_employee.full_name, auth.uid());
  end loop;

  update public.publication_slots
  set version = publication_slots.version + 1, updated_at = now()
  where id = v_slot.id
  returning publication_slots.id, publication_slots.updated_at, publication_slots.version
  into slot_id, updated_at, version;
  return next;
end;
$$;

create or replace view public.publication_analytics as
select
  pt.id,
  ps.publication_date,
  pt.topic,
  pt.employee_id_snapshot,
  pt.employee_name_snapshot,
  sg.id as group_id,
  sg.name as group_name,
  s.id as subdivision_id,
  s.name as subdivision_name,
  m.id as management_id,
  m.name as management_name
from public.publication_topics pt
join public.publication_slots ps on ps.id = pt.slot_id
join public.social_groups sg on sg.id = ps.group_id
join public.subdivisions s on s.id = sg.subdivision_id
join public.managements m on m.id = s.management_id;

alter table public.managements enable row level security;
alter table public.subdivisions enable row level security;
alter table public.bushes enable row level security;
alter table public.employees enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_subdivisions enable row level security;
alter table public.social_groups enable row level security;
alter table public.publication_slots enable row level security;
alter table public.publication_topics enable row level security;
alter table public.audit_events enable row level security;

create or replace function public.current_user_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.user_profiles where user_id = auth.uid()
$$;

create or replace function public.can_access_subdivision(p_subdivision_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('administrator', 'analytics_viewer')
    or exists (select 1 from public.user_subdivisions where user_id = auth.uid() and subdivision_id = p_subdivision_id)
$$;

create policy "authenticated can read managements" on public.managements for select to authenticated using (true);
create policy "authenticated can read subdivisions" on public.subdivisions for select to authenticated using (public.can_access_subdivision(id));
create policy "authenticated can read bushes" on public.bushes for select to authenticated using (public.can_access_subdivision(subdivision_id));
create policy "authenticated can read active employees" on public.employees for select to authenticated using (active or public.current_user_role() in ('administrator', 'analytics_viewer'));
create policy "users can read own profile" on public.user_profiles for select to authenticated using (user_id = auth.uid() or public.current_user_role() = 'administrator');
create policy "users can read assignments" on public.user_subdivisions for select to authenticated using (user_id = auth.uid() or public.current_user_role() = 'administrator');
create policy "allowed users can read groups" on public.social_groups for select to authenticated using (public.can_access_subdivision(subdivision_id));
create policy "editors can create groups" on public.social_groups for insert to authenticated with check (public.current_user_role() = 'administrator' or (public.current_user_role() = 'subdivision_editor' and public.can_access_subdivision(subdivision_id)));
create policy "editors can update groups" on public.social_groups for update to authenticated using (public.current_user_role() = 'administrator' or (public.current_user_role() = 'subdivision_editor' and public.can_access_subdivision(subdivision_id)));
create policy "allowed users can read slots" on public.publication_slots for select to authenticated using (exists (select 1 from public.social_groups g where g.id = group_id and public.can_access_subdivision(g.subdivision_id)));
create policy "editors can write slots" on public.publication_slots for all to authenticated using (exists (select 1 from public.social_groups g where g.id = group_id and (public.current_user_role() = 'administrator' or (public.current_user_role() = 'subdivision_editor' and public.can_access_subdivision(g.subdivision_id))))) with check (exists (select 1 from public.social_groups g where g.id = group_id and (public.current_user_role() = 'administrator' or (public.current_user_role() = 'subdivision_editor' and public.can_access_subdivision(g.subdivision_id)))));
create policy "allowed users can read topics" on public.publication_topics for select to authenticated using (exists (select 1 from public.publication_slots ps join public.social_groups g on g.id = ps.group_id where ps.id = slot_id and public.can_access_subdivision(g.subdivision_id)));
create policy "editors can write topics" on public.publication_topics for all to authenticated using (exists (select 1 from public.publication_slots ps join public.social_groups g on g.id = ps.group_id where ps.id = slot_id and (public.current_user_role() = 'administrator' or (public.current_user_role() = 'subdivision_editor' and public.can_access_subdivision(g.subdivision_id))))) with check (exists (select 1 from public.publication_slots ps join public.social_groups g on g.id = ps.group_id where ps.id = slot_id and (public.current_user_role() = 'administrator' or (public.current_user_role() = 'subdivision_editor' and public.can_access_subdivision(g.subdivision_id)))));
create policy "administrators can read audit" on public.audit_events for select to authenticated using (public.current_user_role() = 'administrator');

grant select on public.managements, public.subdivisions, public.bushes, public.employees, public.social_groups, public.publication_slots, public.publication_topics, public.publication_analytics to authenticated;
grant insert, update on public.social_groups to authenticated;
grant select, insert, update, delete on public.publication_slots, public.publication_topics to authenticated;
grant execute on function public.replace_publication_topics(uuid, date, public.publication_topic[], timestamptz) to authenticated;
