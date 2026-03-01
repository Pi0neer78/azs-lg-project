import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import TablePagination from '@/components/ui/table-pagination';
import { adminApi } from '@/utils/adminApi';
import { formatDateForInput } from '@/utils/dateUtils';

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [fuelTypes, setFuelTypes] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculateDialogOpen, setRecalculateDialogOpen] = useState(false);
  const [recalculateCardId, setRecalculateCardId] = useState<number | null>(null);
  const [recalculateResult, setRecalculateResult] = useState<{oldBalance: number, newBalance: number} | null>(null);
  const [topupDialogOpen, setTopupDialogOpen] = useState(false);
  const [topupCardId, setTopupCardId] = useState<number | null>(null);
  const [topupQuantity, setTopupQuantity] = useState('');
  const [topupPrice, setTopupPrice] = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [topupComment, setTopupComment] = useState('');
  const [topupSuccessDialog, setTopupSuccessDialog] = useState<{open: boolean, card: any, quantity: number}>({open: false, card: null, quantity: 0});
  const [blockCardDialogOpen, setBlockCardDialogOpen] = useState(false);
  const [unblockCardDialogOpen, setUnblockCardDialogOpen] = useState(false);
  const [blockCardId, setBlockCardId] = useState<number | null>(null);
  const [blockCardReason, setBlockCardReason] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadClients(),
      loadStations(),
      loadFuelTypes(),
      loadCards(),
      loadOperations()
    ]);
    setLoading(false);
  };

  const loadClients = async () => {
    try {
      const data = await adminApi.clients.getAll();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadStations = async () => {
    try {
      const data = await adminApi.stations.getAll();
      setStations(data);
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  };

  const loadFuelTypes = async () => {
    try {
      const data = await adminApi.fuelTypes.getAll();
      setFuelTypes(data);
    } catch (error) {
      console.error('Error loading fuel types:', error);
    }
  };

  const loadCards = async () => {
    try {
      const data = await adminApi.cards.getAll();
      setCards(data);
    } catch (error) {
      console.error('Error loading cards:', error);
    }
  };

  const loadOperations = async () => {
    try {
      const data = await adminApi.operations.getAll();
      setOperations(data);
    } catch (error) {
      console.error('Error loading operations:', error);
    }
  };

  const [editingClient, setEditingClient] = useState<any>(null);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({inn: '', name: '', address: '', phone: '', email: '', login: '', password: '', admin: false, operator: false});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [filterClientType, setFilterClientType] = useState<string>('client');
  const [clientSearch, setClientSearch] = useState<string>('');

  const handleDeleteClient = async (id: number) => {
    if (confirm('Удалить клиента?')) {
      try {
        await adminApi.clients.delete(id);
        loadClients();
      } catch (error) {
        console.error('Error deleting client:', error);
      }
    }
  };

  const handleEditClient = (client: any) => {
    setEditingClient(client);
    setIsClientDialogOpen(true);
  };

  const handleSaveClient = async () => {
    if (editingClient) {
      try {
        await adminApi.clients.update(editingClient);
        loadClients();
        setIsClientDialogOpen(false);
        setEditingClient(null);
      } catch (error) {
        console.error('Error updating client:', error);
      }
    }
  };

  const handleCreateClient = async () => {
    try {
      await adminApi.clients.create(newClient);
      loadClients();
      setNewClient({inn: '', name: '', address: '', phone: '', email: '', login: '', password: '', admin: false, operator: false});
      setIsAddClientDialogOpen(false);
    } catch (error) {
      console.error('Error creating client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      if (errorMessage.includes('unique constraint')) {
        alert('Ошибка: Клиент с таким логином уже существует. Пожалуйста, выберите другой логин.');
      } else {
        alert(`Ошибка при создании клиента: ${errorMessage}`);
      }
    }
  };

  const handleRecalculateBalance = (cardId: number) => {
    setRecalculateCardId(cardId);
    setRecalculateResult(null);
    setRecalculateDialogOpen(true);
  };

  const handleTopupCard = (cardId: number) => {
    setTopupCardId(cardId);
    setTopupQuantity('');
    setTopupPrice('');
    setTopupAmount('');
    setTopupComment('');
    setTopupDialogOpen(true);
  };

  const handleBlockCard = (cardId: number) => {
    setBlockCardId(cardId);
    setBlockCardReason('');
    setBlockCardDialogOpen(true);
  };

  const handleUnblockCard = (cardId: number) => {
    setBlockCardId(cardId);
    setUnblockCardDialogOpen(true);
  };

  const confirmBlockCard = async () => {
    if (blockCardId !== null) {
      try {
        await adminApi.cards.update({
          id: blockCardId,
          status: 'заблокирована',
          block_reason: blockCardReason
        });
        await loadCards();
        setBlockCardDialogOpen(false);
        setBlockCardId(null);
        setBlockCardReason('');
      } catch (error) {
        console.error('Error blocking card:', error);
      }
    }
  };

  const confirmUnblockCard = async () => {
    if (blockCardId !== null) {
      try {
        await adminApi.cards.update({
          id: blockCardId,
          status: 'активна',
          block_reason: ''
        });
        await loadCards();
        setUnblockCardDialogOpen(false);
        setBlockCardId(null);
      } catch (error) {
        console.error('Error unblocking card:', error);
      }
    }
  };

  const handleTopupQuantityChange = (value: string) => {
    setTopupQuantity(value);
    if (value && topupPrice) {
      const amount = (parseFloat(value) * parseFloat(topupPrice)).toFixed(2);
      setTopupAmount(amount);
    }
  };

  const handleTopupPriceChange = (value: string) => {
    setTopupPrice(value);
    if (value && topupQuantity) {
      const amount = (parseFloat(topupQuantity) * parseFloat(value)).toFixed(2);
      setTopupAmount(amount);
    }
  };

  const handleTopupAmountChange = (value: string) => {
    setTopupAmount(value);
    if (value && topupQuantity) {
      const price = (parseFloat(value) / parseFloat(topupQuantity)).toFixed(2);
      setTopupPrice(price);
    }
  };

  const confirmTopup = async () => {
    if (topupCardId === null || !topupQuantity || !topupPrice || !topupAmount) return;

    const card = cards.find(c => c.id === topupCardId);
    if (!card) return;

    try {
      const dateStr = formatDateForInput();
      
      const topupOperation = {
        card_code: card.card_code,
        station_name: 'Склад',
        operation_date: dateStr,
        operation_type: 'пополнение',
        quantity: parseFloat(topupQuantity),
        price: parseFloat(topupPrice),
        amount: parseFloat(topupAmount),
        comment: topupComment || 'Пополнение баланса'
      };
      
      await adminApi.operations.create(topupOperation);
      
      const newBalance = card.balance_liters + parseFloat(topupQuantity);
      await adminApi.cards.update({
        id: topupCardId,
        balance_liters: newBalance
      });
      
      await loadCards();
      await loadOperations();
      
      setTopupDialogOpen(false);
      setTopupSuccessDialog({
        open: true,
        card: {
          ...card,
          balance_liters: newBalance
        },
        quantity: parseFloat(topupQuantity)
      });
    } catch (error) {
      console.error('Error topping up card:', error);
    }
  };

  const confirmRecalculateBalance = async () => {
    if (recalculateCardId === null) return;

    const card = cards.find(c => c.id === recalculateCardId);
    if (!card) return;

    const cardOperations = operations
      .filter(op => op.card_code === card.card_code)
      .sort((a, b) => new Date(a.operation_date).getTime() - new Date(b.operation_date).getTime());

    let calculatedBalance = 0;
    cardOperations.forEach(op => {
      if (op.operation_type === 'пополнение' || op.operation_type === 'оприходование') {
        calculatedBalance += op.quantity;
      } else if (op.operation_type === 'заправка' || op.operation_type === 'списание') {
        calculatedBalance -= op.quantity;
      }
    });

    const oldBalance = card.balance_liters;
    setRecalculateResult({ oldBalance, newBalance: calculatedBalance });

    try {
      await adminApi.cards.update({
        id: recalculateCardId,
        balance_liters: calculatedBalance
      });
      await loadCards();
    } catch (error) {
      console.error('Error updating card balance:', error);
    }
  };

  const closeRecalculateDialog = () => {
    setRecalculateDialogOpen(false);
    setRecalculateCardId(null);
    setRecalculateResult(null);
  };



  const [editingStation, setEditingStation] = useState<any>(null);
  const [isStationDialogOpen, setIsStationDialogOpen] = useState(false);
  const [isAddStationDialogOpen, setIsAddStationDialogOpen] = useState(false);
  const [newStation, setNewStation] = useState({name: '', code_1c: '', address: ''});

  const handleDeleteStation = async (id: number) => {
    if (confirm('Удалить АЗС?')) {
      try {
        await adminApi.stations.delete(id);
        loadStations();
      } catch (error) {
        console.error('Error deleting station:', error);
      }
    }
  };

  const handleEditStation = (station: any) => {
    setEditingStation(station);
    setIsStationDialogOpen(true);
  };

  const handleSaveStation = async () => {
    if (editingStation) {
      try {
        await adminApi.stations.update(editingStation);
        loadStations();
        setIsStationDialogOpen(false);
        setEditingStation(null);
      } catch (error) {
        console.error('Error updating station:', error);
      }
    }
  };

  const handleCreateStation = async () => {
    try {
      await adminApi.stations.create(newStation);
      loadStations();
      setNewStation({name: '', code_1c: '', address: ''});
      setIsAddStationDialogOpen(false);
    } catch (error) {
      console.error('Error creating station:', error);
    }
  };

  const handlePrintStations = () => {
    window.print();
  };

  const [editingFuelType, setEditingFuelType] = useState<any>(null);
  const [isFuelTypeDialogOpen, setIsFuelTypeDialogOpen] = useState(false);
  const [isAddFuelTypeDialogOpen, setIsAddFuelTypeDialogOpen] = useState(false);
  const [newFuelType, setNewFuelType] = useState({name: '', code_1c: ''});

  const handleDeleteFuelType = async (id: number) => {
    if (confirm('Удалить вид топлива?')) {
      try {
        await adminApi.fuelTypes.delete(id);
        loadFuelTypes();
      } catch (error) {
        console.error('Error deleting fuel type:', error);
      }
    }
  };

  const handleEditFuelType = (fuelType: any) => {
    setEditingFuelType(fuelType);
    setIsFuelTypeDialogOpen(true);
  };

  const handleSaveFuelType = async () => {
    if (editingFuelType) {
      try {
        await adminApi.fuelTypes.update(editingFuelType);
        loadFuelTypes();
        setIsFuelTypeDialogOpen(false);
        setEditingFuelType(null);
      } catch (error) {
        console.error('Error updating fuel type:', error);
      }
    }
  };

  const handleCreateFuelType = async () => {
    try {
      await adminApi.fuelTypes.create(newFuelType);
      loadFuelTypes();
      setNewFuelType({name: '', code_1c: ''});
      setIsAddFuelTypeDialogOpen(false);
    } catch (error) {
      console.error('Error creating fuel type:', error);
    }
  };



  const [editingCard, setEditingCard] = useState<any>(null);
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [newCard, setNewCard] = useState({card_code: '', client_id: '', fuel_type_id: '', balance_liters: 0, pin_code: '', status: 'активна', block_reason: '', daily_limit: 0});
  const [cardSuccessDialog, setCardSuccessDialog] = useState<{open: boolean, card: any}>({open: false, card: null});
  const [fuelTypeWarningDialog, setFuelTypeWarningDialog] = useState(false);
  const [filterCardClient, setFilterCardClient] = useState<string>('all');
  const [filterCardFuelType, setFilterCardFuelType] = useState<string>('all');

  const handleDeleteCard = async (id: number) => {
    if (confirm('Удалить карту?')) {
      try {
        await adminApi.cards.delete(id);
        loadCards();
      } catch (error) {
        console.error('Error deleting card:', error);
      }
    }
  };

  const handleEditCard = (card: any) => {
    setEditingCard(card);
    setIsCardDialogOpen(true);
  };

  const handleSaveCard = async () => {
    if (editingCard) {
      try {
        await adminApi.cards.update(editingCard);
        loadCards();
        setIsCardDialogOpen(false);
        setEditingCard(null);
      } catch (error) {
        console.error('Error updating card:', error);
      }
    }
  };

  const handleFuelTypeChange = (value: string) => {
    if (editingCard && editingCard.balance_liters !== 0) {
      setFuelTypeWarningDialog(true);
    } else {
      setEditingCard({...editingCard, fuel_type_id: parseInt(value)});
    }
  };

  const handleCreateCard = async () => {
    const selectedClient = clients.find(c => c.id.toString() === newCard.client_id);
    const selectedFuelType = fuelTypes.find(f => f.id.toString() === newCard.fuel_type_id);
    
    if (!selectedClient || !selectedFuelType) return;
    
    try {
      await adminApi.cards.create({...newCard, status: 'активна', block_reason: ''});
      
      if (newCard.balance_liters > 0) {
        const dateStr = formatDateForInput();
        
        const initialOperation = {
          card_code: newCard.card_code,
          station_name: 'Склад',
          operation_date: dateStr,
          operation_type: 'пополнение',
          quantity: newCard.balance_liters,
          price: 0,
          amount: 0,
          comment: 'Первоначальное пополнение карты'
        };
        
        await adminApi.operations.create(initialOperation);
      }
      
      await loadCards();
      await loadOperations();
      
      const cardToShow = {
        client_name: selectedClient.name,
        fuel_type: selectedFuelType.name,
        balance_liters: newCard.balance_liters,
        card_code: newCard.card_code,
        pin_code: newCard.pin_code
      };
      
      setNewCard({card_code: '', client_id: '', fuel_type_id: '', balance_liters: 0, pin_code: '', status: 'активна', block_reason: '', daily_limit: 0});
      setIsAddCardDialogOpen(false);
      setCardSuccessDialog({open: true, card: cardToShow});
    } catch (error) {
      console.error('Error creating card:', error);
    }
  };

  const [cardsPage, setCardsPage] = useState(1);
  const [cardsPageSize, setCardsPageSize] = useState(20);
  const [opsPage, setOpsPage] = useState(1);
  const [opsPageSize, setOpsPageSize] = useState(20);

  const filteredCards = cards
    .filter(card => {
      if (filterCardClient !== 'all' && card.client_name !== filterCardClient) return false;
      if (filterCardFuelType !== 'all' && card.fuel_type !== filterCardFuelType) return false;
      return true;
    })
    .sort((a, b) => a.card_code.localeCompare(b.card_code));

  const nonAdminClientNames = clients.filter(c => !c.admin).map(c => c.name);
  const uniqueClientNames = Array.from(new Set(cards.map(c => c.client_name).filter(name => nonAdminClientNames.includes(name))));
  const uniqueCardFuelTypes = Array.from(new Set(cards.map(c => c.fuel_type)));

  const cardsTotalPages = Math.ceil(filteredCards.length / cardsPageSize) || 1;
  const safeCardsPage = Math.min(cardsPage, cardsTotalPages);
  const pagedCards = filteredCards.slice((safeCardsPage - 1) * cardsPageSize, safeCardsPage * cardsPageSize);



  const [editingOperation, setEditingOperation] = useState<any>(null);
  const [isOperationDialogOpen, setIsOperationDialogOpen] = useState(false);
  const [isAddOperationDialogOpen, setIsAddOperationDialogOpen] = useState(false);
  const [newOperation, setNewOperation] = useState({card_code: '', station_name: '', operation_date: '', operation_type: 'пополнение', quantity: 0, price: 0, amount: 0, comment: ''});
  const [filterCard, setFilterCard] = useState<string>('all');
  const [filterStation, setFilterStation] = useState<string>('all');
  const [filterOperationType, setFilterOperationType] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [balanceChangeDialog, setBalanceChangeDialog] = useState<{open: boolean, cardCode: string, oldBalance: number, newBalance: number}>({open: false, cardCode: '', oldBalance: 0, newBalance: 0});



  const handleDeleteOperation = async (id: number) => {
    if (confirm('Удалить операцию?')) {
      try {
        await adminApi.operations.delete(id);
        loadOperations();
        loadCards();
      } catch (error) {
        console.error('Error deleting operation:', error);
      }
    }
  };

  const handleEditOperation = (operation: any) => {
    setEditingOperation(operation);
    setIsOperationDialogOpen(true);
  };

  const calculateCardBalance = (cardCode: string, updatedOperations: any[]) => {
    return updatedOperations
      .filter(op => op.card_code === cardCode)
      .reduce((balance, op) => {
        if (op.operation_type === 'пополнение' || op.operation_type === 'оприходование') {
          return balance + op.quantity;
        } else if (op.operation_type === 'заправка' || op.operation_type === 'списание') {
          return balance - op.quantity;
        }
        return balance;
      }, 0);
  };

  const handleSaveOperation = async () => {
    if (editingOperation) {
      try {
        await adminApi.operations.update(editingOperation);
        await loadOperations();
        await loadCards();
        setIsOperationDialogOpen(false);
        setEditingOperation(null);
      } catch (error) {
        console.error('Error updating operation:', error);
      }
    }
  };

  const handleCreateOperation = async () => {
    try {
      await adminApi.operations.create(newOperation);
      await loadOperations();
      await loadCards();
      setNewOperation({card_code: '', station_name: '', operation_date: '', operation_type: 'пополнение', quantity: 0, price: 0, amount: 0, comment: ''});
      setIsAddOperationDialogOpen(false);
    } catch (error) {
      console.error('Error creating operation:', error);
    }
  };

  const filteredOperations = operations.filter(op => {
    if (filterCard !== 'all' && op.card_code !== filterCard) return false;
    if (filterStation !== 'all' && op.station_name !== filterStation) return false;
    if (filterOperationType !== 'all' && op.operation_type !== filterOperationType) return false;
    const matchesDateFrom = !filterDateFrom || op.operation_date >= filterDateFrom;
    const matchesDateTo = !filterDateTo || op.operation_date <= filterDateTo + ' 23:59';
    return matchesDateFrom && matchesDateTo;
  });

  const opsTotalPages = Math.ceil(filteredOperations.length / opsPageSize) || 1;
  const safeOpsPage = Math.min(opsPage, opsTotalPages);
  const pagedOperations = filteredOperations.slice((safeOpsPage - 1) * opsPageSize, safeOpsPage * opsPageSize);

  const uniqueCardCodes = Array.from(new Set(operations.map(o => o.card_code)));
  const uniqueStationNames = Array.from(new Set(operations.map(o => o.station_name)));
  const uniqueOperationTypes = Array.from(new Set(operations.map(o => o.operation_type)));

  const handlePrintClients = () => {
    window.print();
  };

  const handlePrintCards = () => {
    window.print();
  };

  const handlePrintOperations = () => {
    window.print();
  };

  const handlePrintFuelTypes = () => {
    window.print();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background">
      <header className="bg-card border-b-4 border-accent shadow-lg no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Icon name="Shield" className="w-8 h-8 text-accent" />
              <div>
                <h1 className="text-2xl font-bold text-accent">Панель администратора</h1>
                <p className="text-sm text-muted-foreground">Управление системой</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.open('/admin-manual.html', '_blank')} 
                variant="outline" 
                className="flex items-center gap-2 border-2 border-primary text-foreground hover:bg-primary hover:text-primary-foreground"
              >
                <Icon name="BookOpen" className="w-4 h-4" />
                Инструкция
              </Button>
              <Button onClick={onLogout} variant="outline" className="flex items-center gap-2 border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                <Icon name="LogOut" className="w-4 h-4" />
                Выход
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="no-print bg-card/50 border-2 border-primary">
            <TabsTrigger value="clients" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">Клиенты</TabsTrigger>
            <TabsTrigger value="cards" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">Карты</TabsTrigger>
            <TabsTrigger value="operations" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">Операции</TabsTrigger>
            <TabsTrigger value="stations" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">АЗС</TabsTrigger>
            <TabsTrigger value="fuel-types" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">Виды топлива</TabsTrigger>
          </TabsList>

          <TabsContent value="clients">
            <Card className="border-2 border-primary bg-card/95 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Icon name="Users" className="text-accent" />
                    Клиенты
                  </CardTitle>
                  <div className="flex gap-2 items-center flex-wrap">
                    <div className="flex rounded-md border-2 border-border overflow-hidden">
                      <button
                        onClick={() => setFilterClientType('client')}
                        className={`px-4 py-1.5 text-sm font-semibold transition-colors ${filterClientType === 'client' ? 'bg-accent text-accent-foreground' : 'bg-card text-foreground hover:bg-secondary'}`}
                      >
                        Клиенты
                      </button>
                      <button
                        onClick={() => setFilterClientType('admin')}
                        className={`px-4 py-1.5 text-sm font-semibold transition-colors border-l-2 border-border ${filterClientType === 'admin' ? 'bg-accent text-accent-foreground' : 'bg-card text-foreground hover:bg-secondary'}`}
                      >
                        Администраторы
                      </button>
                    </div>
                    <div className="relative">
                      <Icon name="Search" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Поиск по ИНН или названию..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="h-8 pl-8 pr-3 rounded-md border-2 border-border bg-input text-foreground text-sm outline-none focus:border-accent w-56"
                      />
                    </div>
                    <Button onClick={handlePrintClients} variant="outline" size="sm" className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                      <Icon name="Printer" className="w-4 h-4 mr-2" />
                      Печать
                    </Button>
                    <Dialog open={isAddClientDialogOpen} onOpenChange={setIsAddClientDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                          <Icon name="Plus" className="w-4 h-4 mr-2" />
                          Добавить
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-card border-2 border-primary">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">Добавить клиента</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-inn" className="text-right text-foreground">
                              ИНН <span className="text-destructive">*</span>
                            </Label>
                            <Input id="new-inn" value={newClient.inn} onChange={(e) => setNewClient({...newClient, inn: e.target.value})} className="col-span-3" required />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-name" className="text-right text-foreground">Название</Label>
                            <Input id="new-name" value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-address" className="text-right text-foreground">Адрес</Label>
                            <Input id="new-address" value={newClient.address} onChange={(e) => setNewClient({...newClient, address: e.target.value})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-phone" className="text-right text-foreground">
                              Телефон <span className="text-destructive">*</span>
                            </Label>
                            <Input id="new-phone" value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: e.target.value})} className="col-span-3" required />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-email" className="text-right text-foreground">
                              Email <span className="text-destructive">*</span>
                            </Label>
                            <Input id="new-email" type="email" value={newClient.email} onChange={(e) => setNewClient({...newClient, email: e.target.value})} className="col-span-3" required />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-login" className="text-right text-foreground">Логин</Label>
                            <Input id="new-login" value={newClient.login} onChange={(e) => setNewClient({...newClient, login: e.target.value})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-password" className="text-right text-foreground">Пароль</Label>
                            <div className="col-span-3 relative">
                              <Input 
                                id="new-password" 
                                type={showNewPassword ? "text" : "password"} 
                                value={newClient.password} 
                                onChange={(e) => setNewClient({...newClient, password: e.target.value})} 
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                <Icon name={showNewPassword ? "EyeOff" : "Eye"} className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-admin" className="text-right text-foreground">Это администратор</Label>
                            <div className="col-span-3 flex items-center">
                              <input 
                                id="new-admin" 
                                type="checkbox" 
                                checked={newClient.admin} 
                                onChange={(e) => setNewClient({...newClient, admin: e.target.checked, operator: e.target.checked ? newClient.operator : false})} 
                                className="w-5 h-5 accent-accent cursor-pointer"
                              />
                              <span className="ml-3 text-sm text-muted-foreground">Отметьте, если это администратор</span>
                            </div>
                          </div>
                          {newClient.admin && (
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="new-operator" className="text-right text-foreground">Оператор АЗС</Label>
                              <div className="col-span-3 flex items-center gap-3">
                                <input
                                  id="new-operator"
                                  type="checkbox"
                                  checked={newClient.operator}
                                  onChange={(e) => setNewClient({...newClient, operator: e.target.checked})}
                                  className="w-5 h-5 accent-accent cursor-pointer"
                                />
                                <span className="text-sm text-muted-foreground">Доступ только к панели оператора АЗС</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddClientDialogOpen(false)} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">Отмена</Button>
                          <Button 
                            onClick={handleCreateClient} 
                            disabled={!newClient.inn || !newClient.phone || !newClient.email || !newClient.name || !newClient.login || !newClient.password}
                            className="bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Создать
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-border">
                      <TableHead className="text-foreground font-bold py-2">ИНН</TableHead>
                      <TableHead className="text-foreground font-bold py-2">Название</TableHead>
                      <TableHead className="text-foreground font-bold py-2">Адрес</TableHead>
                      <TableHead className="text-foreground font-bold py-2">Телефон</TableHead>
                      <TableHead className="text-foreground font-bold py-2">Email</TableHead>
                      <TableHead className="text-foreground font-bold py-2">Логин</TableHead>
                      <TableHead className="text-foreground font-bold py-2">Тип</TableHead>
                      <TableHead className="text-foreground font-bold py-2">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Загрузка...
                        </TableCell>
                      </TableRow>
                    ) : clients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Нет клиентов
                        </TableCell>
                      </TableRow>
                    ) : (
                      clients
                        .filter(client => {
                          if (filterClientType === 'admin' && !client.admin) return false;
                          if (filterClientType === 'client' && client.admin) return false;
                          if (clientSearch.trim()) {
                            const q = clientSearch.trim().toLowerCase();
                            if (!client.inn?.toLowerCase().includes(q) && !client.name?.toLowerCase().includes(q)) return false;
                          }
                          return true;
                        })
                        .map((client) => (
                      <TableRow key={client.id} className="border-b border-border">
                        <TableCell className="font-mono text-foreground py-2">{client.inn}</TableCell>
                        <TableCell 
                          className="font-medium text-accent cursor-pointer hover:underline transition-all py-2"
                          onClick={() => {
                            sessionStorage.setItem('fromAdmin', 'true');
                            sessionStorage.setItem('viewClientLogin', client.login);
                            navigate(client.admin ? '/admin' : '/client');
                          }}
                          title={client.admin ? "Перейти в админпанель" : "Перейти в кабинет клиента"}
                        >
                          {client.name}
                        </TableCell>
                        <TableCell className="text-foreground py-2">{client.address}</TableCell>
                        <TableCell className="text-foreground py-2">{client.phone}</TableCell>
                        <TableCell className="text-foreground py-2">{client.email}</TableCell>
                        <TableCell className="font-mono text-foreground py-2">{client.login}</TableCell>
                        <TableCell className="py-2">
                          <Badge className={client.admin ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}>
                            {client.admin ? 'Админ' : 'Клиент'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleEditClient(client)} className="h-7 w-7 p-0 border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                              <Icon name="Pencil" className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteClient(client.id)} className="h-7 w-7 p-0">
                              <Icon name="Trash2" className="w-3 h-3" />
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
          </TabsContent>

          <TabsContent value="cards">
            <Card className="border-2 border-primary bg-card/95 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Icon name="CreditCard" className="text-accent" />
                    Карты
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={handlePrintCards} variant="outline" size="sm" className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                      <Icon name="Printer" className="w-4 h-4 mr-2" />
                      Печать
                    </Button>
                    <Dialog open={isAddCardDialogOpen} onOpenChange={setIsAddCardDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                          <Icon name="Plus" className="w-4 h-4 mr-2" />
                          Добавить
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-card border-2 border-primary">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">Добавить карту</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-card-code" className="text-right text-foreground">Код карты</Label>
                            <Input id="new-card-code" value={newCard.card_code} onChange={(e) => setNewCard({...newCard, card_code: e.target.value})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-card-client" className="text-right text-foreground">Клиент</Label>
                            <Select value={newCard.client_id} onValueChange={(value) => setNewCard({...newCard, client_id: value})}>
                              <SelectTrigger id="new-card-client" className="col-span-3">
                                <SelectValue placeholder="Выберите клиента" />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.filter(client => !client.admin).map((client) => (
                                  <SelectItem key={client.id} value={client.id.toString()}>
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-card-fuel" className="text-right text-foreground">Вид топлива</Label>
                            <Select value={newCard.fuel_type_id} onValueChange={(value) => setNewCard({...newCard, fuel_type_id: value})}>
                              <SelectTrigger id="new-card-fuel" className="col-span-3">
                                <SelectValue placeholder="Выберите вид топлива" />
                              </SelectTrigger>
                              <SelectContent>
                                {fuelTypes.map((fuelType) => (
                                  <SelectItem key={fuelType.id} value={fuelType.id.toString()}>
                                    {fuelType.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-card-balance" className="text-right text-foreground">Баланс (л)</Label>
                            <Input id="new-card-balance" type="number" value={newCard.balance_liters} onChange={(e) => setNewCard({...newCard, balance_liters: parseFloat(e.target.value)})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-card-pin" className="text-right text-foreground">PIN-код</Label>
                            <Input id="new-card-pin" type="password" value={newCard.pin_code} onChange={(e) => setNewCard({...newCard, pin_code: e.target.value})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-card-daily-limit" className="text-right text-foreground">Дневной лимит (л)</Label>
                            <Input id="new-card-daily-limit" type="number" step="0.001" placeholder="0 = без лимита" value={newCard.daily_limit} onChange={(e) => setNewCard({...newCard, daily_limit: parseFloat(e.target.value) || 0})} className="col-span-3" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddCardDialogOpen(false)} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">Отмена</Button>
                          <Button onClick={handleCreateCard} disabled={!newCard.card_code || !newCard.client_id || !newCard.fuel_type_id || !newCard.pin_code} className="bg-accent text-accent-foreground hover:bg-accent/90">Создать</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-foreground">Клиент</Label>
                    <Select value={filterCardClient} onValueChange={setFilterCardClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все клиенты" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все клиенты</SelectItem>
                        {uniqueClientNames.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground">Вид топлива</Label>
                    <Select value={filterCardFuelType} onValueChange={setFilterCardFuelType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все виды топлива" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все виды топлива</SelectItem>
                        {uniqueCardFuelTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-border">
                      <TableHead className="text-foreground font-bold">Код карты</TableHead>
                      <TableHead className="text-foreground font-bold">Клиент</TableHead>
                      <TableHead className="text-foreground font-bold">Вид топлива</TableHead>
                      <TableHead className="text-foreground font-bold">Баланс (л)</TableHead>
                      <TableHead className="text-foreground font-bold">Дневной лимит (л)</TableHead>
                      <TableHead className="text-foreground font-bold">Статус</TableHead>
                      <TableHead className="text-foreground font-bold">PIN-код</TableHead>
                      <TableHead className="text-foreground font-bold">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedCards.map((card) => (
                      <TableRow key={card.id} className="border-b border-border">
                        <TableCell className="font-mono py-1">
                          <div className="flex items-center gap-2">
                            <span className={card.card_code === '0000' ? 'bg-accent text-background px-1 rounded' : 'text-accent'}>
                              {card.card_code}
                            </span>
                            {card.card_code === '0000' && (
                              <Icon name="Wallet" size={16} className="text-accent" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground py-1">{card.client_name}</TableCell>
                        <TableCell className="text-foreground py-1">{card.fuel_type}</TableCell>
                        <TableCell className="font-bold text-accent py-1">{card.balance_liters.toFixed(3)}</TableCell>
                        <TableCell className="text-foreground py-1">
                          {card.daily_limit > 0 ? card.daily_limit.toFixed(3) : <span className="text-muted-foreground">без лимита</span>}
                        </TableCell>
                        <TableCell className="py-1">
                          <Badge className={card.status === 'активна' ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'}>
                            {card.status || 'активна'}
                          </Badge>
                          {card.block_reason && (
                            <span className="text-xs text-muted-foreground block mt-1" title={card.block_reason}>
                              {card.block_reason.length > 20 ? card.block_reason.substring(0, 20) + '...' : card.block_reason}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground py-1">{card.pin_code}</TableCell>
                        <TableCell className="py-1">
                          <div className="flex gap-1">
                            <Button size="icon" variant="outline" onClick={() => handleTopupCard(card.id)} className="h-7 w-7 border-2 border-primary text-foreground hover:bg-primary hover:text-primary-foreground" title="Пополнить">
                              <Icon name="Plus" className="w-3 h-3" />
                            </Button>
                            {card.status === 'активна' ? (
                              <Button size="icon" variant="outline" onClick={() => handleBlockCard(card.id)} className="h-7 w-7 border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" title="Заблокировать">
                                <Icon name="Lock" className="w-3 h-3" />
                              </Button>
                            ) : (
                              <Button size="icon" variant="outline" onClick={() => handleUnblockCard(card.id)} className="h-7 w-7 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground" title="Разблокировать">
                                <Icon name="Unlock" className="w-3 h-3" />
                              </Button>
                            )}
                            <Button size="icon" variant="outline" onClick={() => handleEditCard(card)} className="h-7 w-7 border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground" title="Редактировать">
                              <Icon name="Pencil" className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="outline" onClick={() => handleRecalculateBalance(card.id)} className="h-7 w-7 border-2 border-primary text-foreground hover:bg-primary hover:text-primary-foreground" title="Пересчитать баланс">
                              <Icon name="RefreshCw" className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => handleDeleteCard(card.id)} className="h-7 w-7" title="Удалить">
                              <Icon name="Trash2" className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <TablePagination
                currentPage={safeCardsPage}
                totalPages={cardsTotalPages}
                pageSize={cardsPageSize}
                totalItems={filteredCards.length}
                onPageChange={setCardsPage}
                onPageSizeChange={(s) => { setCardsPageSize(s); setCardsPage(1); }}
              />
            </Card>
          </TabsContent>

          <TabsContent value="operations">
            <Card className="border-2 border-primary bg-card/95 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Icon name="History" className="text-accent" />
                    Операции
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={handlePrintOperations} variant="outline" size="sm" className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                      <Icon name="Printer" className="w-4 h-4 mr-2" />
                      Печать
                    </Button>
                    <Dialog open={isAddOperationDialogOpen} onOpenChange={setIsAddOperationDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                          <Icon name="Plus" className="w-4 h-4 mr-2" />
                          Добавить
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-card border-2 border-primary">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">Добавить операцию</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-op-card" className="text-right text-foreground">Карта</Label>
                            <Select value={newOperation.card_code} onValueChange={(value) => setNewOperation({...newOperation, card_code: value})}>
                              <SelectTrigger id="new-op-card" className="col-span-3">
                                <SelectValue placeholder="Выберите карту" />
                              </SelectTrigger>
                              <SelectContent>
                                {cards.map((card) => (
                                  <SelectItem key={card.id} value={card.card_code}>
                                    {card.card_code} - {card.client_name} ({card.fuel_type})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-op-station" className="text-right text-foreground">АЗС</Label>
                            <Select value={newOperation.station_name} onValueChange={(value) => setNewOperation({...newOperation, station_name: value})}>
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Выберите АЗС" />
                              </SelectTrigger>
                              <SelectContent>
                                {stations.map((station) => (
                                  <SelectItem key={station.id} value={station.name}>{station.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-op-date" className="text-right text-foreground">Дата</Label>
                            <Input id="new-op-date" type="datetime-local" value={newOperation.operation_date} onChange={(e) => setNewOperation({...newOperation, operation_date: e.target.value})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-op-type" className="text-right text-foreground">Тип операции</Label>
                            <Select value={newOperation.operation_type} onValueChange={(value) => setNewOperation({...newOperation, operation_type: value})}>
                              <SelectTrigger className="col-span-3">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="пополнение">Пополнение</SelectItem>
                                <SelectItem value="заправка">Заправка</SelectItem>
                                <SelectItem value="списание">Списание</SelectItem>
                                <SelectItem value="оприходование">Оприходование</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-op-quantity" className="text-right text-foreground">Литры</Label>
                            <Input id="new-op-quantity" type="number" value={newOperation.quantity} onChange={(e) => setNewOperation({...newOperation, quantity: parseFloat(e.target.value)})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-op-price" className="text-right text-foreground">Цена</Label>
                            <Input id="new-op-price" type="number" value={newOperation.price} onChange={(e) => setNewOperation({...newOperation, price: parseFloat(e.target.value)})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-op-amount" className="text-right text-foreground">Сумма</Label>
                            <Input id="new-op-amount" type="number" value={newOperation.amount} onChange={(e) => setNewOperation({...newOperation, amount: parseFloat(e.target.value)})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-op-comment" className="text-right text-foreground">Комментарий</Label>
                            <Input id="new-op-comment" value={newOperation.comment} onChange={(e) => setNewOperation({...newOperation, comment: e.target.value})} className="col-span-3" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddOperationDialogOpen(false)} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">Отмена</Button>
                          <Button onClick={handleCreateOperation} className="bg-accent text-accent-foreground hover:bg-accent/90">Создать</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div>
                    <Label className="text-foreground">Карта</Label>
                    <Select value={filterCard} onValueChange={setFilterCard}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все карты" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все карты</SelectItem>
                        {uniqueCardCodes.map((code) => (
                          <SelectItem key={code} value={code}>{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground">АЗС</Label>
                    <Select value={filterStation} onValueChange={setFilterStation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все АЗС" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все АЗС</SelectItem>
                        {uniqueStationNames.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground">Тип операции</Label>
                    <Select value={filterOperationType} onValueChange={setFilterOperationType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все типы" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все типы</SelectItem>
                        {uniqueOperationTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground">Дата с</Label>
                    <Input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="bg-input border-2 border-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">Дата по</Label>
                    <Input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="bg-input border-2 border-border text-foreground"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2 border-border">
                        <TableHead className="text-foreground font-bold py-1">Карта</TableHead>
                        <TableHead className="text-foreground font-bold py-1">АЗС</TableHead>
                        <TableHead className="text-foreground font-bold py-1">Дата</TableHead>
                        <TableHead className="text-foreground font-bold py-1">Операция</TableHead>
                        <TableHead className="text-foreground font-bold py-1">Литры</TableHead>
                        <TableHead className="text-foreground font-bold py-1">Цена</TableHead>
                        <TableHead className="text-foreground font-bold py-1">Сумма</TableHead>
                        <TableHead className="text-foreground font-bold py-1">Комментарий</TableHead>
                        <TableHead className="text-foreground font-bold py-1">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedOperations.map((op) => (
                        <TableRow key={op.id} className="border-b border-border">
                          <TableCell className="font-mono py-1">
                            <div className="flex items-center gap-2">
                              <span className={op.card_code === '0000' ? 'bg-accent text-background px-1 rounded' : 'text-accent'}>
                                {op.card_code}
                              </span>
                              {op.card_code === '0000' && (
                                <Icon name="Wallet" size={16} className="text-accent" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-foreground py-1">{op.station_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm py-1">{op.operation_date}</TableCell>
                          <TableCell className="py-1">
                            <Badge className={getOperationColor(op.operation_type)}>
                              {op.operation_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-foreground py-1">{op.quantity.toFixed(3)}</TableCell>
                          <TableCell className="text-foreground py-1">{op.price.toFixed(2)}</TableCell>
                          <TableCell className="font-bold text-accent py-1">{op.amount.toFixed(2)} ₽</TableCell>
                          <TableCell className="text-muted-foreground text-sm py-1">{op.comment}</TableCell>
                          <TableCell className="py-1">
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => handleEditOperation(op)} className="h-7 w-7 p-0 border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                                <Icon name="Pencil" className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteOperation(op.id)} className="h-7 w-7 p-0">
                                <Icon name="Trash2" className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <TablePagination
                currentPage={safeOpsPage}
                totalPages={opsTotalPages}
                pageSize={opsPageSize}
                totalItems={filteredOperations.length}
                onPageChange={setOpsPage}
                onPageSizeChange={(s) => { setOpsPageSize(s); setOpsPage(1); }}
              />
            </Card>
          </TabsContent>

          <TabsContent value="stations">
            <Card className="border-2 border-primary bg-card/95 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Icon name="MapPin" className="text-accent" />
                    АЗС
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={handlePrintStations} variant="outline" size="sm" className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                      <Icon name="Printer" className="w-4 h-4 mr-2" />
                      Печать
                    </Button>
                    <Dialog open={isAddStationDialogOpen} onOpenChange={setIsAddStationDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                          <Icon name="Plus" className="w-4 h-4 mr-2" />
                          Добавить
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-card border-2 border-primary">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">Добавить АЗС</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-station-name" className="text-right text-foreground">Наименование</Label>
                            <Input id="new-station-name" value={newStation.name} onChange={(e) => setNewStation({...newStation, name: e.target.value})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-station-code" className="text-right text-foreground">Код 1С</Label>
                            <Input id="new-station-code" value={newStation.code_1c} onChange={(e) => setNewStation({...newStation, code_1c: e.target.value})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-station-address" className="text-right text-foreground">Адрес</Label>
                            <Input id="new-station-address" value={newStation.address} onChange={(e) => setNewStation({...newStation, address: e.target.value})} className="col-span-3" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddStationDialogOpen(false)} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">Отмена</Button>
                          <Button onClick={handleCreateStation} className="bg-accent text-accent-foreground hover:bg-accent/90">Создать</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-border">
                      <TableHead className="text-foreground font-bold">Наименование</TableHead>
                      <TableHead className="text-foreground font-bold">Код 1С</TableHead>
                      <TableHead className="text-foreground font-bold">Адрес</TableHead>
                      <TableHead className="text-foreground font-bold">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stations.map((station) => (
                      <TableRow key={station.id} className="border-b border-border">
                        <TableCell className="font-medium text-foreground">{station.name}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{station.code_1c}</TableCell>
                        <TableCell className="text-foreground">{station.address}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditStation(station)} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                              <Icon name="Pencil" className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteStation(station.id)}>
                              <Icon name="Trash2" className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fuel-types">
            <Card className="border-2 border-primary bg-card/95 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Icon name="Fuel" className="text-accent" />
                    Виды топлива
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={handlePrintFuelTypes} variant="outline" size="sm" className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                      <Icon name="Printer" className="w-4 h-4 mr-2" />
                      Печать
                    </Button>
                    <Dialog open={isAddFuelTypeDialogOpen} onOpenChange={setIsAddFuelTypeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                          <Icon name="Plus" className="w-4 h-4 mr-2" />
                          Добавить
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-card border-2 border-primary">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">Добавить вид топлива</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-fuel-name" className="text-right text-foreground">Название</Label>
                            <Input id="new-fuel-name" value={newFuelType.name} onChange={(e) => setNewFuelType({...newFuelType, name: e.target.value})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-fuel-code" className="text-right text-foreground">Код 1С</Label>
                            <Input id="new-fuel-code" value={newFuelType.code_1c} onChange={(e) => setNewFuelType({...newFuelType, code_1c: e.target.value})} className="col-span-3" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddFuelTypeDialogOpen(false)} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">Отмена</Button>
                          <Button onClick={handleCreateFuelType} className="bg-accent text-accent-foreground hover:bg-accent/90">Создать</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-border">
                      <TableHead className="text-foreground font-bold">Название</TableHead>
                      <TableHead className="text-foreground font-bold">Код 1С</TableHead>
                      <TableHead className="text-foreground font-bold">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuelTypes.map((fuelType) => (
                      <TableRow key={fuelType.id} className="border-b border-border">
                        <TableCell className="font-medium text-foreground">{fuelType.name}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{fuelType.code_1c}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditFuelType(fuelType)} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                              <Icon name="Pencil" className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteFuelType(fuelType.id)}>
                              <Icon name="Trash2" className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-2 border-primary">
          <DialogHeader>
            <DialogTitle className="text-foreground">Редактировать клиента</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-inn" className="text-right text-foreground">ИНН</Label>
                <Input id="edit-inn" value={editingClient.inn} onChange={(e) => setEditingClient({...editingClient, inn: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right text-foreground">Название</Label>
                <Input id="edit-name" value={editingClient.name} onChange={(e) => setEditingClient({...editingClient, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-address" className="text-right text-foreground">Адрес</Label>
                <Input id="edit-address" value={editingClient.address} onChange={(e) => setEditingClient({...editingClient, address: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone" className="text-right text-foreground">Телефон</Label>
                <Input id="edit-phone" value={editingClient.phone} onChange={(e) => setEditingClient({...editingClient, phone: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right text-foreground">Email</Label>
                <Input id="edit-email" value={editingClient.email} onChange={(e) => setEditingClient({...editingClient, email: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-login" className="text-right text-foreground">Логин</Label>
                <Input id="edit-login" value={editingClient.login} onChange={(e) => setEditingClient({...editingClient, login: e.target.value})} className="col-span-3" />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsClientDialogOpen(false)} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">Отмена</Button>
            <Button onClick={handleSaveClient} className="bg-accent text-accent-foreground hover:bg-accent/90">Сохранить</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-2 border-primary">
          <DialogHeader>
            <DialogTitle className="text-foreground">Редактировать карту</DialogTitle>
          </DialogHeader>
          {editingCard && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-code" className="text-right text-foreground">Код карты</Label>
                <Input id="edit-card-code" value={editingCard.card_code} onChange={(e) => setEditingCard({...editingCard, card_code: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-client" className="text-right text-foreground">Клиент</Label>
                <Input id="edit-card-client" value={editingCard.client_name} onChange={(e) => setEditingCard({...editingCard, client_name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-fuel" className="text-right text-foreground">Вид топлива</Label>
                <Select value={editingCard.fuel_type_id?.toString() || ''} onValueChange={handleFuelTypeChange}>
                  <SelectTrigger id="edit-card-fuel" className="col-span-3">
                    <SelectValue placeholder="Выберите вид топлива" />
                  </SelectTrigger>
                  <SelectContent>
                    {fuelTypes.map((ft) => (
                      <SelectItem key={ft.id} value={ft.id.toString()}>{ft.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-balance" className="text-right text-foreground">Баланс (л)</Label>
                <Input id="edit-card-balance" type="number" value={editingCard.balance_liters} onChange={(e) => setEditingCard({...editingCard, balance_liters: parseFloat(e.target.value)})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-pin" className="text-right text-foreground">PIN-код</Label>
                <Input id="edit-card-pin" type="password" value={editingCard.pin_code} onChange={(e) => setEditingCard({...editingCard, pin_code: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-daily-limit" className="text-right text-foreground">Дневной лимит (л)</Label>
                <Input id="edit-card-daily-limit" type="number" step="0.001" placeholder="0 = без лимита" value={editingCard.daily_limit || 0} onChange={(e) => setEditingCard({...editingCard, daily_limit: parseFloat(e.target.value) || 0})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-status" className="text-right text-foreground">Статус</Label>
                <Select value={editingCard.status || 'активна'} onValueChange={(value) => setEditingCard({...editingCard, status: value})}>
                  <SelectTrigger id="edit-card-status" className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="активна">Активна</SelectItem>
                    <SelectItem value="заблокирована">Заблокирована</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingCard.status === 'заблокирована' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-card-block-reason" className="text-right text-foreground">Причина блокировки</Label>
                  <Input id="edit-card-block-reason" value={editingCard.block_reason || ''} onChange={(e) => setEditingCard({...editingCard, block_reason: e.target.value})} className="col-span-3" />
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCardDialogOpen(false)} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">Отмена</Button>
            <Button onClick={handleSaveCard} className="bg-accent text-accent-foreground hover:bg-accent/90">Сохранить</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={fuelTypeWarningDialog} onOpenChange={setFuelTypeWarningDialog}>
        <DialogContent className="max-w-md bg-destructive/10 border-2 border-destructive">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Icon name="AlertTriangle" size={24} />
              Внимание!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-foreground text-center">
              Вид топлива можно изменить только при балансе карты равном 0. 
              Обратитесь к администратору!
            </p>
          </div>
          <div className="flex justify-center">
            <Button 
              onClick={() => setFuelTypeWarningDialog(false)} 
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Понятно
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isOperationDialogOpen} onOpenChange={setIsOperationDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-2 border-primary">
          <DialogHeader>
            <DialogTitle className="text-foreground">Редактировать операцию</DialogTitle>
          </DialogHeader>
          {editingOperation && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-op-card" className="text-right text-foreground">Код карты</Label>
                <Input id="edit-op-card" value={editingOperation.card_code} onChange={(e) => setEditingOperation({...editingOperation, card_code: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-op-station" className="text-right text-foreground">АЗС</Label>
                <Select value={editingOperation.station_name} onValueChange={(value) => setEditingOperation({...editingOperation, station_name: value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((station) => (
                      <SelectItem key={station.id} value={station.name}>{station.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-op-date" className="text-right text-foreground">Дата</Label>
                <Input id="edit-op-date" value={editingOperation.operation_date} onChange={(e) => setEditingOperation({...editingOperation, operation_date: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-op-type" className="text-right text-foreground">Тип операции</Label>
                <Select value={editingOperation.operation_type} onValueChange={(value) => setEditingOperation({...editingOperation, operation_type: value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="пополнение">Пополнение</SelectItem>
                    <SelectItem value="заправка">Заправка</SelectItem>
                    <SelectItem value="списание">Списание</SelectItem>
                    <SelectItem value="оприходование">Оприходование</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-op-quantity" className="text-right text-foreground">Литры</Label>
                <Input id="edit-op-quantity" type="number" value={editingOperation.quantity} onChange={(e) => setEditingOperation({...editingOperation, quantity: parseFloat(e.target.value)})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-op-price" className="text-right text-foreground">Цена</Label>
                <Input id="edit-op-price" type="number" value={editingOperation.price} onChange={(e) => setEditingOperation({...editingOperation, price: parseFloat(e.target.value)})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-op-amount" className="text-right text-foreground">Сумма</Label>
                <Input id="edit-op-amount" type="number" value={editingOperation.amount} onChange={(e) => setEditingOperation({...editingOperation, amount: parseFloat(e.target.value)})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-op-comment" className="text-right text-foreground">Комментарий</Label>
                <Input id="edit-op-comment" value={editingOperation.comment} onChange={(e) => setEditingOperation({...editingOperation, comment: e.target.value})} className="col-span-3" />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOperationDialogOpen(false)} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">Отмена</Button>
            <Button onClick={handleSaveOperation} className="bg-accent text-accent-foreground hover:bg-accent/90">Сохранить</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFuelTypeDialogOpen} onOpenChange={setIsFuelTypeDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-2 border-primary">
          <DialogHeader>
            <DialogTitle className="text-foreground">Редактировать вид топлива</DialogTitle>
          </DialogHeader>
          {editingFuelType && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-fuel-name" className="text-right text-foreground">Название</Label>
                <Input id="edit-fuel-name" value={editingFuelType.name} onChange={(e) => setEditingFuelType({...editingFuelType, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-fuel-code" className="text-right text-foreground">Код 1С</Label>
                <Input id="edit-fuel-code" value={editingFuelType.code_1c} onChange={(e) => setEditingFuelType({...editingFuelType, code_1c: e.target.value})} className="col-span-3" />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsFuelTypeDialogOpen(false)} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">Отмена</Button>
            <Button onClick={handleSaveFuelType} className="bg-accent text-accent-foreground hover:bg-accent/90">Сохранить</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isStationDialogOpen} onOpenChange={setIsStationDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-2 border-primary">
          <DialogHeader>
            <DialogTitle className="text-foreground">Редактировать АЗС</DialogTitle>
          </DialogHeader>
          {editingStation && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-station-name" className="text-right text-foreground">Наименование</Label>
                <Input id="edit-station-name" value={editingStation.name} onChange={(e) => setEditingStation({...editingStation, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-station-code" className="text-right text-foreground">Код 1С</Label>
                <Input id="edit-station-code" value={editingStation.code_1c} onChange={(e) => setEditingStation({...editingStation, code_1c: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-station-address" className="text-right text-foreground">Адрес</Label>
                <Input id="edit-station-address" value={editingStation.address} onChange={(e) => setEditingStation({...editingStation, address: e.target.value})} className="col-span-3" />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsStationDialogOpen(false)} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">Отмена</Button>
            <Button onClick={handleSaveStation} className="bg-accent text-accent-foreground hover:bg-accent/90">Сохранить</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={balanceChangeDialog.open} onOpenChange={(open) => setBalanceChangeDialog({...balanceChangeDialog, open})}>
        <DialogContent className="bg-card border-2 border-primary">
          <DialogHeader>
            <DialogTitle className="text-foreground">Изменение баланса карты</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-foreground mb-2">Карта: <span className="font-mono text-accent">{balanceChangeDialog.cardCode}</span></p>
            <p className="text-foreground mb-2">Старый баланс: <span className="font-bold text-accent">{balanceChangeDialog.oldBalance.toFixed(2)} л</span></p>
            <p className="text-foreground mb-2">Новый баланс: <span className="font-bold text-accent">{balanceChangeDialog.newBalance.toFixed(2)} л</span></p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setBalanceChangeDialog({...balanceChangeDialog, open: false})} className="bg-accent text-accent-foreground hover:bg-accent/90">OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cardSuccessDialog.open} onOpenChange={(open) => setCardSuccessDialog({...cardSuccessDialog, open})}>
        <DialogContent className="bg-card border-2 border-primary max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Icon name="CheckCircle2" size={28} className="text-primary" />
              </div>
              <DialogTitle className="text-2xl text-foreground">Карта успешно создана!</DialogTitle>
            </div>
          </DialogHeader>
          {cardSuccessDialog.card && (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-lg bg-accent/10 border-2 border-accent">
                <h3 className="text-lg font-bold text-accent mb-3">Данные новой карты:</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Номер карты:</span>
                    <span className="font-mono text-xl font-bold text-accent">{cardSuccessDialog.card.card_code}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Клиент:</span>
                    <span className="font-semibold text-foreground">{cardSuccessDialog.card.client_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Вид топлива:</span>
                    <span className="font-semibold text-foreground">{cardSuccessDialog.card.fuel_type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Начальный баланс:</span>
                    <span className="font-bold text-primary text-lg">{cardSuccessDialog.card.balance_liters.toFixed(2)} л</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">PIN-код:</span>
                    <span className="font-mono text-foreground">{cardSuccessDialog.card.pin_code}</span>
                  </div>
                </div>
              </div>
              {cardSuccessDialog.card.balance_liters > 0 && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary">
                  <div className="flex items-start gap-2">
                    <Icon name="Info" size={20} className="text-primary mt-0.5" />
                    <p className="text-sm text-foreground">
                      Автоматически создана операция пополнения на <strong>{cardSuccessDialog.card.balance_liters.toFixed(2)} л</strong> со Склада
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setCardSuccessDialog({open: false, card: null})} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Icon name="CheckCircle2" size={16} className="mr-2" />
              Отлично!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={topupDialogOpen} onOpenChange={setTopupDialogOpen}>
        <DialogContent className="max-w-md bg-card border-2 border-primary">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Icon name="Plus" className="text-primary" />
              Пополнение баланса карты
            </DialogTitle>
          </DialogHeader>
          
          {cards.find(c => c.id === topupCardId) && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-accent/10 border-2 border-accent">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Клиент:</span>
                    <span className="font-semibold text-foreground">{cards.find(c => c.id === topupCardId)?.client_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Номер карты:</span>
                    <span className="font-mono text-xl font-bold text-accent">{cards.find(c => c.id === topupCardId)?.card_code}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Вид топлива:</span>
                    <span className="font-semibold text-foreground">{cards.find(c => c.id === topupCardId)?.fuel_type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Текущий баланс:</span>
                    <span className="font-bold text-primary text-lg">{cards.find(c => c.id === topupCardId)?.balance_liters.toFixed(3)} л</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="topup-quantity" className="text-foreground">Количество (литров)</Label>
                  <Input
                    id="topup-quantity"
                    type="number"
                    step="0.001"
                    min="0.001"
                    placeholder="Введите количество"
                    value={topupQuantity}
                    onChange={(e) => handleTopupQuantityChange(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="topup-price" className="text-foreground">Цена (руб/л)</Label>
                  <Input
                    id="topup-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Введите цену"
                    value={topupPrice}
                    onChange={(e) => handleTopupPriceChange(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="topup-amount" className="text-foreground">Сумма (руб)</Label>
                  <Input
                    id="topup-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Введите сумму"
                    value={topupAmount}
                    onChange={(e) => handleTopupAmountChange(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="topup-comment" className="text-foreground">Комментарий</Label>
                  <Input
                    id="topup-comment"
                    placeholder="Комментарий к операции"
                    value={topupComment}
                    onChange={(e) => setTopupComment(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setTopupDialogOpen(false)}
                  className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon name="X" size={16} className="mr-2" />
                  Отмена
                </Button>
                <Button 
                  onClick={confirmTopup}
                  disabled={!topupQuantity || !topupPrice || !topupAmount}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Icon name="Plus" size={16} className="mr-2" />
                  Пополнить
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={topupSuccessDialog.open} onOpenChange={(open) => setTopupSuccessDialog({...topupSuccessDialog, open})}>
        <DialogContent className="max-w-lg bg-card border-2 border-primary">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Icon name="CheckCircle2" size={28} className="text-primary" />
              </div>
              <DialogTitle className="text-2xl text-foreground">Карта успешно пополнена!</DialogTitle>
            </div>
          </DialogHeader>
          
          {topupSuccessDialog.card && (
            <div className="py-4 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-3">
                  <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary">
                    <h3 className="text-lg font-bold text-primary mb-3">Детали пополнения:</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Номер карты:</span>
                        <span className="font-mono text-lg font-bold text-accent">{topupSuccessDialog.card.card_code}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Клиент:</span>
                        <span className="font-semibold text-foreground">{topupSuccessDialog.card.client_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Пополнено:</span>
                        <span className="font-bold text-primary text-xl">+{topupSuccessDialog.quantity.toFixed(3)} л</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t-2 border-primary/30">
                        <span className="text-muted-foreground">Новый баланс:</span>
                        <span className="font-bold text-accent text-2xl">{topupSuccessDialog.card.balance_liters.toFixed(3)} л</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent">
                    <div className="flex items-start gap-2">
                      <Icon name="Info" size={20} className="text-accent mt-0.5" />
                      <p className="text-sm text-foreground">
                        Операция пополнения автоматически добавлена в историю операций карты
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
                    <Icon name="SmilePlus" size={80} className="text-primary" />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button 
              onClick={() => setTopupSuccessDialog({open: false, card: null, quantity: 0})} 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Icon name="CheckCircle2" size={16} className="mr-2" />
              Отлично!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={recalculateDialogOpen} onOpenChange={setRecalculateDialogOpen}>
        <DialogContent className="max-w-md bg-card border-2 border-primary">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Icon name="RefreshCw" className="text-primary" />
              Пересчёт баланса карты
            </DialogTitle>
          </DialogHeader>
          
          {recalculateResult ? (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-accent/10 border-2 border-accent">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="CheckCircle2" size={24} className="text-accent" />
                  <h3 className="font-bold text-foreground">Баланс обновлён!</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded bg-card">
                    <span className="text-muted-foreground">Баланс до:</span>
                    <span className="font-bold text-lg text-destructive">{recalculateResult.oldBalance.toFixed(3)} л</span>
                  </div>
                  
                  <div className="flex justify-center">
                    <Icon name="ArrowDown" size={24} className="text-primary" />
                  </div>
                  
                  <div className="flex justify-between items-center p-3 rounded bg-card border-2 border-accent">
                    <span className="text-muted-foreground">Баланс после:</span>
                    <span className="font-bold text-xl text-accent">{recalculateResult.newBalance.toFixed(3)} л</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-2 rounded bg-primary/10">
                    <span className="text-sm text-muted-foreground">Разница:</span>
                    <span className={`font-bold text-sm ${recalculateResult.newBalance - recalculateResult.oldBalance >= 0 ? 'text-accent' : 'text-destructive'}`}>
                      {recalculateResult.newBalance - recalculateResult.oldBalance > 0 ? '+' : ''}
                      {(recalculateResult.newBalance - recalculateResult.oldBalance).toFixed(3)} л
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={closeRecalculateDialog} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Icon name="X" size={16} className="mr-2" />
                  Закрыть
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary">
                <div className="flex items-start gap-3">
                  <Icon name="AlertCircle" size={24} className="text-primary flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">
                      Вы уверены, что хотите пересчитать баланс?
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Система пересчитает баланс на основе всех операций по карте с самого начала. 
                      Текущий баланс будет заменён на рассчитанный.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeRecalculateDialog} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                  <Icon name="X" size={16} className="mr-2" />
                  Отмена
                </Button>
                <Button onClick={confirmRecalculateBalance} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Icon name="RefreshCw" size={16} className="mr-2" />
                  Пересчитать
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={blockCardDialogOpen} onOpenChange={setBlockCardDialogOpen}>
        <DialogContent className="max-w-md bg-card border-2 border-primary">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Icon name="Lock" className="text-destructive" />
              Блокировка карты
            </DialogTitle>
          </DialogHeader>
          
          {cards.find(c => c.id === blockCardId) && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Номер карты:</span>
                    <span className="font-mono text-xl font-bold text-accent">{cards.find(c => c.id === blockCardId)?.card_code}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Клиент:</span>
                    <span className="font-semibold text-foreground">{cards.find(c => c.id === blockCardId)?.client_name}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="block-reason" className="text-foreground">Причина блокировки</Label>
                <Input
                  id="block-reason"
                  placeholder="Укажите причину блокировки"
                  value={blockCardReason}
                  onChange={(e) => setBlockCardReason(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setBlockCardDialogOpen(false)}
                  className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon name="X" size={16} className="mr-2" />
                  Отмена
                </Button>
                <Button 
                  onClick={confirmBlockCard}
                  disabled={!blockCardReason}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <Icon name="Lock" size={16} className="mr-2" />
                  Заблокировать
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={unblockCardDialogOpen} onOpenChange={setUnblockCardDialogOpen}>
        <DialogContent className="max-w-md bg-card border-2 border-primary">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Icon name="Unlock" className="text-primary" />
              Разблокировка карты
            </DialogTitle>
          </DialogHeader>
          
          {cards.find(c => c.id === blockCardId) && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Номер карты:</span>
                    <span className="font-mono text-xl font-bold text-accent">{cards.find(c => c.id === blockCardId)?.card_code}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Клиент:</span>
                    <span className="font-semibold text-foreground">{cards.find(c => c.id === blockCardId)?.client_name}</span>
                  </div>
                  {cards.find(c => c.id === blockCardId)?.block_reason && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-sm text-muted-foreground">Причина блокировки:</span>
                      <p className="text-sm font-medium text-foreground mt-1">{cards.find(c => c.id === blockCardId)?.block_reason}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-primary/10 border border-primary">
                <div className="flex items-start gap-2">
                  <Icon name="AlertCircle" size={20} className="text-primary mt-0.5" />
                  <p className="text-sm text-foreground">
                    Вы уверены, что хотите разблокировать эту карту?
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setUnblockCardDialogOpen(false)}
                  className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon name="X" size={16} className="mr-2" />
                  Отмена
                </Button>
                <Button 
                  onClick={confirmUnblockCard}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Icon name="Unlock" size={16} className="mr-2" />
                  Разблокировать
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}