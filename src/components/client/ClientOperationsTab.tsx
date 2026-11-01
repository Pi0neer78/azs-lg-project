import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';
import TablePagination from '@/components/ui/table-pagination';
import { adminApi } from '@/utils/adminApi';
import { logEvent } from '@/utils/auditClient';
import { usePageSize } from '@/hooks/usePageSize';
import { printOperations, exportOperationsToExcel } from '@/utils/operationsExport';

interface Props {
  clientLogin: string;
  showAlert: (message: string) => void;
}

const opColor = (type: string) => {
  switch (type) {
    case 'пополнение':
      return 'bg-primary text-primary-foreground';
    case 'заправка':
      return 'bg-accent text-accent-foreground';
    case 'списание':
      return 'bg-destructive text-destructive-foreground';
    case 'оприходование':
      return 'bg-secondary text-secondary-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const cardText = (o: any) => `${o.card_code}/${o.card_index ?? 0}`;
const fuelText = (o: any) => o.op_fuel_type || o.fuel_type || '';

export default function ClientOperationsTab({ clientLogin, showAlert }: Props) {
  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCard, setFilterCard] = useState('all');
  const [filterFuel, setFilterFuel] = useState('all');
  const [filterStation, setFilterStation] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const ps = usePageSize('client_ops');
  const pageSize = ps.size;

  useEffect(() => {
    Promise.all([adminApi.operations.getAll(), adminApi.cards.getAll(), adminApi.clients.getAll()])
      .then(([ops, cards, clients]) => {
        const own = clients.find((c: any) => c.login === clientLogin) || (clients.length === 1 ? clients[0] : undefined);
        const ownCardIds = new Set(cards.filter((c: any) => own && c.client_id === own.id).map((c: any) => c.id));
        setOperations(ops.filter((o: any) => ownCardIds.has(o.fuel_card_id)));
      })
      .catch(() => showAlert('Не удалось загрузить операции.'))
      .finally(() => setLoading(false));
  }, [clientLogin]);

  const uniq = (fn: (o: any) => string) =>
    Array.from(new Set(operations.map(fn).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'));
  const cardOptions = uniq(cardText);
  const fuelOptions = uniq(fuelText);
  const stationOptions = uniq((o) => o.station_name);
  const typeOptions = uniq((o) => o.operation_type);

  const filtered = operations.filter((o) => {
    const day = String(o.operation_date || '').slice(0, 10);
    if (filterCard !== 'all' && cardText(o) !== filterCard) return false;
    if (filterFuel !== 'all' && fuelText(o) !== filterFuel) return false;
    if (filterStation !== 'all' && o.station_name !== filterStation) return false;
    if (filterType !== 'all' && o.operation_type !== filterType) return false;
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const activeFilters = () => {
    const f: string[] = [];
    if (filterCard !== 'all') f.push(`карта: ${filterCard}`);
    if (filterFuel !== 'all') f.push(`топливо: ${filterFuel}`);
    if (filterStation !== 'all') f.push(`АЗС: ${filterStation}`);
    if (filterType !== 'all') f.push(`операция: ${filterType}`);
    if (dateFrom) f.push(`с ${dateFrom}`);
    if (dateTo) f.push(`по ${dateTo}`);
    return f;
  };

  const describe = () => `Записей : ${filtered.length}, Фильтр : ${activeFilters().join('; ') || 'без фильтров'}`;

  const handleExcel = () => {
    exportOperationsToExcel(filtered);
    logEvent('в эксель', 'Операции', describe());
  };

  const handlePrint = () => {
    logEvent('печать', 'Операции', describe());
    if (!printOperations(filtered, activeFilters())) {
      showAlert('Браузер заблокировал окно печати. Разрешите всплывающие окна для этого сайта.');
    }
  };

  const reset = () => {
    setFilterCard('all');
    setFilterFuel('all');
    setFilterStation('all');
    setFilterType('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const filterSelect = (label: string, value: string, set: (v: string) => void, options: string[], allLabel: string) => (
    <div>
      <Label className="text-foreground text-xs">{label}</Label>
      <Select
        value={value}
        onValueChange={(v) => {
          set(v);
          setPage(1);
        }}
      >
        <SelectTrigger className="h-8 text-sm bg-input border-2 border-border text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Card className="border-2 border-primary bg-card/95 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="text-2xl text-foreground flex items-center gap-2">
            <Icon name="History" size={28} className="text-accent" />
            Все операции
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Icon name="Printer" size={16} className="mr-2" />
              Печать
            </Button>
            <Button
              onClick={handleExcel}
              variant="outline"
              size="sm"
              className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Icon name="FileSpreadsheet" size={16} className="mr-2" />
              Экспорт в Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
          {filterSelect('Карта', filterCard, setFilterCard, cardOptions, 'Все карты')}
          {filterSelect('Вид топлива', filterFuel, setFilterFuel, fuelOptions, 'Все виды')}
          {filterSelect('АЗС', filterStation, setFilterStation, stationOptions, 'Все АЗС')}
          {filterSelect('Тип операции', filterType, setFilterType, typeOptions, 'Все типы')}
          <div>
            <Label className="text-foreground text-xs">Дата с</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2 text-sm bg-input border-2 border-border text-foreground"
            />
          </div>
          <div>
            <Label className="text-foreground text-xs">Дата по</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2 text-sm bg-input border-2 border-border text-foreground"
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-sm mb-3">
          <div className="text-muted-foreground">
            Найдено операций: <strong className="text-accent">{filtered.length}</strong> из {operations.length}
          </div>
          {activeFilters().length > 0 && (
            <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground hover:text-foreground">
              <Icon name="X" size={16} className="mr-1" />
              Сбросить фильтры
            </Button>
          )}
        </div>

        <div className="overflow-x-auto" ref={ps.ref}>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                {['Дата', 'Карта', 'Топливо', 'АЗС', 'Операция', 'Кол-во', 'Цена', 'Сумма', 'Комментарий'].map((h) => (
                  <TableHead key={h} className="text-foreground font-bold h-7 px-2 py-0 text-xs whitespace-nowrap">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Операции не найдены
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((o) => (
                  <TableRow key={o.id} className="border-b border-border">
                    <TableCell className="text-foreground px-2 py-0.5 text-xs whitespace-nowrap">{o.operation_date}</TableCell>
                    <TableCell className="font-mono text-accent px-2 py-0.5 text-xs whitespace-nowrap">{cardText(o)}</TableCell>
                    <TableCell className="text-foreground px-2 py-0.5 text-xs">{fuelText(o)}</TableCell>
                    <TableCell className="text-foreground px-2 py-0.5 text-xs">{o.station_name}</TableCell>
                    <TableCell className="px-2 py-0.5 text-xs">
                      <Badge className={`${opColor(o.operation_type)} px-1.5 py-0 text-[11px] leading-4 font-medium`}>
                        {o.operation_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground text-right px-2 py-0.5 text-xs whitespace-nowrap">{(o.quantity || 0).toFixed(3)}</TableCell>
                    <TableCell className="text-foreground text-right px-2 py-0.5 text-xs whitespace-nowrap">{(o.price || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-foreground text-right px-2 py-0.5 text-xs whitespace-nowrap">{(o.amount || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground px-2 py-0.5 text-xs">{o.comment}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          currentPage={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          pageSizeSetting={ps.setting}
          onPageSizeChange={(s) => {
            ps.setSetting(s);
            setPage(1);
          }}
        />
      </CardContent>
    </Card>
  );
}
