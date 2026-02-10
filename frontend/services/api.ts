/**
 * API Service - Client-side API wrapper for Chameleon Backend
 * 
 * Features:
 * - All CRUD operations for manifests, clients, submissions, artifacts
 * - Automatic error handling
 * - Configurable base URL via environment variable
 * - Session cookie support
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Generic fetch wrapper with error handling and auth
 */
async function apiFetch<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const isDev = import.meta.env.DEV;
  const method = options.method || 'GET';
  if (isDev) {
    console.debug('[API REQ]', method, url, {
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      body: options.body
    });
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (isDev) {
    const responseBody = await response.clone().text();
    console.debug('[API RES]', method, url, {
      status: response.status,
      ok: response.ok,
      body: responseBody
    });
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

/**
 * Manifest API
 */
export const manifestApi = {
  getAll: () => 
    apiFetch<any[]>('/manifests'),

  marketplace: (params: { q?: string; region?: string; domain?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.append('q', params.q);
    if (params.region) search.append('region', params.region);
    if (params.domain) search.append('domain', params.domain);
    const query = search.toString();
    return apiFetch<any[]>(`/manifests/marketplace${query ? `?${query}` : ''}`);
  },
  
  getById: (id: string) => 
    apiFetch<any>(`/manifests/${id}`),
  
  getByRegion: (region: string) => 
    apiFetch<any>(`/manifests/region/${encodeURIComponent(region)}`),
  
  save: (manifest: any) => 
    apiFetch<any>('/manifests', {
      method: 'POST',
      body: JSON.stringify(manifest),
    }),

  updateVisibility: (id: string, visibility: 'PUBLIC' | 'PRIVATE') =>
    apiFetch<any>(`/manifests/${id}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility }),
    }),
  
  reorder: (ids: string[]) =>
    apiFetch<any>('/manifests/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    }),

  delete: (id: string) => 
    apiFetch<any>(`/manifests/${id}`, { method: 'DELETE' }),
};

/**
 * Client API
 */
export const clientApi = {
  getAll: () => 
    apiFetch<any[]>('/clients'),
  
  getById: (id: string) => 
    apiFetch<any>(`/clients/${id}`),
  
  save: (client: any) => 
    apiFetch<any>('/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    }),
  
  update: (id: string, updates: any) => 
    apiFetch<any>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  
  delete: (id: string) => 
    apiFetch<any>(`/clients/${id}`, { method: 'DELETE' }),
};

/**
 * Submission API
 */
export const submissionApi = {
  getAll: (filters?: { subject_id?: string; manifest_id?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.subject_id) params.append('subject_id', filters.subject_id);
    if (filters?.manifest_id) params.append('manifest_id', filters.manifest_id);
    if (filters?.status) params.append('status', filters.status);
    const query = params.toString();
    return apiFetch<any[]>(`/submissions${query ? `?${query}` : ''}`);
  },
  
  getById: (id: string) => 
    apiFetch<any>(`/submissions/${id}`),
  
  save: (submission: any) => 
    apiFetch<any>('/submissions', {
      method: 'POST',
      body: JSON.stringify(submission),
    }),
  
  updateStatus: (id: string, status: 'FINALIZED' | 'PENDING' | 'FLAGGED') => 
    apiFetch<any>(`/submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

/**
 * Research Artifact API
 */
export const artifactApi = {
  getAll: () => 
    apiFetch<any[]>('/artifacts'),
  
  getById: (id: string) => 
    apiFetch<any>(`/artifacts/${id}`),
  
  search: (query: string) => 
    apiFetch<any[]>(`/artifacts/search/${encodeURIComponent(query)}`),
  
  save: (artifact: any) => 
    apiFetch<any>('/artifacts', {
      method: 'POST',
      body: JSON.stringify(artifact),
    }),
  
  delete: (id: string) => 
    apiFetch<any>(`/artifacts/${id}`, { method: 'DELETE' }),
};

/**
 * Health check
 */
export const healthCheck = () => 
  fetch(`${API_BASE.replace('/api', '')}/health`)
    .then(r => r.json())
    .catch(() => ({ status: 'offline' }));

/**
 * Auth API
 */
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    apiFetch<{ user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  me: () => 
    apiFetch<any>('/auth/me'),

  logout: () =>
    apiFetch<any>('/auth/logout', { method: 'POST' }),
  
  users: () => 
    apiFetch<any[]>('/auth/users'),
  
  updateUser: (id: string, data: any) =>
    apiFetch<any>(`/auth/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updatePreferences: (data: {
    manifest_order?: string[];
    archived_manifest_ids?: string[];
    archived_artifact_ids?: string[];
  }) =>
    apiFetch<any>('/auth/preferences', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  deleteUser: (id: string) =>
    apiFetch<any>(`/auth/users/${id}`, { method: 'DELETE' }),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
};

export default {
  manifests: manifestApi,
  clients: clientApi,
  submissions: submissionApi,
  artifacts: artifactApi,
  auth: authApi,
  healthCheck,
};
