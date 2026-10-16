import type { CalendarData, SocialGroup, Topic } from '@/domain/calendar';
import { createClient } from '@supabase/supabase-js';
import { demoStore } from './store';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const useRemote = Boolean(supabaseUrl && publishableKey && import.meta.env.VITE_DATA_MODE !== 'demo');
const supabase = useRemote ? createClient(supabaseUrl, publishableKey) : null;
const defaultSubdivisionId = import.meta.env.VITE_DEFAULT_SUBDIVISION_ID ?? 'subdivision-kyiv-center';

const remoteRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const session = await supabase?.auth.getSession();
    const accessToken = session?.data.session?.access_token;
    const response = await fetch(`${supabaseUrl}/functions/v1/calendar${path}`, {
        ...init,
        headers: {
            apikey: publishableKey,
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...init?.headers,
        },
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('AUTH_REQUIRED');
        const error = (await response.json().catch(() => {
            return null;
        })) as { message?: string } | null;
        throw new Error(error?.message ?? 'Не вдалося виконати запит до Supabase.');
    }
    return response.json() as Promise<T>;
};

export const calendarApi = {
    mode: useRemote ? ('supabase' as const) : ('demo' as const),
    defaultSubdivisionId,
    async signIn(email: string, password: string) {
        if (!supabase) return;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error('Не вдалося увійти. Перевірте email і пароль.');
    },
    async getCalendar(subdivisionId: string, year: number, month: number) {
        if (!useRemote) return demoStore.get();
        const query = new URLSearchParams({ subdivisionId, year: String(year), month: String(month) });
        return await remoteRequest<CalendarData>(`?${query.toString()}`);
    },
    async setTopics(groupId: string, date: string, topics: Topic[], subdivisionId: string, updatedAt?: string) {
        if (!useRemote) return demoStore.setTopics(groupId, date, topics);
        await remoteRequest<{ ok: true }>(`/groups/${groupId}/calendar/${date}`, {
            method: 'PUT',
            body: JSON.stringify({ topics, updatedAt }),
        });
        const [year, month] = date.split('-').map(Number);
        return calendarApi.getCalendar(subdivisionId, year, month);
    },
    async saveGroup(group: SocialGroup, year: number, month: number) {
        if (!useRemote) return demoStore.saveGroup(group);
        await remoteRequest<{ ok: true; id: string }>(`/groups/${group.id}`, {
            method: group.id.startsWith('new-') ? 'POST' : 'PUT',
            body: JSON.stringify(group),
        });
        return calendarApi.getCalendar(group.subdivisionId, year, month);
    },
    async resetDemo() {
        return await Promise.resolve(demoStore.reset());
    },
};
