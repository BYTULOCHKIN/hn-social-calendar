import { describe, expect, it } from 'vitest';
import { normalizeFunctionPath } from './function-path';

describe('Supabase function path normalization', () => {
    it('keeps nested calendar route segments after the function prefix', () => {
        expect(
            normalizeFunctionPath(
                '/functions/v1/calendar/groups/bffbaf8b-5cdc-44b8-b26d-68094ce898d7/calendar/2026-10-02',
                'calendar'
            )
        ).toBe('/groups/bffbaf8b-5cdc-44b8-b26d-68094ce898d7/calendar/2026-10-02');
    });

    it('supports direct function paths and the function root', () => {
        expect(normalizeFunctionPath('/calendar/groups/group-id', 'calendar')).toBe('/groups/group-id');
        expect(normalizeFunctionPath('/functions/v1/calendar', 'calendar')).toBe('');
        expect(normalizeFunctionPath('/calendar', 'calendar')).toBe('');
    });

    it('leaves an already normalized route unchanged', () => {
        expect(normalizeFunctionPath('/groups/group-id/calendar/2026-10-02', 'calendar')).toBe(
            '/groups/group-id/calendar/2026-10-02'
        );
    });
});
