import { Fragment, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';
import { adminApi } from '@/utils/adminApi';
import {
  buildTurnoverReport,
  printTurnover,
  exportTurnoverToExcel,
  reportTitle,
  type TurnoverMode,
  type TurnoverReport,
  type Pair,
} from '@/utils/turnoverReport';

interface Props {
  clients?: any[];
  clientLogin?: string;
  showAlert: (message: string) => void;
}

const qty = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const money = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function PairCells({ p, showQty = true, bold = false }: { p: Pair; showQty?: boolean; bold?: boolean }) {
  const cls = `text-right whitespace-nowrap py-1.5 ${bold ? 'font-bold' : ''}`;
  return (
    <>
      <TableCell className={`${cls} text-foreground`}>{showQty ? qty(p.q) : ''}</TableCell>
      <TableCell className={`${cls} text-foreground`}>{money(p.a)}</TableCell>
    </>
  );
}

export default function TurnoverReportTab({ clients = [], clientLogin, showAlert }: Props) {
  const clientMode = !!clientLogin;
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [clientId, setClientId] = useState('all');
  const [report, setReport] = useState<TurnoverReport | null>(null);
  const [busy, setBusy] = useState(false);

  const reportClients = clients
    .filter((c) => !c.admin && !c.operator)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ru'));

  const validPeriod = !!dateFrom && !!dateTo && dateFrom <= dateTo;

  const generate = async (mode: TurnoverMode) => {
    if (!validPeriod) {
      showAlert('Укажите период: дата «с» не должна быть позже даты «по».');
      return;
    }
    setBusy(true);
    try {
      const [freshClients, freshCards, freshFuelTypes, freshOperations] = await Promise.all([
        adminApi.clients.getAll(),
        adminApi.cards.getAll(),
        adminApi.fuelTypes.getAll(),
        adminApi.operations.getAll(),
      ]);
      let effectiveClientId = clientId;
      if (clientMode) {
        const own =
          freshClients.find((c: any) => c.login === clientLogin) ||
          (freshClients.length === 1 ? freshClients[0] : undefined);
        if (!own) {
          showAlert('Не удалось определить клиента для отчёта.');
          return;
        }
        effectiveClientId = String(own.id);
      }
      setReport(
        buildTurnoverReport({
          from: dateFrom,
          to: dateTo,
          clientId: effectiveClientId,
          mode,
          clients: freshClients,
          cards: freshCards,
          fuelTypes: freshFuelTypes,
          operations: freshOperations,
        })
      );
    } catch {
      showAlert('Не удалось загрузить данные для отчёта. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    if (report && !printTurnover(report)) {
      showAlert('Браузер заблокировал окно печати. Разрешите всплывающие окна для этого сайта.');
    }
  };

  const tSingle = report ? report.units.length === 1 : true;

  return (
    <Card className="border-2 border-primary bg-card/95 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Icon name="FileBarChart" className="text-accent" />
            Отчёты
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handlePrint}
              disabled={!report}
              variant="outline"
              size="sm"
              className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Icon name="Printer" className="w-4 h-4 mr-2" />
              Печать
            </Button>
            <Button
              onClick={() => report && exportTurnoverToExcel(report)}
              disabled={!report}
              variant="outline"
              size="sm"
              className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Icon name="FileSpreadsheet" className="w-4 h-4 mr-2" />
              Экспорт в Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="w-36">
            <Label className="text-foreground text-xs">Период с</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 px-2 text-sm bg-input border-2 border-border text-foreground"
            />
          </div>
          <div className="w-36">
            <Label className="text-foreground text-xs">Период по</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 px-2 text-sm bg-input border-2 border-border text-foreground"
            />
          </div>
          {!clientMode && (
            <div className="w-64">
              <Label className="text-foreground text-xs">Клиент</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-8 text-sm bg-input border-2 border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все клиенты</SelectItem>
                  {reportClients.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={busy || !validPeriod}
                size="sm"
                className="h-8 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
              >
                <Icon name="Play" className="w-4 h-4 mr-2" />
                {busy ? 'Формирую...' : 'Сформировать'}
                <Icon name="ChevronDown" className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-card border-2 border-accent">
              <DropdownMenuItem onSelect={() => generate('cards')} className="cursor-pointer text-foreground">
                <Icon name="CreditCard" className="w-4 h-4 mr-2 text-accent" />
                Оборотка по картам
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => generate('fuel')} className="cursor-pointer text-foreground">
                <Icon name="Droplets" className="w-4 h-4 mr-2 text-accent" />
                Оборотка по видам топлива
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!report ? (
          <p className="text-muted-foreground text-center py-10">
            {clientMode ? 'Выберите период, нажмите «Сформировать» и выберите вид отчёта.' : 'Выберите период и клиента, нажмите «Сформировать» и выберите вид отчёта.'}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-2">
              <strong className="text-accent">{reportTitle(report)}.</strong>{' '}
              Период: <strong className="text-foreground">{report.from.split('-').reverse().join('.')} — {report.to.split('-').reverse().join('.')}</strong>.
              {' '}Клиент: <strong className="text-foreground">{report.clientLabel}</strong>.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead rowSpan={2} className="text-foreground font-bold align-middle">{report.mode === 'fuel' ? 'Клиент / Вид топлива' : 'Клиент / Карта'}</TableHead>
                    <TableHead rowSpan={2} className="text-foreground font-bold align-middle">{report.mode === 'fuel' ? 'Карт' : 'Вид топлива'}</TableHead>
                    <TableHead rowSpan={2} className="text-foreground font-bold align-middle text-center">Ед. изм.</TableHead>
                    <TableHead colSpan={2} className="text-foreground font-bold text-center border-l border-border">Остаток на начало</TableHead>
                    <TableHead colSpan={2} className="text-foreground font-bold text-center border-l border-border">Приход</TableHead>
                    <TableHead colSpan={2} className="text-foreground font-bold text-center border-l border-border">Расход</TableHead>
                    <TableHead colSpan={2} className="text-foreground font-bold text-center border-l border-border">Остаток на конец</TableHead>
                  </TableRow>
                  <TableRow className="border-b border-border">
                    {[0, 1, 2, 3].map((i) => (
                      <Fragment key={i}>
                        <TableHead className="text-foreground text-right h-7 border-l border-border">Кол-во</TableHead>
                        <TableHead className="text-foreground text-right h-7">Сумма</TableHead>
                      </Fragment>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.groups.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        Нет данных за выбранный период
                      </TableCell>
                    </TableRow>
                  )}
                  {report.groups.map((g) => {
                    const single = g.units.length === 1;
                    return (
                      <Fragment key={g.clientName}>
                        <TableRow className="bg-secondary/60 border-b border-border">
                          <TableCell colSpan={3} className="font-bold text-accent py-1.5">{g.clientName}</TableCell>
                          <PairCells p={g.open} showQty={single} bold />
                          <PairCells p={g.income} showQty={single} bold />
                          <PairCells p={g.outcome} showQty={single} bold />
                          <PairCells p={g.close} showQty={single} bold />
                        </TableRow>
                        {g.cards.map((r) => (
                          <TableRow key={`${g.clientName}-${r.cardLabel}-${r.fuel}-${r.unit}`} className="border-b border-border">
                            {report.mode === 'fuel' ? (
                              <>
                                <TableCell className="text-accent font-semibold pl-8 py-1.5">{r.fuel}</TableCell>
                                <TableCell className="text-foreground py-1.5">{r.cardsCount}</TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="font-mono text-accent pl-8 py-1.5">{r.cardLabel}</TableCell>
                                <TableCell className="text-foreground py-1.5">{r.fuel}</TableCell>
                              </>
                            )}
                            <TableCell className="text-foreground text-center py-1.5">{r.unit}</TableCell>
                            <PairCells p={r.open} />
                            <PairCells p={r.income} />
                            <PairCells p={r.outcome} />
                            <PairCells p={r.close} />
                          </TableRow>
                        ))}
                      </Fragment>
                    );
                  })}
                  {report.groups.length > 0 && (
                    <TableRow className="bg-primary/20">
                      <TableCell colSpan={3} className="font-bold text-foreground py-2">
                        Итого{tSingle ? '' : ' (количество не суммируется: разные единицы)'}
                      </TableCell>
                      <PairCells p={report.open} showQty={tSingle} bold />
                      <PairCells p={report.income} showQty={tSingle} bold />
                      <PairCells p={report.outcome} showQty={tSingle} bold />
                      <PairCells p={report.close} showQty={tSingle} bold />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {report.fuelTotals.length > 0 && (
              <div className="mt-6">
                <h3 className="text-foreground font-bold mb-2 flex items-center gap-2">
                  <Icon name="Droplets" className="text-accent w-4 h-4" />
                  Итого по видам топлива (все клиенты)
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border">
                        <TableHead rowSpan={2} className="text-foreground font-bold align-middle">Вид топлива</TableHead>
                        <TableHead rowSpan={2} className="text-foreground font-bold align-middle">Карт</TableHead>
                        <TableHead rowSpan={2} className="text-foreground font-bold align-middle text-center">Ед. изм.</TableHead>
                        <TableHead colSpan={2} className="text-foreground font-bold text-center border-l border-border">Остаток на начало</TableHead>
                        <TableHead colSpan={2} className="text-foreground font-bold text-center border-l border-border">Приход</TableHead>
                        <TableHead colSpan={2} className="text-foreground font-bold text-center border-l border-border">Расход</TableHead>
                        <TableHead colSpan={2} className="text-foreground font-bold text-center border-l border-border">Остаток на конец</TableHead>
                      </TableRow>
                      <TableRow className="border-b border-border">
                        {[0, 1, 2, 3].map((i) => (
                          <Fragment key={i}>
                            <TableHead className="text-foreground text-right h-7 border-l border-border">Кол-во</TableHead>
                            <TableHead className="text-foreground text-right h-7">Сумма</TableHead>
                          </Fragment>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.fuelTotals.map((r) => (
                        <TableRow key={`${r.fuel}-${r.unit}`} className="border-b border-border">
                          <TableCell className="text-accent font-semibold py-1.5">{r.fuel}</TableCell>
                          <TableCell className="text-foreground py-1.5">{r.cardsCount}</TableCell>
                          <TableCell className="text-foreground text-center py-1.5">{r.unit}</TableCell>
                          <PairCells p={r.open} />
                          <PairCells p={r.income} />
                          <PairCells p={r.outcome} />
                          <PairCells p={r.close} />
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
