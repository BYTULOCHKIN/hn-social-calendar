import { z } from 'zod';

export type EnvSchema = z.infer<typeof envSchema>;
export const envSchema = z.object({
    VITE_API_URL: z.string().optional().default(''),
    VITE_SUPABASE_URL: z.url().optional(),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
    VITE_DATA_MODE: z.enum(['demo', 'supabase']).optional(),
    VITE_DEFAULT_SUBDIVISION_ID: z.uuid().optional(),
});
