import { readFile } from 'node:fs/promises';

const [, , sourcePath] = process.argv;
const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!sourcePath || !supabaseUrl || !secretKey) {
    throw new Error('Usage: SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/import-employees.mjs <json-path>');
}

const source = JSON.parse(await readFile(sourcePath, 'utf8'));
if (!Array.isArray(source) || source.length === 0) throw new Error('Employee source must be a non-empty JSON array.');

const normalizeName = (value) => {
    return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('uk-UA');
};

const parseDate = (value) => {
    if (!value) return null;
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(value)) throw new Error(`Unexpected Date_finish format: ${value}`);
    return value.replaceAll('.', '-');
};

const employees = source.map((row) => {
    const externalId = String(row.tab_num ?? '').trim();
    const fullName = String(row.fio ?? '')
        .trim()
        .replace(/\s+/g, ' ');
    if (!externalId || !fullName) throw new Error('Every employee must contain tab_num and fio.');
    return {
        external_id: externalId,
        full_name: fullName,
        normalized_full_name: normalizeName(fullName),
        employment_end_date: parseDate(String(row.Date_finish ?? '').trim()),
    };
});

const response = await fetch(`${supabaseUrl}/functions/v1/directory-sync/employees`, {
    method: 'POST',
    headers: {
        apikey: secretKey,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ employees }),
});
const result = await response.json();
if (!response.ok) throw new Error(result.message ?? `Employee import failed with HTTP ${response.status}.`);

process.stdout.write(`${JSON.stringify(result)}\n`);
