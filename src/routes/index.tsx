import { YEARS } from '@/domain/calendar';
import { createFileRoute } from '@tanstack/react-router';

export type CalendarSearch = {
    management?: string;
    subdivision?: string;
    view?: 'calendar' | 'analytics';
    year?: number;
    month?: number;
};

const parseNumber = (value: unknown) => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string' || value.trim() === '') return undefined;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : undefined;
};

export const validateCalendarSearch = (search: Record<string, unknown>): CalendarSearch => {
    const year = parseNumber(search.year);
    const month = parseNumber(search.month);
    let view: CalendarSearch['view'];
    if (search.view === 'calendar' || search.view === 'analytics') view = search.view;

    return {
        management: typeof search.management === 'string' ? search.management : undefined,
        subdivision: typeof search.subdivision === 'string' ? search.subdivision : undefined,
        view,
        year: year && YEARS.includes(year) ? year : undefined,
        month: month && month >= 1 && month <= 12 ? month : undefined,
    };
};

export const Route = createFileRoute('/')({
    validateSearch: validateCalendarSearch,
});
