import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useConfirm } from '@/components/ConfirmDialog';

const CHAT_ADMIN_API = 'https://functions.poehali.dev/85242f92-5d67-4a5e-8d0d-2a14da6baa58';

interface Row {
  id: number;
  channel: string;
  sender_name: string;
  sender_role: string;
  recipient_name: string | null;
  text: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
  archived: boolean;
}

export default function ChatAdmin() {
  const confirmAction = useConfirm();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [auth, setAuth] = useState<{ l: string; p: string } | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<'active' | 'archive'>('active');
  const [channel, setChannel] = useState<'all' | 'general' | 'private'>('all');
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const call = useCallback(async (a: { l: string; p: string }, init?: RequestInit, qs = '') => {
    const res = await fetch(`${CHAT_ADMIN_API}${qs}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'X-User-Id': a.l, 'X-Auth-Token': a.p },
    });
    return { ok: res.ok, data: await res.json() };
  }, []);

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    const qs = new URLSearchParams({ view, channel, q: search, date_from: dateFrom, date_to: dateTo });
    const { ok, data } = await call(auth, undefined, `?${qs.toString()}`);
    if (ok) { setRows(data.messages || []); setSelected([]); }
    setLoading(false);
  }, [auth, view, channel, search, dateFrom, dateTo, call]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const a = { l: login.trim(), p: password.trim() };
    try {
      const { ok, data } = await call(a, { method: 'POST', body: JSON.stringify({ action: 'login' }) });
      if (ok) setAuth(a); else setError(data.error || 'Ошибка входа');
    } catch {
      setError('Ошибка соединения с сервером');
    }
  };

  const act = async (action: string, body: Record<string, unknown>, confirmText: string) => {
    if (!auth || !(await confirmAction({ title: 'Подтвердите действие', message: confirmText }))) return;
    await call(auth, { method: 'POST', body: JSON.stringify({ action, ...body }) });
    await load();
  };

  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const scope = view === 'archive' ? 'archive' : channel === 'all' ? 'active' : channel;
  const filesCount = rows.filter((r) => r.file_url).length;

  if (!auth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl font-bold text-accent mb-8 text-center">Управление чатами</h1>
        <Card className="w-full max-w-sm border-2 border-accent shadow-xl bg-card/95">
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <Input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Логин" className="bg-input text-foreground border-2 border-border" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" className="bg-input text-foreground border-2 border-border" />
              {error && <div className="text-destructive text-sm text-center">{error}</div>}
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold">Войти</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-accent">Управление чатами</h1>
          <Button variant="outline" onClick={() => setAuth(null)} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
            <Icon name="LogOut" size={16} className="mr-2" />Выход
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {(['active', 'archive'] as const).map((v) => (
            <Button key={v} onClick={() => setView(v)} variant="outline" className={`border-2 border-accent ${view === v ? 'bg-accent text-accent-foreground' : 'text-foreground'}`}>
              {v === 'active' ? 'Активные' : 'Архив'}
            </Button>
          ))}
          <span className="mx-2 text-muted-foreground">|</span>
          {([['all', 'Все'], ['general', 'Общий чат'], ['private', 'Личные']] as const).map(([v, label]) => (
            <Button key={v} onClick={() => setChannel(v)} variant="outline" className={`border-2 border-border ${channel === v ? 'bg-secondary text-foreground font-bold' : 'text-foreground'}`}>
              {label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по тексту, имени, файлу" className="max-w-xs bg-input text-foreground border-2 border-border" />
          <span className="text-sm text-muted-foreground">с</span>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 bg-input text-foreground border-2 border-border" />
          <span className="text-sm text-muted-foreground">по</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 bg-input text-foreground border-2 border-border" />
          {(search || dateFrom || dateTo) && (
            <Button variant="outline" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }} className="border-2 border-border text-foreground">Сбросить</Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {view === 'active' ? (
            <>
              <Button disabled={selected.length === 0} onClick={() => act('archive', { ids: selected }, 'Архивировать выбранные сообщения?')} className="bg-accent text-accent-foreground hover:bg-accent/90">В архив (выбранные)</Button>
              <Button onClick={() => act('archive', { scope }, 'Архивировать все сообщения в этом списке?')} variant="outline" className="border-2 border-accent text-foreground">Архивировать всё</Button>
            </>
          ) : (
            <Button disabled={selected.length === 0} onClick={() => act('unarchive', { ids: selected }, 'Вернуть выбранные из архива?')} className="bg-accent text-accent-foreground hover:bg-accent/90">Вернуть из архива</Button>
          )}
          <Button disabled={selected.length === 0} onClick={() => act('clear_files', { ids: selected }, 'Удалить вложения у выбранных сообщений?')} variant="outline" className="border-2 border-border text-foreground">Очистить вложения (выбранные)</Button>
          <Button onClick={() => act('clear_files', { scope }, 'Удалить ВСЕ вложения в этом списке?')} variant="outline" className="border-2 border-border text-foreground">Очистить все вложения ({filesCount})</Button>
          <Button disabled={selected.length === 0} onClick={() => act('delete', { ids: selected }, 'Удалить выбранные сообщения безвозвратно?')} variant="destructive">Удалить выбранные</Button>
          <Button onClick={() => act('delete', { scope }, 'Удалить ВСЕ сообщения в этом списке безвозвратно?')} variant="destructive">Очистить всё</Button>
        </div>

        <Card className="border-2 border-border bg-card">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-foreground">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-2 w-8">
                    <input type="checkbox" checked={rows.length > 0 && selected.length === rows.length} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])} />
                  </th>
                  <th className="p-2">Дата</th>
                  <th className="p-2">От</th>
                  <th className="p-2">Кому</th>
                  <th className="p-2">Сообщение</th>
                  <th className="p-2">Вложение</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 align-top">
                    <td className="p-2"><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /></td>
                    <td className="p-2 whitespace-nowrap">{r.created_at.slice(0, 16)}</td>
                    <td className="p-2">{r.sender_name}</td>
                    <td className="p-2">{r.channel === 'general' ? 'Общий чат' : r.recipient_name}</td>
                    <td className="p-2 whitespace-pre-wrap break-words max-w-md">{r.text}</td>
                    <td className="p-2">
                      {r.file_url && (
                        <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="underline text-accent break-all">{r.file_name}</a>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{loading ? 'Загрузка...' : 'Сообщений нет'}</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
