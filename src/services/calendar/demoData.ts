import type { CalendarData, CalendarEntry, Employee, SocialGroup, Topic } from '@/domain/calendar';
import { toDateKey } from '@/domain/calendar';

export const DEMO_SUBDIVISION_ID = 'subdivision-kyiv-center';

export const DEMO_EMPLOYEES: Employee[] = [
    { id: 'employee-1', fullName: 'Ковальчук Олена Сергіївна' },
    { id: 'employee-2', fullName: 'Мельник Андрій Ігорович' },
    { id: 'employee-3', fullName: 'Бондар Наталія Олександрівна' },
    { id: 'employee-4', fullName: 'Шевченко Максим Віталійович' },
    { id: 'employee-5', fullName: 'Ткаченко Ірина Миколаївна' },
];

const group = (
    id: string,
    name: string,
    url: string,
    bush: string,
    employeeIndex: number,
    position: number,
    subdivisionName = 'Київський центральний підрозділ',
    managementName = 'Центральне управління'
): SocialGroup => {
    return {
        id,
        name,
        url,
        bush,
        employeeId: DEMO_EMPLOYEES[employeeIndex].id,
        employeeName: DEMO_EMPLOYEES[employeeIndex].fullName,
        subdivisionId: DEMO_SUBDIVISION_ID,
        subdivisionName,
        managementName,
        position,
        active: true,
    };
};

export const DEMO_GROUPS: SocialGroup[] = [
    group('group-1', 'Троєщина INFO', 'https://t.me/troyeshchyna_info', 'Кущ Північ', 0, 1),
    group('group-2', 'Оболонь Live', 'https://t.me/obolon_live', 'Кущ Північ', 1, 2),
    group('group-3', 'Позняки Осокорки', 'https://t.me/poznyaky_osokorky', 'Кущ Лівий берег', 2, 3),
    group('group-4', 'Новини Печерська', 'https://t.me/pechersk_news', 'Кущ Центр', 0, 4),
    group('group-5', 'Голосіївський район', 'https://t.me/holosiiv_news', 'Кущ Південь', 3, 5),
    group('group-6', 'Виноградар сьогодні', 'https://t.me/vynohradar_today', 'Кущ Захід', 4, 6),
];

const demoEntry = (groupId: string, day: number, topics: Topic[], employeeIndex: number): CalendarEntry => {
    return {
        groupId,
        date: toDateKey(2026, 10, day),
        topics,
        employeeId: DEMO_EMPLOYEES[employeeIndex].id,
        employeeName: DEMO_EMPLOYEES[employeeIndex].fullName,
        updatedAt: new Date(2026, 9, day, 10, 0).toISOString(),
    };
};

export const createDemoData = (): CalendarData => {
    return {
        employees: DEMO_EMPLOYEES,
        bushes: ['Кущ Північ', 'Кущ Лівий берег', 'Кущ Центр', 'Кущ Південь', 'Кущ Захід'],
        groups: DEMO_GROUPS,
        entries: [
            demoEntry('group-1', 2, ['Інформаційний пост'], 0),
            demoEntry('group-1', 7, ['Акції'], 0),
            demoEntry('group-1', 11, ['Технічні питання', 'Нагадування про оплату'], 0),
            demoEntry('group-2', 1, ['Аварія'], 1),
            demoEntry('group-2', 5, ['Інформаційний пост'], 1),
            demoEntry('group-2', 9, ['Акції', 'Розважальний пост'], 1),
            demoEntry('group-3', 3, ['Технічні питання'], 2),
            demoEntry('group-3', 10, ['Нагадування про оплату'], 2),
            demoEntry('group-4', 4, ['Інформаційний пост'], 0),
            demoEntry('group-4', 8, ['Акції'], 0),
            demoEntry('group-5', 6, ['Розважальний пост'], 3),
            demoEntry('group-6', 2, ['Аварія'], 4),
        ],
    };
};
