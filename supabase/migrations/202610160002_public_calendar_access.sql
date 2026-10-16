-- The calendar is intentionally public: anyone with the application URL may read
-- and edit its groups and publication entries without a Supabase Auth session.

grant usage on schema public to anon;

grant select on
  public.managements,
  public.subdivisions,
  public.bushes,
  public.employees,
  public.social_groups,
  public.publication_slots,
  public.publication_topics,
  public.publication_analytics
to anon;

grant insert, update on public.social_groups to anon;
grant select, insert, update, delete on public.publication_slots, public.publication_topics to anon;
grant execute on function public.replace_publication_topics(uuid, date, public.publication_topic[], timestamptz) to anon;

create policy "public can read managements"
on public.managements for select to anon using (true);

create policy "public can read subdivisions"
on public.subdivisions for select to anon using (true);

create policy "public can read bushes"
on public.bushes for select to anon using (true);

create policy "public can read active employees"
on public.employees for select to anon using (active);

create policy "public can read groups"
on public.social_groups for select to anon using (true);

create policy "public can create groups"
on public.social_groups for insert to anon with check (true);

create policy "public can update groups"
on public.social_groups for update to anon using (true) with check (true);

create policy "public can read slots"
on public.publication_slots for select to anon using (true);

create policy "public can create slots"
on public.publication_slots for insert to anon with check (true);

create policy "public can update slots"
on public.publication_slots for update to anon using (true) with check (true);

create policy "public can delete slots"
on public.publication_slots for delete to anon using (true);

create policy "public can read topics"
on public.publication_topics for select to anon using (true);

create policy "public can create topics"
on public.publication_topics for insert to anon with check (true);

create policy "public can update topics"
on public.publication_topics for update to anon using (true) with check (true);

create policy "public can delete topics"
on public.publication_topics for delete to anon using (true);
