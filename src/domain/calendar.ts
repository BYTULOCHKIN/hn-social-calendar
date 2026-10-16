export const TOPICS = [
    'Технічні питання',
    'Акції',
    'Нагадування про оплату',
    'Інформаційний пост',
    'Розважальний пост',
    'Аварія',
] as const;

export type Topic = (typeof TOPICS)[number];

export type Employee = {
    id: string;
    fullName: string;
};

export type WorkspaceSubdivision = {
    id: string;
    name: string;
    managementId: string;
    managementName: string;
};

export type SocialGroup = {
    id: string;
    name: string;
    url: string;
    bush: string;
    employeeId: string;
    employeeName: string;
    subdivisionId: string;
    subdivisionName: string;
    managementName: string;
    position: number;
    active: boolean;
};

export type CalendarEntry = {
    groupId: string;
    date: string;
    topics: Topic[];
    employeeId: string;
    employeeName: string;
    updatedAt: string;
};

export type CalendarData = {
    groups: SocialGroup[];
    entries: CalendarEntry[];
    employees: Employee[];
    bushes: string[];
    subdivisions: WorkspaceSubdivision[];
};

export type AnalyticsRow = { label: string; value: number; color?: string };

export type Analytics = {
    total: number;
    activeGroups: number;
    filledDays: number;
    topics: AnalyticsRow[];
    employees: AnalyticsRow[];
    subdivisions: AnalyticsRow[];
    months: AnalyticsRow[];
};

export const TOPIC_META: Record<Topic, { short: string; color: string; soft: string }> = {
    'Технічні питання': { short: 'Тех', color: '#5b5bd6', soft: '#eeeeff' },
    Акції: { short: 'Акц', color: '#d94670', soft: '#fff0f4' },
    'Нагадування про оплату': { short: 'Опл', color: '#d97706', soft: '#fff6e5' },
    'Інформаційний пост': { short: 'Інф', color: '#0f8a75', soft: '#e7f8f4' },
    'Розважальний пост': { short: 'Роз', color: '#7c3aed', soft: '#f3edff' },
    Аварія: { short: 'Авр', color: '#dc2626', soft: '#fff0f0' },
};

export const YEARS = Array.from({ length: 10 }, (_, index) => {
    return index + 2026;
});

export const MONTHS = [
    'Січень',
    'Лютий',
    'Березень',
    'Квітень',
    'Травень',
    'Червень',
    'Липень',
    'Серпень',
    'Вересень',
    'Жовтень',
    'Листопад',
    'Грудень',
] as const;

export const getDaysInMonth = (year: number, month: number) => {
    if (!YEARS.includes(year) || month < 1 || month > 12) {
        throw new Error('Період має бути в діапазоні 2026–2035 років.');
    }
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

export const toDateKey = (year: number, month: number, day: number) => {
    const monthText = String(month).padStart(2, '0');
    const dayText = String(day).padStart(2, '0');
    return `${year}-${monthText}-${dayText}`;
};

export const isWeekend = (year: number, month: number, day: number) => {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return weekday === 0 || weekday === 6;
};

export const weekdayShort = (year: number, month: number, day: number) => {
    return new Intl.DateTimeFormat('uk-UA', { weekday: 'short', timeZone: 'UTC' })
        .format(new Date(Date.UTC(year, month - 1, day)))
        .replace('.', '');
};

export const validateTopics = (topics: Topic[]) => {
    const unique = [...new Set(topics)];
    if (unique.length !== topics.length) throw new Error('Тематики в одному дні не можуть повторюватися.');
    if (topics.length > 2) throw new Error('Для одного дня можна вибрати максимум дві тематики.');
    return unique;
};

export const calculateAnalytics = (
    data: CalendarData,
    year: number,
    month?: number,
    management?: string
): Analytics => {
    const visibleGroups = data.groups.filter((group) => {
        return !management || group.managementName === management;
    });
    const groupIds = new Set(
        visibleGroups.map((group) => {
            return group.id;
        })
    );
    const entries = data.entries.filter((entry) => {
        const entryDate = new Date(`${entry.date}T00:00:00Z`);
        return (
            groupIds.has(entry.groupId) &&
            entryDate.getUTCFullYear() === year &&
            (!month || entryDate.getUTCMonth() + 1 === month)
        );
    });
    const topicCounts = new Map<string, number>();
    const employeeCounts = new Map<string, number>();
    const subdivisionCounts = new Map<string, number>();
    const monthCounts = new Map<number, number>();
    const groupMap = new Map(
        data.groups.map((group) => {
            return [group.id, group];
        })
    );

    entries.forEach((entry) => {
        const count = entry.topics.length;
        employeeCounts.set(entry.employeeName, (employeeCounts.get(entry.employeeName) ?? 0) + count);
        const subdivision = groupMap.get(entry.groupId)?.subdivisionName ?? 'Без підрозділу';
        subdivisionCounts.set(subdivision, (subdivisionCounts.get(subdivision) ?? 0) + count);
        const entryMonth = new Date(`${entry.date}T00:00:00Z`).getUTCMonth() + 1;
        monthCounts.set(entryMonth, (monthCounts.get(entryMonth) ?? 0) + count);
        entry.topics.forEach((topic) => {
            return topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
        });
    });

    const sortRows = (counts: Map<string, number>) => {
        return [...counts]
            .map(([label, value]) => {
                return { label, value };
            })
            .sort((a, b) => {
                return b.value - a.value;
            });
    };

    return {
        total: entries.reduce((sum, entry) => {
            return sum + entry.topics.length;
        }, 0),
        activeGroups: visibleGroups.filter((group) => {
            return group.active;
        }).length,
        filledDays: entries.length,
        topics: TOPICS.map((topic) => {
            return {
                label: topic,
                value: topicCounts.get(topic) ?? 0,
                color: TOPIC_META[topic].color,
            };
        }),
        employees: sortRows(employeeCounts),
        subdivisions: sortRows(subdivisionCounts),
        months: MONTHS.map((label, index) => {
            return { label, value: monthCounts.get(index + 1) ?? 0 };
        }),
    };
};
