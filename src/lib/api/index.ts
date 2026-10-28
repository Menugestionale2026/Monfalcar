import { createAppsScriptApi } from './appsScriptApi';
import { createDemoApi } from './demoApi';
import type { Api } from './types';

/** Indirizzo dell'app web Google (README, passo "Pubblica"). Senza, il sito parte in modalità demo. */
const url = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

export const api: Api = url ? createAppsScriptApi(url) : createDemoApi();

export type { Api } from './types';
