import { apiFetch } from './authFetch';

export const AUDIT_API = 'https://functions.poehali.dev/c8fef7d8-88e0-4f29-9354-bdf1e9fa3a23';

export type AuditEventType = 'выход' | 'печать' | 'в эксель';

export function logEvent(type: AuditEventType, section: string, description: string): Promise<void> {
  return apiFetch(AUDIT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'event', type, section, description }),
    keepalive: true,
  })
    .then(() => undefined)
    .catch(() => undefined);
}

export async function logoutAndGo(url = '/') {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  await Promise.race([
    logEvent('выход', 'Вход в кабинет', `Логин : ${user.login || '—'}`),
    new Promise((r) => setTimeout(r, 1500)),
  ]);
  window.location.href = url;
}
