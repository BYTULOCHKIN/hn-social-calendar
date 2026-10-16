create table public.cities (
  id uuid primary key default gen_random_uuid(),
  bush_id uuid not null references public.bushes(id),
  external_id text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bush_id, name)
);

create index cities_bush_idx on public.cities(bush_id, active, name);
create trigger cities_updated_at before update on public.cities
for each row execute function public.touch_updated_at();

alter table public.cities enable row level security;
grant select on public.cities to anon, authenticated;

create policy "public can read active cities"
on public.cities for select to anon using (active);

create policy "authenticated can read active cities"
on public.cities for select to authenticated using (active);

create or replace function public.sync_organization_structure(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row_count integer;
  v_management_count integer;
  v_subdivision_count integer;
  v_bush_count integer;
  v_city_count integer;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Structure payload must be a JSON array' using errcode = '22023';
  end if;

  create temporary table structure_sync_rows (
    management_external_id text not null,
    management_name text not null,
    subdivision_external_id text not null,
    subdivision_name text not null,
    bush_external_id text not null,
    bush_name text not null,
    city_external_id text primary key,
    city_name text not null
  ) on commit drop;

  insert into structure_sync_rows
  select
    trim(row.management_external_id),
    trim(row.management_name),
    trim(row.subdivision_external_id),
    trim(row.subdivision_name),
    trim(row.bush_external_id),
    trim(row.bush_name),
    trim(row.city_external_id),
    trim(row.city_name)
  from jsonb_to_recordset(p_rows) as row(
    management_external_id text,
    management_name text,
    subdivision_external_id text,
    subdivision_name text,
    bush_external_id text,
    bush_name text,
    city_external_id text,
    city_name text
  );

  select count(*) into v_row_count from structure_sync_rows;
  if v_row_count = 0 then
    raise exception 'Structure payload must not be empty' using errcode = '22023';
  end if;

  insert into public.managements(external_id, name, active)
  select distinct management_external_id, management_name, true
  from structure_sync_rows
  on conflict (external_id) do update
  set name = excluded.name, active = true;

  insert into public.subdivisions(management_id, external_id, name, active)
  select distinct management.id, row.subdivision_external_id, row.subdivision_name, true
  from structure_sync_rows row
  join public.managements management on management.external_id = row.management_external_id
  on conflict (external_id) do update
  set management_id = excluded.management_id, name = excluded.name, active = true;

  insert into public.bushes(subdivision_id, external_id, name, active)
  select distinct subdivision.id, row.bush_external_id, row.bush_name, true
  from structure_sync_rows row
  join public.subdivisions subdivision on subdivision.external_id = row.subdivision_external_id
  on conflict (external_id) do update
  set subdivision_id = excluded.subdivision_id, name = excluded.name, active = true;

  insert into public.cities(bush_id, external_id, name, active)
  select bush.id, row.city_external_id, row.city_name, true
  from structure_sync_rows row
  join public.bushes bush on bush.external_id = row.bush_external_id
  on conflict (external_id) do update
  set bush_id = excluded.bush_id, name = excluded.name, active = true;

  update public.cities item
  set active = false
  where item.external_id is not null
    and not exists (select 1 from structure_sync_rows row where row.city_external_id = item.external_id);

  update public.bushes item
  set active = false
  where item.external_id is not null
    and not exists (select 1 from structure_sync_rows row where row.bush_external_id = item.external_id);

  update public.subdivisions item
  set active = false
  where item.external_id is not null
    and not exists (select 1 from structure_sync_rows row where row.subdivision_external_id = item.external_id);

  update public.managements item
  set active = false
  where item.external_id is not null
    and not exists (select 1 from structure_sync_rows row where row.management_external_id = item.external_id);

  select count(distinct management_external_id) into v_management_count from structure_sync_rows;
  select count(distinct subdivision_external_id) into v_subdivision_count from structure_sync_rows;
  select count(distinct bush_external_id) into v_bush_count from structure_sync_rows;
  select count(distinct city_external_id) into v_city_count from structure_sync_rows;

  return jsonb_build_object(
    'managements', v_management_count,
    'subdivisions', v_subdivision_count,
    'bushes', v_bush_count,
    'cities', v_city_count
  );
end;
$$;

create or replace function public.sync_employees(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total integer;
  v_active integer;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Employee payload must be a JSON array' using errcode = '22023';
  end if;

  create temporary table employee_sync_rows (
    external_id text primary key,
    full_name text not null,
    normalized_full_name text not null,
    employment_end_date date
  ) on commit drop;

  insert into employee_sync_rows
  select
    trim(row.external_id),
    trim(row.full_name),
    trim(row.normalized_full_name),
    row.employment_end_date
  from jsonb_to_recordset(p_rows) as row(
    external_id text,
    full_name text,
    normalized_full_name text,
    employment_end_date date
  );

  select count(*) into v_total from employee_sync_rows;
  if v_total = 0 then
    raise exception 'Employee payload must not be empty' using errcode = '22023';
  end if;

  insert into public.employees(external_id, full_name, normalized_full_name, employment_end_date)
  select external_id, full_name, normalized_full_name, employment_end_date
  from employee_sync_rows
  on conflict (external_id) do update
  set
    full_name = excluded.full_name,
    normalized_full_name = excluded.normalized_full_name,
    employment_end_date = excluded.employment_end_date;

  update public.employees employee
  set active = false
  where employee.external_id is not null
    and not exists (select 1 from employee_sync_rows row where row.external_id = employee.external_id);

  select count(*) into v_active
  from employee_sync_rows
  where employment_end_date is null or employment_end_date >= current_date;

  return jsonb_build_object('total', v_total, 'active', v_active);
end;
$$;

revoke all on function public.sync_organization_structure(jsonb) from public, anon, authenticated;
revoke all on function public.sync_employees(jsonb) from public, anon, authenticated;
grant execute on function public.sync_organization_structure(jsonb) to service_role;
grant execute on function public.sync_employees(jsonb) to service_role;
