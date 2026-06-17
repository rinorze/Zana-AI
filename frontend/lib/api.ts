/**
 * Typed REST client for the ZANA backend.
 *
 * Token storage is intentionally simple (localStorage). Replace with httpOnly
 * cookies before any production deployment.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export interface ServiceListItem {
  id: number;
  service_id: string;
  category: string;
  name: string;
  description: string;
  fee: string;
  duration: string;
  office: string;
}

export interface ServicesPage {
  items: ServiceListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ServiceStep {
  id: number;
  order: number;
  titles: Record<string, string>;
  descriptions: Record<string, string>;
  required_items: string[];
}

export interface ServiceFAQ {
  id: number;
  questions: Record<string, string>;
  answers: Record<string, string>;
}

export interface ResponseTemplate {
  id: number;
  scenario: string;
  templates: Record<string, string>;
  placeholders: string[];
}

export interface ServiceDetail {
  id: number;
  service_id: string;
  category: string;
  names: Record<string, string>;
  description: Record<string, string>;
  fee: string;
  duration: string;
  office: string;
  office_locations: Array<{ city?: string; address?: string; hours?: string }>;
  required_documents: string[];
  source_urls: string[];
  last_verified: string;
  steps: ServiceStep[];
  faqs: ServiceFAQ[];
  response_templates: ResponseTemplate[];
}

export interface SearchResult {
  query: string;
  language: string;
  services: Array<{
    id: number;
    service_id: string;
    category: string;
    name: string;
    description: string;
    fee: string;
    duration: string;
  }>;
  faqs: Array<{ service_id: string; question: string; answer: string }>;
  chat_starter: string;
  semantic_chunks: Array<{ id: string; text: string; service_id: string; language: string; distance: number }>;
}

export interface AnalyticsSummary {
  total_queries: number;
  no_match_count: number;
  no_match_rate: number;
  by_role: Record<string, number>;
  by_language: Record<string, number>;
  top_queries: Array<{ query: string; count: number }>;
  top_no_match: Array<{ query: string; count: number }>;
}

const TOKEN_KEY = "zana.token";
const ROLE_KEY = "zana.role";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, role: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(ROLE_KEY, role);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
}

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ROLE_KEY);
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = { ...(extra as Record<string, string> | undefined) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function jsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

export const apiBase = API_BASE;

// -- Citizen --------------------------------------------------------------

export async function listServices(params?: {
  category?: string;
  language?: string;
  limit?: number;
  offset?: number;
}): Promise<ServicesPage> {
  const search = new URLSearchParams();
  if (params?.category) search.set("category", params.category);
  if (params?.language) search.set("language", params.language);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
  const url = `${API_BASE}/api/services${search.size ? `?${search}` : ""}`;
  return jsonOrThrow(await fetch(url));
}

export async function getService(serviceId: string): Promise<ServiceDetail> {
  return jsonOrThrow(await fetch(`${API_BASE}/api/services/${encodeURIComponent(serviceId)}`));
}

export async function searchCatalogue(q: string, language = "sq"): Promise<SearchResult> {
  const url = `${API_BASE}/api/search?q=${encodeURIComponent(q)}&language=${language}`;
  return jsonOrThrow(await fetch(url));
}

export interface CompareEntry {
  service_id: string;
  category: string;
  name: string;
  description: string;
  fee: string;
  duration: string;
  office: string;
  required_documents: string[];
  source_urls: string[];
  last_verified: string;
  step_count: number;
  faq_count: number;
}

export async function compareServices(a: string, b: string, language = "sq"): Promise<{ a: CompareEntry; b: CompareEntry }> {
  const url = `${API_BASE}/api/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}&language=${language}`;
  return jsonOrThrow(await fetch(url));
}

export async function submitFeedback(input: {
  query: string;
  answer: string;
  helpful: boolean;
  language?: string;
  service_id?: string;
}): Promise<{ ok: boolean }> {
  return jsonOrThrow(
    await fetch(`${API_BASE}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function transcribeVoice(blob: Blob, language?: string): Promise<{ text: string; language: string }> {
  const form = new FormData();
  form.append("audio", blob, "speech.webm");
  if (language) form.append("language", language);
  const response = await fetch(`${API_BASE}/api/voice/transcribe`, { method: "POST", body: form });
  return jsonOrThrow(response);
}

// -- Auth -----------------------------------------------------------------

export async function login(username: string, password: string): Promise<{ access_token: string; role: string }> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await jsonOrThrow<{ access_token: string; role: string }>(response);
  setToken(body.access_token, body.role);
  return body;
}

// -- Agent ----------------------------------------------------------------

export async function listAgentTemplates(serviceId?: string): Promise<
  Array<{ id: number; service_id: number; scenario: string; templates: Record<string, string>; placeholders: string[] }>
> {
  const url = `${API_BASE}/api/agent/templates${serviceId ? `?service_id=${encodeURIComponent(serviceId)}` : ""}`;
  return jsonOrThrow(await fetch(url, { headers: authHeaders() }));
}

export async function personalizeTemplate(input: {
  template_id?: number;
  template_text?: string;
  language?: string;
  variables: Record<string, unknown>;
}): Promise<{ text: string; language: string }> {
  const response = await fetch(`${API_BASE}/api/agent/template/personalize`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });
  return jsonOrThrow(response);
}

export async function afterCallSummary(input: {
  service?: string;
  queries: string[];
  suggestions: string[];
  notes?: string;
}): Promise<{ summary: string }> {
  const response = await fetch(`${API_BASE}/api/agent/summary`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });
  return jsonOrThrow(response);
}

export async function logSuggestionHelpful(input: {
  query: string;
  answer: string;
  suggestion_index?: number;
  helpful?: boolean;
}): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE}/api/agent/log-helpful`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });
  return jsonOrThrow(response);
}

// -- Admin ----------------------------------------------------------------

export async function adminListServices(): Promise<ServiceDetail[]> {
  return jsonOrThrow(await fetch(`${API_BASE}/api/admin/services`, { headers: authHeaders() }));
}

export async function adminUpsertService(payload: Partial<ServiceDetail> & { service_id: string }): Promise<ServiceDetail> {
  const response = await fetch(`${API_BASE}/api/admin/services`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(response);
}

export async function adminDeleteService(serviceId: string): Promise<{ ok: boolean }> {
  return jsonOrThrow(
    await fetch(`${API_BASE}/api/admin/services/${encodeURIComponent(serviceId)}`, {
      method: "DELETE",
      headers: authHeaders(),
    }),
  );
}

export async function adminReindexService(serviceId: string): Promise<{ chunks_indexed: number }> {
  return jsonOrThrow(
    await fetch(`${API_BASE}/api/admin/services/${encodeURIComponent(serviceId)}/reindex`, {
      method: "POST",
      headers: authHeaders(),
    }),
  );
}

export async function adminReindexAll(): Promise<{ queued: number }> {
  return jsonOrThrow(
    await fetch(`${API_BASE}/api/admin/reindex-all`, { method: "POST", headers: authHeaders() }),
  );
}

export async function adminListTemplates(): Promise<
  Array<{ id: number; service_id: number; scenario: string; templates: Record<string, string>; placeholders: string[] }>
> {
  return jsonOrThrow(await fetch(`${API_BASE}/api/admin/templates`, { headers: authHeaders() }));
}

export async function adminUpsertTemplate(payload: {
  service_service_id: string;
  scenario: string;
  templates: Record<string, string>;
  placeholders: string[];
}) {
  return jsonOrThrow(
    await fetch(`${API_BASE}/api/admin/templates`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    }),
  );
}

export async function adminDeleteTemplate(id: number): Promise<{ ok: boolean }> {
  return jsonOrThrow(
    await fetch(`${API_BASE}/api/admin/templates/${id}`, { method: "DELETE", headers: authHeaders() }),
  );
}

export async function adminListDocuments() {
  return jsonOrThrow<Array<{ id: number; filename: string; file_type: string; uploaded_at: string | null; indexed: boolean; chunk_count: number }>>(
    await fetch(`${API_BASE}/api/admin/documents`, { headers: authHeaders() }),
  );
}

export async function adminUploadDocument(file: File) {
  const form = new FormData();
  form.append("file", file, file.name);
  return jsonOrThrow(
    await fetch(`${API_BASE}/api/admin/documents`, { method: "POST", headers: authHeaders(), body: form }),
  );
}

export async function adminDeleteDocument(id: number) {
  return jsonOrThrow(
    await fetch(`${API_BASE}/api/admin/documents/${id}`, { method: "DELETE", headers: authHeaders() }),
  );
}

export async function adminListSources() {
  return jsonOrThrow<Array<{ id: number; url: string; title: string; last_indexed: string | null; chunk_count: number; status: string }>>(
    await fetch(`${API_BASE}/api/admin/sources`, { headers: authHeaders() }),
  );
}

export async function adminAddSource(url: string, title = "") {
  return jsonOrThrow(
    await fetch(`${API_BASE}/api/admin/sources`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ url, title }),
    }),
  );
}

export async function adminReindexSource(id: number) {
  return jsonOrThrow(
    await fetch(`${API_BASE}/api/admin/sources/${id}/reindex`, { method: "POST", headers: authHeaders() }),
  );
}

export async function adminDeleteSource(id: number) {
  return jsonOrThrow(
    await fetch(`${API_BASE}/api/admin/sources/${id}`, { method: "DELETE", headers: authHeaders() }),
  );
}

export async function adminAnalytics(): Promise<AnalyticsSummary> {
  return jsonOrThrow(await fetch(`${API_BASE}/api/admin/analytics`, { headers: authHeaders() }));
}
