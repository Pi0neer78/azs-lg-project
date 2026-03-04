import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import TablePagination from '@/components/ui/table-pagination';
import { useOperations } from '@/contexts/OperationsContext';
import * as XLSX from 'xlsx';
import { adminApi } from '@/utils/adminApi';

interface ClientData {
  name: string;
  inn: string;
  email: string;
  phone: string;
}

interface FuelCard {
  id: number;
  card_code: string;
  card_index: number;
  fuel_type: string;
  balance_liters: number;
  daily_limit: number;
  status: 'активна' | 'заблокирована';
  block_reason: string;
  owner: string;
}

interface Operation {
  id: number;
  card_id: number;
  station_name: string;
  operation_date: string;
  operation_type: string;
  quantity: number;
  price: number;
  amount: number;
  comment: string;
}

export default function CardOperations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cardId = parseInt(searchParams.get('cardId') || '1');
  const { operations: contextOperations } = useOperations();

  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [cards, setCards] = useState<FuelCard[]>([]);
  const [stations, setStations] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [operationsData, cardsData, fuelTypesData, clientsData, stationsData] = await Promise.all([
          adminApi.operations.getAll(),
          adminApi.cards.getAll(),
          adminApi.fuelTypes.getAll(),
          adminApi.clients.getAll(),
          adminApi.stations.getAll()
        ]);
        
        setOperations(operationsData);
        setStations(stationsData);
        
        const card = cardsData.find((c: any) => c.id === cardId);
        if (card) {
          const fuelType = fuelTypesData.find((ft: any) => ft.id === card.fuel_type_id);
          const client = clientsData.find((cl: any) => cl.id === card.client_id);
          
          if (client) {
            setClientData({
              name: client.name,
              inn: client.inn,
              email: client.email,
              phone: client.phone
            });
          }
          
          setCards([{
            id: card.id,
            card_code: card.card_code,
            card_index: card.card_index ?? 0,
            fuel_type: fuelType?.name || '',
            balance_liters: card.balance_liters,
            daily_limit: card.daily_limit || 0,
            status: card.status,
            block_reason: card.block_reason || '',
            owner: client?.name || ''
          }]);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [cardId]);

  const [selectedCard] = useState<number>(cardId);
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [opsPage, setOpsPage] = useState(1);
  const [opsPageSize, setOpsPageSize] = useState(20);

  const selectedCardData = cards.find(c => c.id === selectedCard);

  const cardLabel = (card: { card_code: string; card_index: number }) =>
    `${card.card_code}/${card.card_index}`;
  
  const cardOperations = operations.filter(op => {
    const opCardId = (op as any).fuel_card_id || op.card_id;
    return opCardId === selectedCard || (selectedCardData && (op as any).card_code === selectedCardData.card_code);
  });

  const uniqueStations = Array.from(new Set(cardOperations.map(op => op.station_name)));

  const filteredOperations = cardOperations.filter(op => {
    const matchesStation = selectedStation === 'all' || op.station_name === selectedStation;
    const matchesDateFrom = !dateFrom || op.operation_date >= dateFrom;
    const matchesDateTo = !dateTo || op.operation_date <= dateTo + ' 23:59';
    return matchesStation && matchesDateFrom && matchesDateTo;
  });

  const handlePrintOperations = () => {
    window.print();
  };

  const handleExportToExcel = () => {
    const exportData = operationsWithBalance.map(op => ({
      'Дата': op.operation_date,
      'АЗС': op.station_name,
      'Тип операции': op.operation_type,
      'Количество (л)': op.quantity.toFixed(3),
      'Цена (руб/л)': op.price,
      'Сумма (руб)': op.amount,
      'Баланс после операции (л)': op.balance.toFixed(3),
      'Комментарий': op.comment
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Операции');
    
    const fileName = `operations_card_${selectedCardData ? cardLabel(selectedCardData) : 'unknown'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleShowAllOperations = () => {
    setDateFrom('');
    setDateTo('');
  };

  const getOperationColor = (type: string) => {
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

  const allCardOperations = [...cardOperations].sort((a, b) => 
    new Date(a.operation_date).getTime() - new Date(b.operation_date).getTime()
  );

  const balanceMap = new Map<number, number>();
  let currentBalance = 0;
  
  allCardOperations.forEach(op => {
    if (op.operation_type === 'пополнение' || op.operation_type === 'оприходование') {
      currentBalance += op.quantity;
    } else if (op.operation_type === 'заправка' || op.operation_type === 'списание') {
      currentBalance -= op.quantity;
    }
    balanceMap.set(op.id, currentBalance);
  });

  const operationsWithBalance = filteredOperations.map(op => ({
    ...op,
    balance: balanceMap.get(op.id) || 0
  }));

  const opsTotalPages = Math.ceil(filteredOperations.length / opsPageSize) || 1;
  const safeOpsPage = Math.min(opsPage, opsTotalPages);
  const pagedOperations = operationsWithBalance.slice((safeOpsPage - 1) * opsPageSize, safeOpsPage * opsPageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background">
      <header className="bg-card border-b-4 border-accent shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Icon name="Fuel" size={32} className="text-accent" />
            <div>
              <h1 className="text-2xl font-bold text-accent">СОЮЗ</h1>
              <p className="text-sm text-muted-foreground">История операций</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/client')} 
            variant="outline" 
            className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground no-print"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
        </div>
      </header>

      <div className="print-header" style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: '5px 0', fontSize: '16pt', fontWeight: 'bold' }}>СЕТЬ АВТОЗАПРАВОЧНЫХ СТАНЦИЙ "СОЮЗ"</h2>
          <h3 style={{ margin: '5px 0', fontSize: '14pt' }}>История операций по топливной карте</h3>
        </div>
        
        {clientData && (
          <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #333' }}>
            <h4 style={{ margin: '5px 0', fontSize: '12pt', fontWeight: 'bold' }}>Информация о клиенте</h4>
            <p style={{ margin: '3px 0' }}><strong>Клиент:</strong> {clientData.name}</p>
            <p style={{ margin: '3px 0' }}><strong>ИНН:</strong> {clientData.inn}</p>
          </div>
        )}

        {selectedCardData && (
          <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #333', backgroundColor: '#f5f5f5' }}>
            <h4 style={{ margin: '5px 0', fontSize: '12pt', fontWeight: 'bold' }}>Информация о карте</h4>
            <p style={{ margin: '3px 0' }}><strong>Номер карты:</strong> {cardLabel(selectedCardData)}</p>
            <p style={{ margin: '3px 0' }}><strong>Вид топлива:</strong> {selectedCardData.fuel_type}</p>
            <p style={{ margin: '3px 0' }}><strong>Текущий баланс:</strong> {selectedCardData.balance_liters.toFixed(3)} л</p>
            <p style={{ margin: '3px 0' }}><strong>Дневной лимит:</strong> {selectedCardData.daily_limit.toFixed(3)} л</p>
            <p style={{ margin: '3px 0' }}><strong>Статус:</strong> {selectedCardData.status}</p>
            {selectedCardData.status === 'заблокирована' && selectedCardData.block_reason && (
              <p style={{ margin: '3px 0' }}><strong>Причина блокировки:</strong> {selectedCardData.block_reason}</p>
            )}
          </div>
        )}

        {(selectedStation !== 'all' || dateFrom || dateTo) && (
          <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #333' }}>
            <h4 style={{ margin: '5px 0', fontSize: '12pt', fontWeight: 'bold' }}>Фильтры</h4>
            {selectedStation !== 'all' && <p style={{ margin: '3px 0' }}><strong>АЗС:</strong> {selectedStation}</p>}
            {dateFrom && <p style={{ margin: '3px 0' }}><strong>Период с:</strong> {dateFrom}</p>}
            {dateTo && <p style={{ margin: '3px 0' }}><strong>Период по:</strong> {dateTo}</p>}
          </div>
        )}
      </div>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Card className="border-2 border-accent bg-card/95 backdrop-blur-sm no-print">
          <CardContent className="py-4">
            <div className="grid md:grid-cols-4 gap-4 items-center">
              {clientData && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Клиент</p>
                  <p className="text-sm font-semibold text-foreground">{clientData.name}</p>
                  <p className="text-xs text-muted-foreground">ИНН: {clientData.inn}</p>
                </div>
              )}
              
              {selectedCardData && (
                <>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Номер карты</p>
                    <p className="text-xl font-bold text-accent">{cardLabel(selectedCardData)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Вид топлива</p>
                    <p className="text-lg font-bold text-foreground">{selectedCardData.fuel_type}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Баланс</p>
                    <p className="text-2xl font-bold text-primary">{selectedCardData.balance_liters.toFixed(3)} л</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary bg-card/95 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl text-foreground flex items-center gap-2">
              <Icon name="History" size={28} className="text-accent" />
              История операций
            </CardTitle>
            <div className="flex gap-2 no-print">
              <Button
                onClick={handleExportToExcel}
                variant="outline"
                className="border-2 border-primary text-foreground hover:bg-primary hover:text-primary-foreground"
              >
                <Icon name="FileSpreadsheet" size={16} className="mr-2" />
                Экспорт в Excel
              </Button>
              <Button
                onClick={handlePrintOperations}
                variant="outline"
                className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Icon name="Printer" size={16} className="mr-2" />
                Печать
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 no-print">
              <div className="space-y-2">
                <Label className="text-foreground">Фильтр по АЗС</Label>
                <Select value={selectedStation} onValueChange={setSelectedStation}>
                  <SelectTrigger className="bg-input border-2 border-border text-foreground">
                    <SelectValue placeholder="Все АЗС" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все АЗС</SelectItem>
                    {uniqueStations.map((station) => (
                      <SelectItem key={station} value={station}>
                        {station}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Дата с</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-input border-2 border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Дата по</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-input border-2 border-border text-foreground"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Загрузка операций...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-border">
                    <TableHead className="text-foreground font-bold py-2">АЗС</TableHead>
                    <TableHead className="text-foreground font-bold py-2">Дата</TableHead>
                    <TableHead className="text-foreground font-bold py-2">Операция</TableHead>
                    <TableHead className="text-foreground font-bold text-right py-2">Литры</TableHead>
                    <TableHead className="text-foreground font-bold text-right py-2">Цена</TableHead>
                    <TableHead className="text-foreground font-bold text-right py-2 no-print">Сумма</TableHead>
                    <TableHead className="text-foreground font-bold text-right py-2">Баланс</TableHead>
                    <TableHead className="text-foreground font-bold py-2">Комментарий</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOperations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Операций не найдено
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedOperations.map((op) => (
                      <TableRow key={op.id} className="border-b border-border">
                        <TableCell className="text-foreground py-2">{op.station_name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm py-2">{op.operation_date}</TableCell>
                        <TableCell className="py-2">
                          <Badge className={getOperationColor(op.operation_type)}>
                            {op.operation_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground py-2">{op.quantity.toFixed(3)}</TableCell>
                        <TableCell className="text-right text-foreground py-2">{op.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-accent py-2 no-print">{op.amount.toFixed(2)} ₽</TableCell>
                        <TableCell className="text-right font-bold text-accent py-2">{op.balance.toFixed(3)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm py-2">{op.comment}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                </Table>
              </div>
            )}
            {filteredOperations.length > 0 && (
              <TablePagination
                currentPage={safeOpsPage}
                totalPages={opsTotalPages}
                pageSize={opsPageSize}
                totalItems={filteredOperations.length}
                onPageChange={setOpsPage}
                onPageSizeChange={(s) => { setOpsPageSize(s); setOpsPage(1); }}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}