import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useOperations } from '@/contexts/OperationsContext';
import { adminApi } from '@/utils/adminApi';
import { formatDateForAPI } from '@/utils/dateUtils';

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

interface ClientDashboardProps {
  clientLogin: string;
  onLogout: () => void;
}

export default function ClientDashboard({ clientLogin, onLogout }: ClientDashboardProps) {
  const navigate = useNavigate();
  const { addTransferOperations } = useOperations();
  const [isFromAdmin, setIsFromAdmin] = useState(false);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [cards, setCards] = useState<FuelCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const referrer = document.referrer;
    const fromAdmin = referrer.includes('/admin') || sessionStorage.getItem('fromAdmin') === 'true';
    setIsFromAdmin(fromAdmin);
    if (fromAdmin) {
      sessionStorage.setItem('fromAdmin', 'true');
    }
  }, []);

  const loadData = async () => {
    try {
      const [clientsData, cardsData, fuelTypesData] = await Promise.all([
        adminApi.clients.getAll(),
        adminApi.cards.getAll(),
        adminApi.fuelTypes.getAll()
      ]);
      
      const client = clientsData.find((c: any) => c.login === clientLogin);
      if (client) {
        setClientData({
          name: client.name,
          inn: client.inn,
          email: client.email,
          phone: client.phone
        });
      }
      
      const clientCards = cardsData
        .filter((card: any) => {
          const cardClient = clientsData.find((c: any) => c.id === card.client_id);
          return cardClient?.login === clientLogin;
        })
        .map((card: any) => {
          const fuelType = fuelTypesData.find((ft: any) => ft.id === card.fuel_type_id);
          const cardClient = clientsData.find((c: any) => c.id === card.client_id);
          return {
            id: card.id,
            card_code: card.card_code,
            card_index: card.card_index ?? 0,
            fuel_type: fuelType?.name || '',
            balance_liters: card.balance_liters,
            daily_limit: card.daily_limit || 0,
            status: card.status || 'активна',
            block_reason: card.block_reason || '',
            owner: cardClient?.name || ''
          };
        });
      
      setCards(clientCards);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientLogin]);

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [targetCardId, setTargetCardId] = useState<number | null>(null);
  const [newDailyLimit, setNewDailyLimit] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'активна' | 'заблокирована'>('all');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string>('all');
  const [cardSearch, setCardSearch] = useState('');

  const cardLabel = (card: { card_code: string; card_index: number }) =>
    `${card.card_code}/${card.card_index}`;

  const handleViewCardOperations = (cardId: number) => {
    navigate(`/card-operations?cardId=${cardId}`);
  };

  const handleBlockCard = (cardId: number) => {
    setSelectedCardId(cardId);
    setBlockReason('');
    setBlockDialogOpen(true);
  };

  const handleUnblockCard = (cardId: number) => {
    setSelectedCardId(cardId);
    setUnblockDialogOpen(true);
  };

  const handleTransferCard = (cardId: number) => {
    setSelectedCardId(cardId);
    setTransferAmount('');
    setTargetCardId(null);
    setTransferDialogOpen(true);
  };

  const handleEditLimit = (cardId: number) => {
    setSelectedCardId(cardId);
    const card = cards.find(c => c.id === cardId);
    setNewDailyLimit(card?.daily_limit.toString() || '');
    setLimitDialogOpen(true);
  };

  const confirmBlock = async () => {
    if (selectedCardId !== null) {
      try {
        await adminApi.cards.update({
          id: selectedCardId,
          status: 'заблокирована',
          block_reason: blockReason
        });
        
        await loadData();
      } catch (error) {
        console.error('Ошибка блокировки карты:', error);
      }
      setBlockDialogOpen(false);
    }
  };

  const confirmUnblock = async () => {
    if (selectedCardId !== null) {
      try {
        await adminApi.cards.update({
          id: selectedCardId,
          status: 'активна',
          block_reason: ''
        });
        
        await loadData();
      } catch (error) {
        console.error('Ошибка разблокировки карты:', error);
      }
      setUnblockDialogOpen(false);
    }
  };

  const confirmTransfer = async () => {
    if (selectedCardId !== null && targetCardId !== null && transferAmount) {
      const amount = parseFloat(transferAmount);
      const sourceCard = cards.find(c => c.id === selectedCardId);
      const targetCard = cards.find(c => c.id === targetCardId);
      
      if (sourceCard && targetCard && sourceCard.balance_liters >= amount) {
        try {
          const avgPrice = 52.50;
          const dateStr = formatDateForAPI();
          
          const debitOperation = {
            card_code: sourceCard.card_code,
            station_name: 'Склад',
            operation_date: dateStr,
            operation_type: 'списание',
            quantity: amount,
            price: avgPrice,
            amount: amount * avgPrice,
            comment: `Перемещение на карту ${cardLabel(targetCard)}`
          };
          
          const creditOperation = {
            card_code: targetCard.card_code,
            station_name: 'Склад',
            operation_date: dateStr,
            operation_type: 'оприходование',
            quantity: amount,
            price: avgPrice,
            amount: amount * avgPrice,
            comment: `Перемещение с карты ${cardLabel(sourceCard)}`
          };
          
          await Promise.all([
            adminApi.operations.create(debitOperation),
            adminApi.operations.create(creditOperation),
            adminApi.cards.update({
              id: selectedCardId,
              balance_liters: sourceCard.balance_liters - amount
            }),
            adminApi.cards.update({
              id: targetCardId,
              balance_liters: targetCard.balance_liters + amount
            })
          ]);
          
          setCards(cards.map(card => {
            if (card.id === selectedCardId) {
              return { ...card, balance_liters: card.balance_liters - amount };
            }
            if (card.id === targetCardId) {
              return { ...card, balance_liters: card.balance_liters + amount };
            }
            return card;
          }));
        } catch (error) {
          console.error('Ошибка перемещения топлива:', error);
        }
        setTransferDialogOpen(false);
      }
    }
  };

  const confirmLimitChange = async () => {
    if (selectedCardId !== null && newDailyLimit) {
      const limit = parseFloat(newDailyLimit);
      if (limit > 0) {
        try {
          await adminApi.cards.update({
            id: selectedCardId,
            daily_limit: limit
          });
          
          setCards(cards.map(card => 
            card.id === selectedCardId 
            ? { ...card, daily_limit: limit }
            : card
          ));
        } catch (error) {
          console.error('Ошибка изменения лимита:', error);
        }
        setLimitDialogOpen(false);
      }
    }
  };

  const selectedCard = cards.find(c => c.id === selectedCardId);
  const availableTargetCards = selectedCard 
    ? cards.filter(c => c.id !== selectedCardId && c.fuel_type === selectedCard.fuel_type && c.owner === selectedCard.owner)
    : [];

  const uniqueFuelTypes = Array.from(new Set(cards.map(card => card.fuel_type)));

  const filteredCards = cards
    .filter(card => {
      const matchesStatus = statusFilter === 'all' || card.status === statusFilter;
      const matchesFuelType = fuelTypeFilter === 'all' || card.fuel_type === fuelTypeFilter;
      const matchesSearch = cardSearch === '' || card.card_code.toLowerCase().includes(cardSearch.toLowerCase());
      return matchesStatus && matchesFuelType && matchesSearch;
    })
    .sort((a, b) => a.card_code.localeCompare(b.card_code));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background">
      <header className="bg-card border-b-4 border-accent shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Icon name="Fuel" size={32} className="text-accent" />
            <div>
              <h1 className="text-2xl font-bold text-accent">КАБИНЕТ КЛИЕНТА</h1>
              <p className="text-sm text-muted-foreground">СИСТЕМА УПРАВЛЕНИЯ ТОПЛИВНЫМИ КАРТАМИ</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isFromAdmin && (
              <Button 
                onClick={() => {
                  sessionStorage.removeItem('fromAdmin');
                  sessionStorage.removeItem('viewClientLogin');
                  navigate('/admin');
                }} 
                variant="outline" 
                className="border-2 border-primary text-foreground hover:bg-primary hover:text-primary-foreground"
              >
                <Icon name="ArrowLeft" size={20} className="mr-2" />
                Админпанель
              </Button>
            )}
            <Button onClick={onLogout} variant="outline" className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
              <Icon name="LogOut" size={20} className="mr-2" />
              Выход
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Загрузка данных...</p>
          </div>
        ) : clientData ? (
          <>
            <Card className="border-2 border-primary bg-card/95 backdrop-blur-sm">
              <CardContent className="py-3">
                <div className="flex items-center gap-6">
                  <Icon name="Building2" size={20} className="text-accent flex-shrink-0" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 flex-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">Клиент:</span>{' '}
                      <span className="font-semibold text-foreground">{clientData.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ИНН:</span>{' '}
                      <span className="font-semibold text-foreground">{clientData.inn}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>{' '}
                      <span className="font-semibold text-foreground">{clientData.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Телефон:</span>{' '}
                      <span className="font-semibold text-foreground">{clientData.phone}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

        <Card className="border-2 border-primary bg-card/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground flex items-center gap-2">
              <Icon name="CreditCard" size={28} className="text-accent" />
              Топливные карты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="card-search" className="text-sm text-foreground">Поиск по номеру</Label>
                  <Input
                    id="card-search"
                    placeholder="Введите номер карты"
                    value={cardSearch}
                    onChange={(e) => setCardSearch(e.target.value)}
                    className="bg-input border-2 border-border text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fuel-filter" className="text-sm text-foreground">Вид топлива</Label>
                  <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
                    <SelectTrigger id="fuel-filter" className="bg-input border-2 border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все виды</SelectItem>
                      {uniqueFuelTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="status-filter" className="text-sm text-foreground">Статус</Label>
                  <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as 'all' | 'активна' | 'заблокирована')}>
                    <SelectTrigger id="status-filter" className="bg-input border-2 border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все статусы</SelectItem>
                      <SelectItem value="активна">Активные</SelectItem>
                      <SelectItem value="заблокирована">Заблокированные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  Найдено карт: <strong className="text-accent">{filteredCards.length}</strong> из {cards.length}
                </div>
                {(cardSearch || fuelTypeFilter !== 'all' || statusFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCardSearch('');
                      setFuelTypeFilter('all');
                      setStatusFilter('all');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="X" size={16} className="mr-1" />
                    Сбросить фильтры
                  </Button>
                )}
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-border">
                  <TableHead className="text-foreground font-bold py-2">Номер карты</TableHead>
                  <TableHead className="text-foreground font-bold py-2">Вид топлива</TableHead>
                  <TableHead className="text-foreground font-bold text-right py-2">Баланс (л)</TableHead>
                  <TableHead className="text-foreground font-bold text-right py-2">Дневной лимит (л)</TableHead>
                  <TableHead className="text-foreground font-bold py-2">Статус</TableHead>
                  <TableHead className="text-foreground font-bold text-center py-2 no-print">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Карты не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCards.map((card) => (
                  <TableRow key={card.id} className="border-b border-border">
                    <TableCell className="font-mono py-2">
                      <div className="flex items-center gap-2">
                        <span className={card.card_code === '0000' ? 'bg-accent text-background px-1 rounded' : 'text-accent'}>
                          {cardLabel(card)}
                        </span>
                        {card.card_code === '0000' && (
                          <Icon name="Wallet" size={16} className="text-accent" title="Баланс" />
                        )}
                      </div>
                      {card.status === 'заблокирована' && card.block_reason && (
                        <p className="text-xs text-destructive mt-1">Причина: {card.block_reason}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground py-2">{card.fuel_type}</TableCell>
                    <TableCell className="text-right font-bold text-accent py-2">{card.balance_liters.toFixed(3)}</TableCell>
                    <TableCell className="text-right text-foreground py-2">
                      {card.daily_limit.toFixed(3)}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-2 h-6 w-6 p-0"
                        onClick={() => handleEditLimit(card.id)}
                      >
                        <Icon name="Pencil" size={14} />
                      </Button>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge className={card.status === 'активна' ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'}>
                        {card.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center py-2">
                      <div className="flex gap-1 justify-center flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground"
                          onClick={() => handleViewCardOperations(card.id)}
                        >
                          <Icon name="Eye" size={16} className="mr-1" />
                          Операции
                        </Button>
                        {card.status === 'активна' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleBlockCard(card.id)}
                          >
                            <Icon name="Lock" size={16} className="mr-1" />
                            Заблокировать
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            onClick={() => handleUnblockCard(card.id)}
                          >
                            <Icon name="Unlock" size={16} className="mr-1" />
                            Разблокировать
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground"
                          onClick={() => handleTransferCard(card.id)}
                          disabled={card.balance_liters === 0}
                        >
                          <Icon name="ArrowRightLeft" size={16} className="mr-1" />
                          Переместить
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Клиент не найден</p>
          </div>
        )}
      </main>

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заблокировать карту</DialogTitle>
            <DialogDescription>
              Карта {selectedCard ? cardLabel(selectedCard) : ''} будет заблокирована
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="block-reason">Причина блокировки</Label>
              <Textarea
                id="block-reason"
                placeholder="Укажите причину блокировки карты"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>Отмена</Button>
            <Button onClick={confirmBlock} disabled={!blockReason.trim()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Заблокировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unblockDialogOpen} onOpenChange={setUnblockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Разблокировать карту</DialogTitle>
            <DialogDescription>
              Карта {selectedCard ? cardLabel(selectedCard) : ''} будет разблокирована
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Вы уверены, что хотите разблокировать эту карту?
            </p>
            {selectedCard?.block_reason && (
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Причина блокировки:</strong> {selectedCard.block_reason}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnblockDialogOpen(false)}>Отмена</Button>
            <Button onClick={confirmUnblock} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Разблокировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переместить топливо</DialogTitle>
            <DialogDescription>
              Перемещение топлива с карты {selectedCard ? cardLabel(selectedCard) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCard && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Текущий баланс: <strong className="text-accent">{selectedCard.balance_liters.toFixed(2)} л</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Вид топлива: <strong>{selectedCard.fuel_type}</strong>
                </p>
              </div>
            )}
            {availableTargetCards.length === 0 ? (
              <p className="text-sm text-destructive">Нет доступных карт для перемещения с таким же владельцем и видом топлива</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="target-card">Целевая карта</Label>
                  <Select value={targetCardId?.toString()} onValueChange={(val) => setTargetCardId(parseInt(val))}>
                    <SelectTrigger id="target-card">
                      <SelectValue placeholder="Выберите карту" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTargetCards.map((card) => (
                        <SelectItem key={card.id} value={card.id.toString()}>
                          {cardLabel(card)} - {card.fuel_type} (Баланс: {card.balance_liters.toFixed(2)} л)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-amount">Количество литров</Label>
                  <Input
                    id="transfer-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedCard?.balance_liters}
                    placeholder="Введите количество литров"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Отмена</Button>
            <Button 
              onClick={confirmTransfer} 
              disabled={!targetCardId || !transferAmount || parseFloat(transferAmount) <= 0 || parseFloat(transferAmount) > (selectedCard?.balance_liters || 0)}
            >
              Переместить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить дневной лимит</DialogTitle>
            <DialogDescription>
              Карта {selectedCard ? cardLabel(selectedCard) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCard && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Текущий лимит: <strong className="text-accent">{selectedCard.daily_limit.toFixed(2)} л</strong>
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-limit">Новый дневной лимит (литров)</Label>
              <Input
                id="new-limit"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Введите новый лимит"
                value={newDailyLimit}
                onChange={(e) => setNewDailyLimit(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitDialogOpen(false)}>Отмена</Button>
            <Button 
              onClick={confirmLimitChange} 
              disabled={!newDailyLimit || parseFloat(newDailyLimit) <= 0}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}