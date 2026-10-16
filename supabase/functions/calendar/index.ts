import { withSupabase } from 'npm:@supabase/server@1';

type Topic =
    | 'Технічні питання'
    | 'Акції'
    | 'Нагадування про оплату'
    | 'Інформаційний пост'
    | 'Розважальний пост'
    | 'Аварія';

const json = (body: unknown, status = 200) => Response.json(body, { status });

const handler = withSupabase({ auth: 'publishable' }, async (request, context) => {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*\/calendar/, '');

    if (request.method === 'GET' && path === '') {
        const subdivisionId = url.searchParams.get('subdivisionId');
        const year = Number(url.searchParams.get('year'));
        const month = Number(url.searchParams.get('month'));
        if (!subdivisionId || year < 2026 || year > 2035 || month < 1 || month > 12) {
            return json({ message: 'Некоректний підрозділ або період.' }, 400);
        }
        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
        const [
            { data: groups, error: groupsError },
            { data: employees, error: employeesError },
            { data: bushes, error: bushesError },
        ] = await Promise.all([
            context.supabase
                .from('social_groups')
                .select(
                    'id,name,url,position,active,subdivision:subdivisions!inner(id,name,management:managements(name)),bush:bushes(name),employee:employees!current_employee_id(id,full_name),slots:publication_slots(id,publication_date,updated_at,topics:publication_topics(topic,employee_id_snapshot,employee_name_snapshot))'
                )
                .eq('subdivision_id', subdivisionId)
                .gte('slots.publication_date', start)
                .lte('slots.publication_date', end)
                .order('position'),
            context.supabase.from('employees').select('id,full_name').eq('active', true).order('full_name'),
            context.supabase
                .from('bushes')
                .select('name')
                .eq('subdivision_id', subdivisionId)
                .eq('active', true)
                .order('name'),
        ]);
        if (groupsError || employeesError || bushesError)
            return json({ message: groupsError?.message ?? employeesError?.message ?? bushesError?.message }, 500);

        const normalizedGroups = (groups ?? []).map((group: any) => ({
            id: group.id,
            name: group.name,
            url: group.url,
            bush: group.bush.name,
            employeeId: group.employee.id,
            employeeName: group.employee.full_name,
            subdivisionId: group.subdivision.id,
            subdivisionName: group.subdivision.name,
            managementName: group.subdivision.management.name,
            position: group.position,
            active: group.active,
        }));
        const entries = (groups ?? []).flatMap((group: any) =>
            (group.slots ?? [])
                .filter((slot: any) => slot.topics.length > 0)
                .map((slot: any) => ({
                    groupId: group.id,
                    date: slot.publication_date,
                    topics: slot.topics.map((topic: any) => topic.topic),
                    employeeId: slot.topics[0].employee_id_snapshot,
                    employeeName: slot.topics[0].employee_name_snapshot,
                    updatedAt: slot.updated_at,
                }))
        );
        return json({
            groups: normalizedGroups,
            entries,
            employees: (employees ?? []).map((employee: any) => ({ id: employee.id, fullName: employee.full_name })),
            bushes: (bushes ?? []).map((bush: any) => bush.name),
        });
    }

    const calendarMatch = path.match(/^\/groups\/([0-9a-f-]+)\/calendar\/(\d{4}-\d{2}-\d{2})$/);
    if (request.method === 'PUT' && calendarMatch) {
        const body = (await request.json()) as { topics: Topic[]; updatedAt?: string };
        if (!Array.isArray(body.topics) || body.topics.length > 2 || new Set(body.topics).size !== body.topics.length) {
            return json({ message: 'Можна вибрати до двох різних тематик.' }, 400);
        }
        const { error } = await context.supabase.rpc('replace_publication_topics', {
            p_group_id: calendarMatch[1],
            p_publication_date: calendarMatch[2],
            p_topics: body.topics,
            p_expected_updated_at: body.updatedAt ?? null,
        });
        if (error) return json({ message: error.message }, error.code === '40001' ? 409 : 400);
        return json({ ok: true });
    }

    const groupMatch = path.match(/^\/groups\/([^/]+)$/);
    if ((request.method === 'POST' || request.method === 'PUT') && groupMatch) {
        const body = (await request.json()) as {
            id: string;
            name: string;
            url: string;
            bush: string;
            employeeId: string;
            subdivisionId: string;
            position: number;
            active: boolean;
        };
        const { data: bush, error: bushError } = await context.supabase
            .from('bushes')
            .select('id')
            .eq('subdivision_id', body.subdivisionId)
            .eq('name', body.bush)
            .single();
        if (bushError || !bush) return json({ message: 'Кущ не знайдено.' }, 400);
        const values = {
            subdivision_id: body.subdivisionId,
            bush_id: bush.id,
            name: body.name,
            url: body.url,
            current_employee_id: body.employeeId,
            position: body.position,
            active: body.active,
        };
        if (request.method === 'POST') {
            const { data, error } = await context.supabase.from('social_groups').insert(values).select('id').single();
            if (error) return json({ message: error.message }, 400);
            return json({ ok: true, id: data.id });
        }
        const { error } = await context.supabase.from('social_groups').update(values).eq('id', groupMatch[1]);
        if (error) return json({ message: error.message }, 400);
        return json({ ok: true, id: groupMatch[1] });
    }

    return json({ message: 'Маршрут не знайдено.' }, 404);
});

Deno.serve(handler);
