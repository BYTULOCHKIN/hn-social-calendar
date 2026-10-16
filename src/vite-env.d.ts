/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
    readonly VITE_DATA_MODE?: 'demo' | 'supabase';
    readonly VITE_DEFAULT_SUBDIVISION_ID?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
