import { withSupabase } from 'npm:@supabase/server@1';

type StructureRow = {
    region_id: string | number;
    region_name: string;
    sundivision_id: string | number;
    subdivision_name: string;
    kust_id: string | number;
    kust_name: string;
    city_id: string | number;
    city_name: string;
};

type StructureResponse = {
    Result: string;
    Data: StructureRow[];
};

type EmployeeRow = {
    external_id: string;
    full_name: string;
    normalized_full_name: string;
    employment_end_date: string | null;
};

const json = (body: unknown, status = 200) => Response.json(body, { status });

const handler = withSupabase({ auth: 'secret' }, async (request, context) => {
    if (request.method !== 'POST') return json({ message: 'Метод не підтримується.' }, 405);

    const path = new URL(request.url).pathname.replace(/^.*\/directory-sync/, '');

    if (path === '/structure') {
        const endpoint = Deno.env.get('COMPANY_STRUCTURE_API_URL');
        const accessKey = Deno.env.get('COMPANY_STRUCTURE_API_KEY');
        if (!endpoint || !accessKey) return json({ message: 'Структурний API не налаштований.' }, 500);

        const apiUrl = new URL(endpoint);
        apiUrl.searchParams.set('action', 'structure');
        apiUrl.searchParams.set('proxy_access_key', accessKey);

        const response = await fetch(apiUrl, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) return json({ message: `Структурний API повернув HTTP ${response.status}.` }, 502);

        const payload = (await response.json()) as StructureResponse;
        if (payload.Result !== 'OK' || !Array.isArray(payload.Data) || payload.Data.length === 0)
            return json({ message: 'Структурний API повернув некоректну відповідь.' }, 502);

        const rows = payload.Data.map((row) => ({
            management_external_id: String(row.region_id),
            management_name: row.region_name,
            subdivision_external_id: String(row.sundivision_id),
            subdivision_name: row.subdivision_name,
            bush_external_id: String(row.kust_id),
            bush_name: row.kust_name,
            city_external_id: String(row.city_id),
            city_name: row.city_name,
        }));
        const { data, error } = await context.supabaseAdmin.rpc('sync_organization_structure', { p_rows: rows });
        if (error) return json({ message: error.message }, 500);
        return json({ ok: true, sourceRows: rows.length, ...data });
    }

    if (path === '/employees') {
        const body = (await request.json()) as { employees?: EmployeeRow[] };
        if (!Array.isArray(body.employees) || body.employees.length === 0)
            return json({ message: 'Список працівників порожній.' }, 400);
        const { data, error } = await context.supabaseAdmin.rpc('sync_employees', { p_rows: body.employees });
        if (error) return json({ message: error.message }, 500);
        return json({ ok: true, ...data });
    }

    return json({ message: 'Маршрут не знайдено.' }, 404);
});

Deno.serve(handler);
