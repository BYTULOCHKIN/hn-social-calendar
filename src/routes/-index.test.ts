import { describe, expect, it } from 'vitest';
import { validateCalendarSearch } from './index';

describe('calendar URL search', () => {
    it('restores valid workspace and calendar state', () => {
        expect(
            validateCalendarSearch({
                management: 'management-1',
                subdivision: 'subdivision-2',
                view: 'analytics',
                year: '2028',
                month: '7',
            })
        ).toEqual({
            management: 'management-1',
            subdivision: 'subdivision-2',
            view: 'analytics',
            year: 2028,
            month: 7,
        });
    });

    it('drops invalid period and view values', () => {
        expect(validateCalendarSearch({ view: 'settings', year: '2040', month: '13' })).toEqual({
            management: undefined,
            subdivision: undefined,
            view: undefined,
            year: undefined,
            month: undefined,
        });
    });
});
