export function authHeaders(): Record<string, string> {
  try {
    const a = JSON.parse(localStorage.getItem('chat_auth') || '{}');
    if (a.login && a.password) {
      return { 'X-User-Id': a.login, 'X-Auth-Token': a.password };
    }
  } catch {
    return {};
  }
  return {};
}

export function apiFetch(url: string, init: RequestInit = {}) {
  return fetch(url, { ...init, headers: { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) } });
}
