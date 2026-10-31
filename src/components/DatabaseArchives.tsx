import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';
import { apiFetch } from '@/utils/authFetch';

const ARCHIVE_API = 'https://functions.poehali.dev/109b311d-afec-4374-af73-898491da3fd4';

interface Archive {
  id: number;
  file_name: string;
  size_bytes: number;
  tables_count: number;
  rows_count: number;
  created_by: string;
  created_at: string;
}

interface TableInfo {
  name: string;
  rows: number;
}

const TABLE_TITLES: Record<string, string> = {
  clients: 'Клиенты',
  fuel_cards: 'Карты',
  card_operations: 'Операции',
  stations: 'АЗС',
  fuel_types: 'Виды топлива',
  card_fuel_prices: 'Цены по картам',
  chat_messages: 'Сообщения чата',
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export default function DatabaseArchives() {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState('30');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(ARCHIVE_API);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не удалось загрузить данные');
      setArchives(data.archives || []);
      setTables(data.tables || []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createArchive = async () => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const res = await apiFetch(ARCHIVE_API, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не удалось создать архив');
      setMessage('Архив создан');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка создания архива');
    } finally {
      setBusy(false);
    }
  };

  const download = async (a: Archive) => {
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch(`${ARCHIVE_API}?download=${a.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не удалось скачать архив');
      const bytes = Uint8Array.from(atob(data.content_base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/gzip' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = data.file_name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка скачивания');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (query: string, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const res = await apiFetch(`${ARCHIVE_API}?${query}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не удалось удалить');
      setMessage(`Удалено архивов: ${data.deleted}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setBusy(false);
    }
  };

  const daysNum = parseInt(days, 10);
  const totalRows = tables.reduce((sum, t) => sum + t.rows, 0);

  return (
    <div className="space-y-6">
      <Card className="bg-card border-2 border-primary">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center justify-between flex-wrap gap-2">
            <span>Текущая база данных</span>
            <Button onClick={createArchive} disabled={busy} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Icon name="Archive" className="w-4 h-4 mr-2" />
              {busy ? 'Подождите...' : 'Создать архив'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tables.map((t) => (
              <div key={t.name} className="border-2 border-border rounded-md p-3">
                <div className="text-sm text-muted-foreground">{TABLE_TITLES[t.name] || t.name}</div>
                <div className="text-xl font-bold text-foreground">{t.rows}</div>
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground mt-3">Всего записей: {totalRows}</div>
        </CardContent>
      </Card>

      <Card className="bg-card border-2 border-primary">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center justify-between flex-wrap gap-2">
            <span>Архивы</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal text-muted-foreground">Удалить старше, дней:</span>
              <Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className="w-20 h-9" />
              <Button
                variant="outline"
                disabled={busy || !daysNum || daysNum < 1}
                onClick={() => remove(`older_than_days=${daysNum}`, `Удалить все архивы старше ${daysNum} дн.? Это нельзя отменить.`)}
                className="border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Icon name="Trash2" className="w-4 h-4 mr-2" />
                Удалить старые
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {message && <div className="mb-3 text-sm text-foreground">{message}</div>}
          {error && <div className="mb-3 text-sm text-destructive">{error}</div>}
          {loading ? (
            <div className="text-muted-foreground">Загрузка...</div>
          ) : archives.length === 0 ? (
            <div className="text-muted-foreground">Архивов пока нет</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата создания</TableHead>
                  <TableHead>Файл</TableHead>
                  <TableHead>Размер</TableHead>
                  <TableHead>Записей</TableHead>
                  <TableHead>Кто создал</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archives.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.created_at}</TableCell>
                    <TableCell>{a.file_name}</TableCell>
                    <TableCell>{formatSize(a.size_bytes)}</TableCell>
                    <TableCell>{a.rows_count}</TableCell>
                    <TableCell>{a.created_by}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="outline" disabled={busy} onClick={() => download(a)} title="Скачать" className="h-7 w-7 border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                          <Icon name="Download" className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="outline" disabled={busy} onClick={() => remove(`id=${a.id}`, 'Удалить этот архив? Это нельзя отменить.')} title="Удалить" className="h-7 w-7 border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                          <Icon name="Trash2" className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
