drop policy if exists "public can read active employees" on public.employees;

create policy "public can read active or assigned employees"
on public.employees for select to anon
using (
  active
  or exists (
    select 1
    from public.social_groups
    where social_groups.current_employee_id = employees.id
      and social_groups.active
  )
);
