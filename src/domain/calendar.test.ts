import { describe, expect, it } from 'vitest';
import { createDemoData } from '@/services/calendar/demoData';
import { calculateAnalytics, getDaysInMonth, validateTopics } from './calendar';

describe('calendar rules', () => {
    it.each([
        [2026, 2, 28],
        [2028, 2, 29],
        [2026, 4, 30],
        [2026, 10, 31],
    ])('returns correct days for %i-%i', (year, month, expected) => {
        expect(getDaysInMonth(year, month)).toBe(expected);
    });

    it('accepts zero, one or two unique topics', () => {
        expect(validateTopics([])).toEqual([]);
        expect(validateTopics(['Акції'])).toEqual(['Акції']);
        expect(validateTopics(['Акції', 'Аварія'])).toEqual(['Акції', 'Аварія']);
    });

    it('rejects duplicates and a third topic', () => {
        expect(() => {
            return validateTopics(['Акції', 'Акції']);
        }).toThrow('не можуть повторюватися');
        expect(() => {
            return validateTopics(['Акції', 'Аварія', 'Інформаційний пост']);
        }).toThrow('максимум дві');
    });
});

describe('publication analytics', () => {
    it('counts every topic as a separate publication', () => {
        const analytics = calculateAnalytics(createDemoData(), 2026, 10);
        expect(analytics.filledDays).toBe(12);
        expect(analytics.total).toBe(14);
        expect(
            analytics.topics.find((row) => {
                return row.label === 'Акції';
            })?.value
        ).toBe(3);
    });

    it('preserves the canonical four-publication example', () => {
        const data = createDemoData();
        data.groups = data.groups.filter((group) => {
            return group.id === 'group-1';
        });
        const analytics = calculateAnalytics(data, 2026, 10);
        expect(analytics.filledDays).toBe(3);
        expect(analytics.total).toBe(4);
    });
});
