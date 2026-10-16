import type { CalendarData, SocialGroup, Topic } from '@/domain/calendar';
import { validateTopics } from '@/domain/calendar';
import { createDemoData } from './demoData';

const STORAGE_KEY = 'publication-calendar-demo-v1';

const loadData = (): CalendarData => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createDemoData();
    try {
        return JSON.parse(saved) as CalendarData;
    } catch {
        return createDemoData();
    }
};

const persist = (data: CalendarData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('calendar-data-changed'));
};

export const demoStore = {
    get: loadData,
    reset() {
        const data = createDemoData();
        persist(data);
        return data;
    },
    setTopics(groupId: string, date: string, topics: Topic[]) {
        const checkedTopics = validateTopics(topics);
        const data = loadData();
        const group = data.groups.find((candidate) => {
            return candidate.id === groupId;
        });
        if (!group) throw new Error('Групу не знайдено.');
        const entryIndex = data.entries.findIndex((entry) => {
            return entry.groupId === groupId && entry.date === date;
        });
        if (checkedTopics.length === 0) {
            if (entryIndex >= 0) data.entries.splice(entryIndex, 1);
        } else {
            const entry = {
                groupId,
                date,
                topics: checkedTopics,
                employeeId: group.employeeId,
                employeeName: group.employeeName,
                updatedAt: new Date().toISOString(),
            };
            if (entryIndex >= 0) data.entries[entryIndex] = entry;
            else data.entries.push(entry);
        }
        persist(data);
        return data;
    },
    saveGroup(group: SocialGroup) {
        const data = loadData();
        const activeCount = data.groups.filter((candidate) => {
            return candidate.active && candidate.id !== group.id;
        }).length;
        if (group.active && activeCount >= 20) throw new Error('У підрозділі вже є 20 активних груп.');
        const index = data.groups.findIndex((candidate) => {
            return candidate.id === group.id;
        });
        if (index >= 0) data.groups[index] = group;
        else data.groups.push(group);
        persist(data);
        return data;
    },
};
