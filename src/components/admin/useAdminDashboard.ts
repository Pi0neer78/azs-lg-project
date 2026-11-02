import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/utils/adminApi';
import { formatDateForInput } from '@/utils/dateUtils';
import { useConfirm, useAlert } from '@/components/ConfirmDialog';
import { logEvent } from '@/utils/auditClient';
import { usePageSize } from '@/hooks/usePageSize';
import { printOperations, exportOperationsToExcel } from '@/utils/operationsExport';

export function useAdminDashboard() {
  const navigate = useNavigate();
  const confirmAction = useConfirm();
  const showAlert = useAlert();
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
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
  const [transferFromCardId, setTransferFromCardId] = useState<number | null>(null);
  const [transferToCardId, setTransferToCardId] = useState<string>('');
  const [transferDebitQty, setTransferDebitQty] = useState('');
  const [transferCreditQty, setTransferCreditQty] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferSuccessDialog, setTransferSuccessDialog] = useState<{open: boolean, result: any}>({open: false, result: null});

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
  const [showEditPassword, setShowEditPassword] = useState(false);

  const generatePassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const all = upper + lower + digits;
    const rnd = (max: number) => {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] % max;
    };
    const len = 8 + rnd(7);
    const chars = [upper[rnd(upper.length)], lower[rnd(lower.length)], digits[rnd(digits.length)]];
    while (chars.length < len) chars.push(all[rnd(all.length)]);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  };
  const [filterClientType, setFilterClientType] = useState<string>('client');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [operatorLinkDialog, setOperatorLinkDialog] = useState<{open: boolean, client: any}>({open: false, client: null});
  const [operatorLinkStation, setOperatorLinkStation] = useState<string>('');
  const [operatorLinkPassword, setOperatorLinkPassword] = useState<string>('');
  const [operatorLinkCopied, setOperatorLinkCopied] = useState(false);
  const [memoClient, setMemoClient] = useState<any>(null);

  const handleDeleteClient = async (id: number) => {
    if (await confirmAction({ title: 'Удалить клиента?', message: 'Клиент будет удалён без возможности восстановления.' })) {
      try {
        await adminApi.clients.delete(id);
        loadClients();
      } catch (error) {
        console.error('Error deleting client:', error);
      }
    }
  };

  const handleEditClient = (client: any) => {
    setEditingClient({...client, password: client.password || ''});
    setShowEditPassword(false);
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
        showAlert('Ошибка: Клиент с таким логином уже существует. Пожалуйста, выберите другой логин.');
      } else {
        showAlert(`Ошибка при создании клиента: ${errorMessage}`);
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
        fuel_card_id: card.id,
        card_code: card.card_code,
        station_name: 'Склад',
        operation_date: dateStr,
        operation_type: 'пополнение',
        quantity: parseFloat(topupQuantity),
        price: parseFloat(topupPrice),
        amount: parseFloat(topupAmount),
        comment: `пополнение баланса карта ${card.card_code}/${card.card_index ?? 0} топливо ${card.fuel_type}${topupComment ? `. ${topupComment}` : ''}`
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
      } else if ((op.operation_type === 'заправка' && !op.op_fuel_type_id) || op.operation_type === 'списание') {
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

  const handleTransferCard = (cardId: number) => {
    setTransferFromCardId(cardId);
    setTransferToCardId('');
    setTransferDebitQty('');
    setTransferCreditQty('');
    setTransferDialogOpen(true);
  };

  const handleTransferConfirm = () => {
    if (!transferFromCardId || !transferToCardId || !transferDebitQty || !transferCreditQty) return;
    setTransferDialogOpen(false);
    setTransferConfirmOpen(true);
  };

  const confirmTransfer = async () => {
    if (!transferFromCardId || !transferToCardId || !transferDebitQty || !transferCreditQty) return;
    setTransferLoading(true);
    try {
      const result = await adminApi.transfer.execute({
        from_card_id: transferFromCardId,
        to_card_id: parseInt(transferToCardId),
        debit_quantity: parseFloat(transferDebitQty),
        credit_quantity: parseFloat(transferCreditQty)
      });
      await loadCards();
      await loadOperations();
      setTransferConfirmOpen(false);
      setTransferSuccessDialog({open: true, result});
    } catch (error) {
      console.error('Transfer error:', error);
      showAlert('Ошибка при перемещении: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setTransferLoading(false);
    }
  };



  const [editingStation, setEditingStation] = useState<any>(null);
  const [isStationDialogOpen, setIsStationDialogOpen] = useState(false);
  const [isAddStationDialogOpen, setIsAddStationDialogOpen] = useState(false);
  const [newStation, setNewStation] = useState({name: '', code_1c: '', address: ''});

  const handleDeleteStation = async (id: number) => {
    if (await confirmAction({ title: 'Удалить АЗС?', message: 'Станция будет удалена без возможности восстановления.' })) {
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
    logEvent('печать', 'АЗС', `Записей : ${stations.length}`);
    window.print();
  };

  const [editingFuelType, setEditingFuelType] = useState<any>(null);
  const [isFuelTypeDialogOpen, setIsFuelTypeDialogOpen] = useState(false);
  const [isAddFuelTypeDialogOpen, setIsAddFuelTypeDialogOpen] = useState(false);
  const [newFuelType, setNewFuelType] = useState({name: '', code_1c: '', unit: 'л'});

  const handleDeleteFuelType = async (id: number) => {
    if (await confirmAction({ title: 'Удалить вид топлива?', message: 'Вид топлива будет удалён без возможности восстановления.' })) {
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
      setNewFuelType({name: '', code_1c: '', unit: 'л'});
      setIsAddFuelTypeDialogOpen(false);
    } catch (error) {
      console.error('Error creating fuel type:', error);
    }
  };



  const cardLabel = (card: {card_code: string; card_index?: number}) =>
    `${card.card_code}/${card.card_index ?? 0}`;

  const getCardUnit = (card: {fuel_type_id?: number; fuel_type?: string}) => {
    const ft = fuelTypes.find((f) => f.id === card.fuel_type_id || f.name === card.fuel_type);
    return ft?.unit || 'л';
  };

  const [editingCard, setEditingCard] = useState<any>(null);
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [newCard, setNewCard] = useState({card_code: '', card_index: 0, client_id: '', fuel_type_id: '', balance_liters: 0, pin_code: '', status: 'активна', block_reason: '', daily_limit: 0});
  const [cardSuccessDialog, setCardSuccessDialog] = useState<{open: boolean, card: any}>({open: false, card: null});
  const [cardDuplicateDialog, setCardDuplicateDialog] = useState<{open: boolean, card_code: string, card_index: number, source: 'create' | 'edit'}>({open: false, card_code: '', card_index: 0, source: 'create'});
  const [fuelTypeWarningDialog, setFuelTypeWarningDialog] = useState(false);
  const [filterCardClient, setFilterCardClient] = useState<string>('all');
  const [filterCardFuelType, setFilterCardFuelType] = useState<string>('all');
  const [filterCardCode, setFilterCardCode] = useState<string>('');

  const handleDeleteCard = async (id: number) => {
    if (await confirmAction({ title: 'Удалить карту?', message: 'Карта будет удалена без возможности восстановления.' })) {
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
      } catch (error: any) {
        console.error('Error updating card:', error);
        if (error?.status === 409 || error?.data?.error === 'duplicate') {
          setIsCardDialogOpen(false);
          setCardDuplicateDialog({open: true, card_code: error.data?.card_code || editingCard?.card_code || '', card_index: error.data?.card_index ?? editingCard?.card_index ?? 0, source: 'edit'});
        }
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
        card_index: newCard.card_index,
        pin_code: newCard.pin_code
      };
      
      setNewCard({card_code: '', card_index: 0, client_id: '', fuel_type_id: '', balance_liters: 0, pin_code: '', status: 'активна', block_reason: '', daily_limit: 0});
      setIsAddCardDialogOpen(false);
      setCardSuccessDialog({open: true, card: cardToShow});
    } catch (error: any) {
      console.error('Error creating card:', error);
      if (error?.status === 409 || error?.data?.error === 'duplicate') {
        setIsAddCardDialogOpen(false);
        setCardDuplicateDialog({open: true, card_code: error.data?.card_code || newCard.card_code, card_index: error.data?.card_index ?? newCard.card_index, source: 'create'});
      }
    }
  };

  const [cardsPage, setCardsPage] = useState(1);
  const cardsPS = usePageSize('admin_cards');
  const cardsPageSize = cardsPS.size;
  const [opsPage, setOpsPage] = useState(1);
  const opsPS = usePageSize('admin_ops');
  const opsPageSize = opsPS.size;

  const filteredCards = cards
    .filter(card => {
      if (filterCardClient !== 'all' && card.client_name !== filterCardClient) return false;
      if (filterCardFuelType !== 'all' && card.fuel_type !== filterCardFuelType) return false;
      if (filterCardCode.trim() && !card.card_code.toLowerCase().includes(filterCardCode.trim().toLowerCase())) return false;
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
  const [newOperation, setNewOperation] = useState<any>({fuel_card_id: null, card_code: '', station_name: '', operation_date: '', operation_type: 'пополнение', quantity: 0, price: 0, amount: 0, comment: ''});
  const [filterCard, setFilterCard] = useState<string>('all');
  const [filterStation, setFilterStation] = useState<string>('all');
  const [filterOperationType, setFilterOperationType] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterOpClient, setFilterOpClient] = useState<string>('all');
  const [filterOpFuelType, setFilterOpFuelType] = useState<string>('all');
  const [balanceChangeDialog, setBalanceChangeDialog] = useState<{open: boolean, cardCode: string, oldBalance: number, newBalance: number}>({open: false, cardCode: '', oldBalance: 0, newBalance: 0});



  const handleDeleteOperation = async (id: number) => {
    if (await confirmAction({ title: 'Удалить операцию?', message: 'Операция будет удалена без возможности восстановления.' })) {
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
      setNewOperation({fuel_card_id: null, card_code: '', station_name: '', operation_date: '', operation_type: 'пополнение', quantity: 0, price: 0, amount: 0, comment: ''});
      setIsAddOperationDialogOpen(false);
    } catch (error) {
      console.error('Error creating operation:', error);
    }
  };

  const filteredOperations = operations.filter(op => {
    if (filterCard !== 'all' && `${op.card_code}/${op.card_index ?? 0}` !== filterCard) return false;
    if (filterStation !== 'all' && op.station_name !== filterStation) return false;
    if (filterOperationType !== 'all' && op.operation_type !== filterOperationType) return false;
    if (filterOpClient !== 'all' && op.client_name !== filterOpClient) return false;
    if (filterOpFuelType !== 'all' && (op.op_fuel_type || op.fuel_type) !== filterOpFuelType) return false;
    const matchesDateFrom = !filterDateFrom || op.operation_date >= filterDateFrom;
    const matchesDateTo = !filterDateTo || op.operation_date <= filterDateTo + ' 23:59';
    return matchesDateFrom && matchesDateTo;
  });

  const opsTotalPages = Math.ceil(filteredOperations.length / opsPageSize) || 1;
  const safeOpsPage = Math.min(opsPage, opsTotalPages);
  const pagedOperations = filteredOperations.slice((safeOpsPage - 1) * opsPageSize, safeOpsPage * opsPageSize);

  const uniqueCardLabels = Array.from(new Set(operations.map(o => `${o.card_code}/${o.card_index ?? 0}`))).sort();
  const uniqueStationNames = Array.from(new Set(operations.map(o => o.station_name)));
  const uniqueOperationTypes = Array.from(new Set(operations.map(o => o.operation_type)));
  const uniqueOpClientNames = Array.from(new Set(operations.map(o => o.client_name).filter(Boolean)));
  const uniqueOpFuelTypes = Array.from(new Set(operations.map(o => o.fuel_type).filter(Boolean)));

  const handlePrintClients = () => {
    logEvent('печать', 'Клиенты', `Записей : ${clients.length}, Фильтр : ${filterClientType === 'all' ? 'все' : filterClientType}`);
    window.print();
  };

  const handlePrintCards = () => {
    logEvent('печать', 'Карты', `Записей : ${filteredCards.length}`);
    window.print();
  };

  const handlePrintOperations = () => {
    const filters: string[] = [];
    if (filterOpClient !== 'all') filters.push(`клиент: ${filterOpClient}`);
    if (filterOpFuelType !== 'all') filters.push(`топливо: ${filterOpFuelType}`);
    if (filterCard !== 'all') filters.push(`карта: ${filterCard}`);
    if (filterStation !== 'all') filters.push(`АЗС: ${filterStation}`);
    if (filterOperationType !== 'all') filters.push(`операция: ${filterOperationType}`);
    if (filterDateFrom) filters.push(`с ${filterDateFrom}`);
    if (filterDateTo) filters.push(`по ${filterDateTo}`);
    logEvent('печать', 'Операции', `Записей : ${filteredOperations.length}, Фильтр : ${filters.join('; ') || 'без фильтров'}`);
    if (!printOperations(filteredOperations, filters)) {
      showAlert('Браузер заблокировал окно печати. Разрешите всплывающие окна для этого сайта.');
    }
  };

  const handleExportOperations = () => {
    exportOperationsToExcel(filteredOperations);
    logEvent('в эксель', 'Операции', `Записей : ${filteredOperations.length}`);
  };

  const handlePrintFuelTypes = () => {
    logEvent('печать', 'Виды топлива', `Записей : ${fuelTypes.length}`);
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

  return {
    navigate,
    confirmAction,
    showAlert,
    clients,
    setClients,
    stations,
    setStations,
    fuelTypes,
    setFuelTypes,
    cards,
    setCards,
    operations,
    setOperations,
    loading,
    setLoading,
    recalculateDialogOpen,
    setRecalculateDialogOpen,
    recalculateCardId,
    setRecalculateCardId,
    recalculateResult,
    setRecalculateResult,
    topupDialogOpen,
    setTopupDialogOpen,
    topupCardId,
    setTopupCardId,
    topupQuantity,
    setTopupQuantity,
    topupPrice,
    setTopupPrice,
    topupAmount,
    setTopupAmount,
    topupComment,
    setTopupComment,
    topupSuccessDialog,
    setTopupSuccessDialog,
    blockCardDialogOpen,
    setBlockCardDialogOpen,
    unblockCardDialogOpen,
    setUnblockCardDialogOpen,
    blockCardId,
    setBlockCardId,
    blockCardReason,
    setBlockCardReason,
    transferDialogOpen,
    setTransferDialogOpen,
    transferConfirmOpen,
    setTransferConfirmOpen,
    transferFromCardId,
    setTransferFromCardId,
    transferToCardId,
    setTransferToCardId,
    transferDebitQty,
    setTransferDebitQty,
    transferCreditQty,
    setTransferCreditQty,
    transferLoading,
    setTransferLoading,
    transferSuccessDialog,
    setTransferSuccessDialog,
    loadAllData,
    loadClients,
    loadStations,
    loadFuelTypes,
    loadCards,
    loadOperations,
    editingClient,
    setEditingClient,
    isClientDialogOpen,
    setIsClientDialogOpen,
    isAddClientDialogOpen,
    setIsAddClientDialogOpen,
    newClient,
    setNewClient,
    showNewPassword,
    setShowNewPassword,
    showEditPassword,
    setShowEditPassword,
    generatePassword,
    filterClientType,
    setFilterClientType,
    clientSearch,
    setClientSearch,
    operatorLinkDialog,
    setOperatorLinkDialog,
    operatorLinkStation,
    setOperatorLinkStation,
    operatorLinkPassword,
    setOperatorLinkPassword,
    operatorLinkCopied,
    setOperatorLinkCopied,
    memoClient,
    setMemoClient,
    handleDeleteClient,
    handleEditClient,
    handleSaveClient,
    handleCreateClient,
    handleRecalculateBalance,
    handleTopupCard,
    handleBlockCard,
    handleUnblockCard,
    confirmBlockCard,
    confirmUnblockCard,
    handleTopupQuantityChange,
    handleTopupPriceChange,
    handleTopupAmountChange,
    confirmTopup,
    confirmRecalculateBalance,
    closeRecalculateDialog,
    handleTransferCard,
    handleTransferConfirm,
    confirmTransfer,
    editingStation,
    setEditingStation,
    isStationDialogOpen,
    setIsStationDialogOpen,
    isAddStationDialogOpen,
    setIsAddStationDialogOpen,
    newStation,
    setNewStation,
    handleDeleteStation,
    handleEditStation,
    handleSaveStation,
    handleCreateStation,
    handlePrintStations,
    editingFuelType,
    setEditingFuelType,
    isFuelTypeDialogOpen,
    setIsFuelTypeDialogOpen,
    isAddFuelTypeDialogOpen,
    setIsAddFuelTypeDialogOpen,
    newFuelType,
    setNewFuelType,
    handleDeleteFuelType,
    handleEditFuelType,
    handleSaveFuelType,
    handleCreateFuelType,
    cardLabel,
    getCardUnit,
    editingCard,
    setEditingCard,
    isCardDialogOpen,
    setIsCardDialogOpen,
    isAddCardDialogOpen,
    setIsAddCardDialogOpen,
    newCard,
    setNewCard,
    cardSuccessDialog,
    setCardSuccessDialog,
    cardDuplicateDialog,
    setCardDuplicateDialog,
    fuelTypeWarningDialog,
    setFuelTypeWarningDialog,
    filterCardClient,
    setFilterCardClient,
    filterCardFuelType,
    setFilterCardFuelType,
    filterCardCode,
    setFilterCardCode,
    handleDeleteCard,
    handleEditCard,
    handleSaveCard,
    handleFuelTypeChange,
    handleCreateCard,
    cardsPage,
    setCardsPage,
    cardsPageSize,
    setCardsPageSize: cardsPS.setSetting,
    cardsPageSizeSetting: cardsPS.setting,
    cardsTableRef: cardsPS.ref,
    opsPage,
    setOpsPage,
    opsPageSize,
    setOpsPageSize: opsPS.setSetting,
    opsPageSizeSetting: opsPS.setting,
    opsTableRef: opsPS.ref,
    filteredCards,
    nonAdminClientNames,
    uniqueClientNames,
    uniqueCardFuelTypes,
    cardsTotalPages,
    safeCardsPage,
    pagedCards,
    editingOperation,
    setEditingOperation,
    isOperationDialogOpen,
    setIsOperationDialogOpen,
    isAddOperationDialogOpen,
    setIsAddOperationDialogOpen,
    newOperation,
    setNewOperation,
    filterCard,
    setFilterCard,
    filterStation,
    setFilterStation,
    filterOperationType,
    setFilterOperationType,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    filterOpClient,
    setFilterOpClient,
    filterOpFuelType,
    setFilterOpFuelType,
    balanceChangeDialog,
    setBalanceChangeDialog,
    handleDeleteOperation,
    handleEditOperation,
    calculateCardBalance,
    handleSaveOperation,
    handleCreateOperation,
    filteredOperations,
    opsTotalPages,
    safeOpsPage,
    pagedOperations,
    uniqueCardLabels,
    uniqueStationNames,
    uniqueOperationTypes,
    uniqueOpClientNames,
    uniqueOpFuelTypes,
    handlePrintClients,
    handlePrintCards,
    handlePrintOperations,
    handleExportOperations,
    handlePrintFuelTypes,
    getOperationColor
  };
}

export type AdminState = ReturnType<typeof useAdminDashboard>;
