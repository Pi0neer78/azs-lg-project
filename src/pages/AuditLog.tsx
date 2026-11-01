import { useEffect, useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { AUDIT_API } from '@/utils/auditClient';

interface Rec {
  id: number;
  created_at: string;
  user_name: string;
  user_login: string;
  user_role: string;
  ip: string;
  device: string;
  action: string;
  section: string;
  description: string;
}

const ACTIONS = ['добавление', 'изменение', 'удаление', 'вход', 'выход', 'печать', 'в эксель'];
const ROLES: Record<string, string> = { admin: 'Администратор', operator: 'Оператор', client: 'Клиент' };
const STORAGE_KEY = 'audit_log_pass';

const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const userText = (r: Rec) => `${r.user_name}${r.user_role && ROLES[r.user_role] ? ` (${ROLES[r.user_role]})` : ''}`;
const deviceText = (r: Rec) => [r.ip, r.device].filter(Boolean).join(' / ');

export default function AuditLog() {
  const [password, setPassword] = useState('');
  const [pass, setPass] = useState<string | null>(sessionStorage.getItem(STORAGE_KEY));
  const [error, setError] = useState('');
  const [rows, setRows] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const call = useCallback(async (p: string, init?: RequestInit, qs = '') => {
    const res = await fetch(`${AUDIT_API}${qs}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': p },
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }, []);

  const load = useCallback(async () => {
    if (!pass) return;
    setLoading(true);
    const qs = new URLSearchParams({ date_from: dateFrom, date_to: dateTo, action: actions.join(','), q: search });
    try {
      const { ok, data } = await call(pass, undefined, `?${qs.toString()}`);
      if (ok) setRows(data.records || []);
      else if (data.error === 'Неверный пароль') {
        sessionStorage.removeItem(STORAGE_KEY);
        setPass(null);
      }
    } finally {
      setLoading(false);
    }
  }, [pass, dateFrom, dateTo, actions, search, call]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const p = password.trim();
    try {
      const { ok, data } = await call(p, { method: 'POST', body: JSON.stringify({ action: 'login' }) });
      if (ok) {
        sessionStorage.setItem(STORAGE_KEY, p);
        setPass(p);
      } else setError(data.error || 'Ошибка входа');
    } catch {
      setError('Ошибка соединения с сервером');
    }
  };

  const toggleAction = (a: string) => setActions((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));

  const filterText = useMemo(() => {
    const f: string[] = [];
    if (dateFrom) f.push(`с ${dateFrom}`);
    if (dateTo) f.push(`по ${dateTo}`);
    if (actions.length) f.push(`виды: ${actions.join(', ')}`);
    if (search.trim()) f.push(`описание: ${search.trim()}`);
    return f.join('; ');
  }, [dateFrom, dateTo, actions, search]);

  const report = (type: 'печать' | 'в эксель') => {
    if (!pass) return;
    fetch(AUDIT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': pass },
      body: JSON.stringify({
        action: 'event', type, section: 'Журнал операций',
        description: `Записей : ${rows.length}, Фильтр : ${filterText || 'без фильтров'}`,
      }),
    }).catch(() => undefined);
  };

  const handlePrint = () => {
    const body = rows
      .map((r) => `<tr><td class="nw">${esc(r.created_at)}</td><td>${esc(userText(r))}</td><td>${esc(deviceText(r))}</td><td>${esc(r.action)}</td><td>${esc(r.section)}</td><td>${esc(r.description)}</td></tr>`)
      .join('');
    const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Журнал операций</title><style>
@page { size: A4 landscape; margin: 8mm; }
body { font-family: Arial, sans-serif; font-size: 8.5pt; color: #000; }
h1 { font-size: 13pt; margin: 0 0 2mm; } .meta { font-size: 8.5pt; margin-bottom: 3mm; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #000; padding: 1mm 1.5mm; vertical-align: top; word-wrap: break-word; overflow-wrap: anywhere; }
th { background: #e8e8e8; text-align: left; } thead { display: table-header-group; } tr { page-break-inside: avoid; }
.nw { white-space: nowrap; }
col.d { width: 28mm; } col.u { width: 34mm; } col.i { width: 40mm; } col.a { width: 22mm; } col.s { width: 28mm; }
</style></head><body><h1>Журнал операций</h1>
<div class="meta">Сформировано: ${esc(new Date().toLocaleString('ru-RU'))}. Записей: ${rows.length}.${filterText ? ' Фильтр: ' + esc(filterText) + '.' : ' Без фильтров.'}</div>
<table><colgroup><col class="d"><col class="u"><col class="i"><col class="a"><col class="s"><col></colgroup>
<thead><tr><th>Дата/время</th><th>Пользователь</th><th>IP / Имя компьютера</th><th>Вид операции</th><th>Раздел</th><th>Описание</th></tr></thead>
<tbody>${body}</tbody></table>
<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},300);};</script></body></html>`;
    const win = window.open('', '_blank');
    if (!win) {
      alert('Браузер заблокировал окно печати. Разрешите всплывающие окна для этого сайта.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    report('печать');
  };

  const handleExcel = () => {
    const header = ['Дата/время', 'Пользователь', 'IP / Имя компьютера', 'Вид операции', 'Раздел', 'Описание'];
    const data = rows.map((r) => [r.created_at, userText(r), deviceText(r), r.action, r.section, r.description]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 19 }, { wch: 28 }, { wch: 34 }, { wch: 14 }, { wch: 18 }, { wch: 100 }];
    ws['!autofilter'] = { ref: `A1:F${rows.length + 1}` };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Журнал операций');
    const d = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `audit_log_${d}.xlsx`);
    report('в эксель');
  };

  if (!pass) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl font-bold text-accent mb-8 text-center">Журнал операций</h1>
        <Card className="w-full max-w-sm border-2 border-accent shadow-xl bg-card/95">
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
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
      <div className="max-w-[1500px] mx-auto flex flex-col gap-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-accent">Журнал операций</h1>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handlePrint} variant="outline" className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
              <Icon name="Printer" size={16} className="mr-2" />Печать
            </Button>
            <Button onClick={handleExcel} variant="outline" className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
              <Icon name="FileSpreadsheet" size={16} className="mr-2" />Экспорт в Excel
            </Button>
            <Button variant="outline" onClick={() => { sessionStorage.removeItem(STORAGE_KEY); setPass(null); setPassword(''); }} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
              <Icon name="LogOut" size={16} className="mr-2" />Выход
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Период: с</span>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 bg-input text-foreground border-2 border-border" />
          <span className="text-sm text-muted-foreground">по</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 bg-input text-foreground border-2 border-border" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по описанию" className="max-w-xs bg-input text-foreground border-2 border-border" />
          {(search || dateFrom || dateTo || actions.length > 0) && (
            <Button variant="outline" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setActions([]); }} className="border-2 border-border text-foreground">Сбросить</Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Вид операции:</span>
          {ACTIONS.map((a) => (
            <Button key={a} size="sm" variant="outline" onClick={() => toggleAction(a)} className={`border-2 border-accent ${actions.includes(a) ? 'bg-accent text-accent-foreground' : 'text-foreground'}`}>
              {a}
            </Button>
          ))}
        </div>

        <div className="text-sm text-muted-foreground">Записей: {rows.length}{rows.length >= 5000 ? ' (показаны последние 5000, уточните период)' : ''}</div>

        <Card className="border-2 border-border bg-card">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-foreground">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-2">Дата/время</th>
                  <th className="p-2">Пользователь</th>
                  <th className="p-2">IP / Имя компьютера</th>
                  <th className="p-2">Вид операции</th>
                  <th className="p-2">Раздел</th>
                  <th className="p-2">Описание</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 align-top">
                    <td className="p-2 whitespace-nowrap">{r.created_at}</td>
                    <td className="p-2">{userText(r)}</td>
                    <td className="p-2 break-words max-w-[220px]">{deviceText(r)}</td>
                    <td className="p-2 whitespace-nowrap text-accent font-semibold">{r.action}</td>
                    <td className="p-2">{r.section}</td>
                    <td className="p-2 whitespace-pre-wrap break-words max-w-xl">{r.description}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{loading ? 'Загрузка...' : 'Записей нет'}</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
