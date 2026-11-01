import { useEffect, useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useConfirm, useAlert } from '@/components/ConfirmDialog';
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
const PAGE_SIZES = [25, 50, 100, 200];
const ACTION_STYLE: Record<string, string> = {
  'добавление': 'border-green-600 bg-green-600/15',
  'изменение': 'border-yellow-600 bg-yellow-600/15',
  'удаление': 'border-red-600 bg-red-600/15',
  'вход': 'border-blue-600 bg-blue-600/15',
  'выход': 'border-slate-500 bg-slate-500/15',
  'печать': 'border-purple-600 bg-purple-600/15',
  'в эксель': 'border-teal-600 bg-teal-600/15',
};
const isoDay = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const userText = (r: Rec) => `${r.user_name}${r.user_role && ROLES[r.user_role] ? ` (${ROLES[r.user_role]})` : ''}`;
const deviceText = (r: Rec) => [r.ip, r.device].filter(Boolean).join(' / ');

export default function AuditLog() {
  const confirmAction = useConfirm();
  const showAlert = useAlert();
  const [cleanDays, setCleanDays] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showClean, setShowClean] = useState(false);
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

  const handleCleanup = async () => {
    const days = parseInt(cleanDays, 10);
    if (!pass || !days || days < 1) {
      showAlert('Укажите количество дней (число от 1).');
      return;
    }
    if (!(await confirmAction({ title: 'Очистка журнала', message: `Удалить безвозвратно все записи журнала старше ${days} дн.?` }))) return;
    const { ok, data } = await call(pass, { method: 'POST', body: JSON.stringify({ action: 'cleanup', days }) });
    if (ok) {
      showAlert(`Удалено записей: ${data.deleted}`);
      setCleanDays('');
      load();
    } else {
      showAlert(data.error || 'Не удалось очистить журнал');
    }
  };

  useEffect(() => setPage(1), [rows, pageSize]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const fromIdx = rows.length ? (safePage - 1) * pageSize + 1 : 0;
  const toIdx = Math.min(safePage * pageSize, rows.length);
  const pageNumbers = (() => {
    const set = new Set<number>([1, totalPages, safePage - 1, safePage, safePage + 1]);
    const list = Array.from(set).filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out: (number | 'gap')[] = [];
    list.forEach((n, i) => {
      if (i > 0 && n - list[i - 1] > 1) out.push('gap');
      out.push(n);
    });
    return out;
  })();
  const hasFilters = !!(search || dateFrom || dateTo || actions.length);
  const setPeriod = (days: number) => { setDateFrom(isoDay(days)); setDateTo(isoDay(0)); };

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

  const btn = 'border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground';
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-3 md:p-4">
      <div className="max-w-[1500px] mx-auto flex flex-col gap-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-accent flex items-center gap-2">
            <Icon name="ScrollText" size={24} />Журнал операций
          </h1>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={handlePrint} variant="outline" className={btn}>
              <Icon name="Printer" size={16} className="mr-2" />Печать
            </Button>
            <Button size="sm" onClick={handleExcel} variant="outline" className={btn}>
              <Icon name="FileSpreadsheet" size={16} className="mr-2" />Excel
            </Button>
            <Button size="sm" variant="outline" onClick={() => { sessionStorage.removeItem(STORAGE_KEY); setPass(null); setPassword(''); }} className={btn}>
              <Icon name="LogOut" size={16} className="mr-2" />Выход
            </Button>
          </div>
        </div>

        <Card className="border-2 border-border bg-card">
          <CardContent className="p-3 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 h-9 bg-input text-foreground border-2 border-border" />
              <span className="text-muted-foreground">—</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 h-9 bg-input text-foreground border-2 border-border" />
              <Button size="sm" variant="outline" onClick={() => setPeriod(0)} className="border-2 border-border text-foreground">Сегодня</Button>
              <Button size="sm" variant="outline" onClick={() => setPeriod(6)} className="border-2 border-border text-foreground">7 дней</Button>
              <Button size="sm" variant="outline" onClick={() => setPeriod(29)} className="border-2 border-border text-foreground">30 дней</Button>
              <div className="relative flex-1 min-w-[220px]">
                <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по описанию, пользователю, разделу" className="pl-9 h-9 bg-input text-foreground border-2 border-border" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {ACTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAction(a)}
                  className={`px-3 py-1 rounded-full border-2 text-xs font-semibold text-foreground transition-opacity ${ACTION_STYLE[a]} ${actions.length && !actions.includes(a) ? 'opacity-40' : ''} ${actions.includes(a) ? 'ring-2 ring-accent' : ''}`}
                >
                  {a}
                </button>
              ))}
              {hasFilters && (
                <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setActions([]); }} className="text-foreground underline">
                  Сбросить фильтры
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center flex-wrap gap-2 text-sm text-muted-foreground">
          <span>
            Записей: <b className="text-foreground">{rows.length}</b>
            {rows.length >= 5000 ? ' (последние 5000, уточните период)' : ''}
            {loading ? ' · обновление...' : ''}
          </span>
          <button type="button" onClick={() => setShowClean((v) => !v)} className="flex items-center gap-1 text-foreground hover:text-accent">
            <Icon name="Trash2" size={14} />Очистка старых записей
          </button>
        </div>

        {showClean && (
          <Card className="border-2 border-destructive bg-card">
            <CardContent className="p-3 flex flex-wrap gap-2 items-center">
              <span className="text-sm text-foreground">Удалить записи старше</span>
              <Input type="number" min={1} value={cleanDays} onChange={(e) => setCleanDays(e.target.value)} placeholder="дней" className="w-24 h-9 bg-input text-foreground border-2 border-border" />
              <span className="text-sm text-foreground">дней</span>
              <Button size="sm" variant="destructive" onClick={handleCleanup}>Очистить</Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-2 border-border bg-card">
          <CardContent className="p-0 overflow-auto max-h-[calc(100vh-330px)] min-h-[240px]">
            <table className="w-full text-sm text-foreground">
              <thead className="sticky top-0 z-10 bg-secondary">
                <tr className="border-b-2 border-border text-left text-foreground">
                  <th className="p-2 whitespace-nowrap">Дата/время</th>
                  <th className="p-2">Пользователь</th>
                  <th className="p-2">IP / Компьютер</th>
                  <th className="p-2">Операция</th>
                  <th className="p-2">Раздел</th>
                  <th className="p-2 w-full">Описание</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 align-top hover:bg-secondary/40">
                    <td className="p-2 whitespace-nowrap tabular-nums">{r.created_at}</td>
                    <td className="p-2">{userText(r)}</td>
                    <td className="p-2 text-xs break-words max-w-[200px]">{deviceText(r)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-full border-2 text-xs font-semibold whitespace-nowrap ${ACTION_STYLE[r.action] || 'border-border'}`}>{r.action}</span>
                    </td>
                    <td className="p-2 whitespace-nowrap">{r.section}</td>
                    <td className="p-2 whitespace-pre-wrap break-words min-w-[280px]">{r.description}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{loading ? 'Загрузка...' : 'Записей нет'}</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span>Показывать по</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-8 rounded-md border-2 border-border bg-input text-foreground px-2"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-muted-foreground">{fromIdx}–{toIdx} из {rows.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage(1)} className={btn} title="В начало">
                <Icon name="ChevronsLeft" size={16} />
              </Button>
              <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className={btn} title="Назад">
                <Icon name="ChevronLeft" size={16} />
              </Button>
              {pageNumbers.map((n, idx) =>
                n === 'gap' ? (
                  <span key={`g${idx}`} className="px-1 text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={n}
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(n)}
                    className={`border-2 border-accent min-w-8 ${n === safePage ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}
                  >
                    {n}
                  </Button>
                )
              )}
              <Button size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className={btn} title="Вперёд">
                <Icon name="ChevronRight" size={16} />
              </Button>
              <Button size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)} className={btn} title="В конец">
                <Icon name="ChevronsRight" size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
