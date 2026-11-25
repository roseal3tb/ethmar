import { mockApi } from "./mock-api";
import { supabaseApi } from "./supabase-api";
import type { PortalApi } from "./types";

/** Offline preview data (no Supabase): VITE_PORTAL_MOCK=1, or ?mock in tests. */
export const usingMock =
  import.meta.env["VITE_PORTAL_MOCK"] === "1" || import.meta.env.MODE === "test";
export const api: PortalApi = usingMock ? mockApi : supabaseApi;
