import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import TablePagination from '@/components/ui/table-pagination';
import ClampText from '@/components/ClampText';
import TurnoverReportTab from './TurnoverReportTab';
import AdminTabsBar from '@/components/AdminTabsBar';
import DatabaseArchives from '@/components/DatabaseArchives';
import type { AdminState } from './useAdminDashboard';

export default function AdminTabs({ dash }: { dash: AdminState }) {
  const {
    navigate,
    showAlert,
    clients,
    stations,
    fuelTypes,
    cards,
    loading,
    isAddClientDialogOpen,
    setIsAddClientDialogOpen,
    newClient,
    setNewClient,
    showNewPassword,
    setShowNewPassword,
    filterClientType,
    setFilterClientType,
    clientSearch,
    setClientSearch,
    setOperatorLinkDialog,
    setOperatorLinkStation,
    setOperatorLinkPassword,
    setOperatorLinkCopied,
    setMemoClient,
    handleDeleteClient,
    handleEditClient,
    handleCreateClient,
    handleRecalculateBalance,
    handleTopupCard,
    handleBlockCard,
    handleUnblockCard,
    handleTransferCard,
    isAddStationDialogOpen,
    setIsAddStationDialogOpen,
    newStation,
    setNewStation,
    handleDeleteStation,
    handleEditStation,
    handleCreateStation,
    handlePrintStations,
    isAddFuelTypeDialogOpen,
    setIsAddFuelTypeDialogOpen,
    newFuelType,
    setNewFuelType,
    handleDeleteFuelType,
    handleEditFuelType,
    handleCreateFuelType,
    cardLabel,
    getCardUnit,
    isAddCardDialogOpen,
    setIsAddCardDialogOpen,
    newCard,
    setNewCard,
    filterCardClient,
    setFilterCardClient,
    filterCardFuelType,
    setFilterCardFuelType,
    filterCardCode,
    setFilterCardCode,
    handleDeleteCard,
    handleEditCard,
    handleCreateCard,
    setCardsPage,
    cardsPageSize,
    setCardsPageSize,
    setOpsPage,
    opsPageSize,
    setOpsPageSize,
    filteredCards,
    uniqueClientNames,
    uniqueCardFuelTypes,
    cardsTotalPages,
    safeCardsPage,
    pagedCards,
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
    handleDeleteOperation,
    handleEditOperation,
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
  } = dash;

  return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="clients" className="space-y-6">
          <AdminTabsBar />

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
                        <div className="grid gap-3 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-inn" className="text-right text-foreground">
                              ИНН {!newClient.admin && <span className="text-destructive">*</span>}
                            </Label>
                            <Input id="new-inn" value={newClient.inn} onChange={(e) => setNewClient({...newClient, inn: e.target.value})} className="col-span-3" required={!newClient.admin} />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-name" className="text-right text-foreground">Название <span className="text-destructive">*</span></Label>
                            <Input id="new-name" value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})} className="col-span-3" required />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-address" className="text-right text-foreground">Адрес</Label>
                            <Input id="new-address" value={newClient.address} onChange={(e) => setNewClient({...newClient, address: e.target.value})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-foreground">Email / Телефон</Label>
                            <div className="col-span-3 flex gap-2">
                              <Input type="email" placeholder="Email" value={newClient.email} onChange={(e) => setNewClient({...newClient, email: e.target.value})} className="flex-1" />
                              <Input placeholder="Телефон" value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: e.target.value})} className="flex-1" />
                            </div>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-foreground">Логин / Пароль</Label>
                            <div className="col-span-3 flex gap-2">
                              <Input placeholder="Логин" value={newClient.login} onChange={(e) => setNewClient({...newClient, login: e.target.value})} className="flex-1" />
                              <div className="relative flex-1">
                                <Input
                                  placeholder="Пароль"
                                  type={showNewPassword ? "text" : "password"}
                                  value={newClient.password}
                                  onChange={(e) => setNewClient({...newClient, password: e.target.value})}
                                  className="pr-9 w-full"
                                />
                                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-2 hover:bg-transparent" onClick={() => setShowNewPassword(!showNewPassword)}>
                                  <Icon name={showNewPassword ? "EyeOff" : "Eye"} className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </div>
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
                              <span className="ml-3 text-sm text-muted-foreground">Доступ к панели администратора</span>
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
                            disabled={(!newClient.inn && !newClient.admin) || !newClient.name || !newClient.password}
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
                      <TableHead className="text-foreground font-bold py-2">Роль</TableHead>
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
                        <TableCell className="text-foreground py-2 max-w-[260px]">
                          <ClampText text={client.address} lines={2} />
                        </TableCell>
                        <TableCell className="text-foreground py-2">{client.phone}</TableCell>
                        <TableCell className="text-foreground py-2">{client.email}</TableCell>
                        <TableCell className="font-mono text-foreground py-2">{client.login}</TableCell>
                        <TableCell className="py-2">
                          {client.operator ? (
                            <Badge className="bg-accent text-accent-foreground w-fit">Оператор</Badge>
                          ) : (
                            <Badge className={client.admin ? 'bg-destructive text-destructive-foreground w-fit' : 'bg-primary text-primary-foreground w-fit'}>
                              {client.admin ? 'Админ' : 'Клиент'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex gap-1">
                            {client.operator && (
                              <Button size="sm" variant="outline" onClick={() => { setOperatorLinkDialog({open: true, client}); setOperatorLinkStation(''); setOperatorLinkPassword(''); setOperatorLinkCopied(false); }} className="h-7 w-7 p-0 border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground" title="Ссылка для ярлыка">
                                <Icon name="Link" className="w-3 h-3" />
                              </Button>
                            )}
                            {!client.admin && !client.operator && (
                              <Button size="sm" variant="outline" onClick={() => setMemoClient(client)} className="h-7 w-7 p-0 border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white" title="Печать памятки">
                                <Icon name="FileText" className="w-3 h-3" />
                              </Button>
                            )}
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
                            <Input id="new-card-code" value={newCard.card_code} onChange={(e) => setNewCard({...newCard, card_code: e.target.value})} className="col-span-3" placeholder="например: 0001" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-card-index" className="text-right text-foreground">Индекс</Label>
                            <Select value={newCard.card_index.toString()} onValueChange={(v) => setNewCard({...newCard, card_index: parseInt(v)})}>
                              <SelectTrigger id="new-card-index" className="col-span-3">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[0,1,2,3,4,5,6,7,8,9].map(i => (
                                  <SelectItem key={i} value={i.toString()}>{i} — код будет: {newCard.card_code || '????'}/{i}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                            <Label htmlFor="new-card-balance" className="text-right text-foreground">Баланс</Label>
                            <Input id="new-card-balance" type="number" value={newCard.balance_liters} onChange={(e) => setNewCard({...newCard, balance_liters: parseFloat(e.target.value)})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-card-pin" className="text-right text-foreground">PIN-код</Label>
                            <Input id="new-card-pin" type="password" value={newCard.pin_code} onChange={(e) => setNewCard({...newCard, pin_code: e.target.value})} className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-card-daily-limit" className="text-right text-foreground">Дневной лимит</Label>
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
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label className="text-foreground">Код карты</Label>
                    <Input
                      placeholder="Поиск по коду..."
                      value={filterCardCode}
                      onChange={(e) => setFilterCardCode(e.target.value)}
                      className="bg-input border-2 border-border text-foreground"
                    />
                  </div>
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
                      <TableHead className="text-foreground font-bold">Баланс</TableHead>
                      <TableHead className="text-foreground font-bold">Дневной лимит</TableHead>
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
                              {cardLabel(card)}
                            </span>
                            {card.card_code === '0000' && (
                              <Icon name="Wallet" size={16} className="text-accent" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground py-1 max-w-[220px]"><ClampText text={card.client_name} lines={2} /></TableCell>
                        <TableCell className="text-foreground py-1 max-w-[160px]"><ClampText text={card.fuel_type} lines={2} /></TableCell>
                        <TableCell className="font-bold text-accent py-1">{card.balance_liters.toFixed(3)} {getCardUnit(card)}</TableCell>
                        <TableCell className="text-foreground py-1">
                          {card.daily_limit > 0 ? `${card.daily_limit.toFixed(3)} ${getCardUnit(card)}` : <span className="text-muted-foreground">без лимита</span>}
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
                            <Button size="icon" variant="outline" onClick={() => handleTransferCard(card.id)} className="h-7 w-7 border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground" title="Переместить топливо">
                              <Icon name="ArrowLeftRight" className="w-3 h-3" />
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
                    <Button onClick={handleExportOperations} variant="outline" size="sm" className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                      <Icon name="FileSpreadsheet" className="w-4 h-4 mr-2" />
                      Экспорт в Excel
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
                                    {cardLabel(card)} - {card.client_name} ({card.fuel_type})
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
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <Label className="text-foreground">Клиент</Label>
                    <Select value={filterOpClient} onValueChange={setFilterOpClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все клиенты" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все клиенты</SelectItem>
                        {uniqueOpClientNames.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground">Вид топлива</Label>
                    <Select value={filterOpFuelType} onValueChange={setFilterOpFuelType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все виды" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все виды</SelectItem>
                        {uniqueOpFuelTypes.map((ft) => (
                          <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground">Карта</Label>
                    <Select value={filterCard} onValueChange={setFilterCard}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все карты" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все карты</SelectItem>
                        {uniqueCardLabels.map((label) => (
                          <SelectItem key={label} value={label}>{label}</SelectItem>
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
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
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
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="border-b-2 border-border">
                        <TableHead className="text-foreground font-bold h-7 px-2 py-0 text-xs whitespace-nowrap">Карта</TableHead>
                        <TableHead className="text-foreground font-bold h-7 px-2 py-0 text-xs whitespace-nowrap">Клиент</TableHead>
                        <TableHead className="text-foreground font-bold h-7 px-2 py-0 text-xs whitespace-nowrap">Топливо</TableHead>
                        <TableHead className="text-foreground font-bold h-7 px-2 py-0 text-xs whitespace-nowrap">АЗС</TableHead>
                        <TableHead className="text-foreground font-bold h-7 px-2 py-0 text-xs whitespace-nowrap">Дата</TableHead>
                        <TableHead className="text-foreground font-bold h-7 px-2 py-0 text-xs whitespace-nowrap">Операция</TableHead>
                        <TableHead className="text-foreground font-bold h-7 px-2 py-0 text-xs whitespace-nowrap">Кол-во</TableHead>
                        <TableHead className="text-foreground font-bold h-7 px-2 py-0 text-xs whitespace-nowrap">Цена</TableHead>
                        <TableHead className="text-foreground font-bold h-7 px-2 py-0 text-xs whitespace-nowrap">Сумма</TableHead>
                        <TableHead className="text-foreground font-bold h-7 px-2 py-0 text-xs whitespace-nowrap">Комментарий</TableHead>
                        <TableHead className="text-foreground font-bold h-7 px-2 py-0 text-xs whitespace-nowrap">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedOperations.map((op) => (
                        <TableRow key={op.id} className="border-b border-border h-6">
                          <TableCell className="font-mono px-2 py-0.5 text-xs whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={op.card_code === '0000' ? 'bg-accent text-background px-1 rounded' : 'text-accent'}>
                                {cardLabel(op)}
                              </span>
                              {op.card_code === '0000' && (
                                <Icon name="Wallet" size={12} className="text-accent" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-foreground px-2 py-0.5 text-xs max-w-[200px]"><ClampText text={op.client_name} lines={2} /></TableCell>
                          <TableCell className="text-foreground px-2 py-0.5 text-xs max-w-[140px]"><ClampText text={op.op_fuel_type || op.fuel_type} lines={2} /></TableCell>
                          <TableCell className="text-foreground px-2 py-0.5 text-xs max-w-[160px]"><ClampText text={op.station_name} lines={2} /></TableCell>
                          <TableCell className="text-muted-foreground px-2 py-0.5 text-xs">{op.operation_date}</TableCell>
                          <TableCell className="px-2 py-0.5">
                            <Badge className={`${getOperationColor(op.operation_type)} px-1.5 py-0 text-[11px] leading-4 font-medium`}>
                              {op.operation_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-foreground px-2 py-0.5 text-xs whitespace-nowrap">{op.quantity.toFixed(3)}</TableCell>
                          <TableCell className="text-foreground px-2 py-0.5 text-xs">{op.price.toFixed(2)}</TableCell>
                          <TableCell className="font-bold text-accent px-2 py-0.5 text-xs whitespace-nowrap">{op.amount.toFixed(2)} ₽</TableCell>
                          <TableCell className="text-muted-foreground px-2 py-0.5 text-xs max-w-[260px]"><ClampText text={op.comment} lines={2} /></TableCell>
                          <TableCell className="px-2 py-0.5">
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => handleEditOperation(op)} className="h-6 w-6 p-0 border border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                                <Icon name="Pencil" className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteOperation(op.id)} className="h-6 w-6 p-0">
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
                onPageSizeChange={(s) => { setOpsPageSize(s); localStorage.setItem('admin_ops_page_size', String(s)); setOpsPage(1); }}
              />
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <TurnoverReportTab clients={clients} showAlert={showAlert} />
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
                      <TableHead className="text-foreground font-bold h-8 px-3 py-0 text-sm">Наименование</TableHead>
                      <TableHead className="text-foreground font-bold h-8 px-3 py-0 text-sm">Код 1С</TableHead>
                      <TableHead className="text-foreground font-bold h-8 px-3 py-0 text-sm">Адрес</TableHead>
                      <TableHead className="text-foreground font-bold h-8 px-3 py-0 text-sm">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stations.map((station) => (
                      <TableRow key={station.id} className="border-b border-border h-8">
                        <TableCell className="font-medium text-foreground px-3 py-1 text-sm">{station.name}</TableCell>
                        <TableCell className="font-mono text-muted-foreground px-3 py-1 text-sm">{station.code_1c}</TableCell>
                        <TableCell className="text-foreground px-3 py-1 text-sm">{station.address}</TableCell>
                        <TableCell className="px-3 py-1">
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleEditStation(station)} className="h-6 w-6 p-0 border border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                              <Icon name="Pencil" className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteStation(station.id)} className="h-6 w-6 p-0">
                              <Icon name="Trash2" className="w-3 h-3" />
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
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="new-fuel-unit" className="text-right text-foreground">Ед. изм.</Label>
                            <Select value={newFuelType.unit} onValueChange={(v) => setNewFuelType({...newFuelType, unit: v})}>
                              <SelectTrigger id="new-fuel-unit" className="col-span-3">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="л">л — литры</SelectItem>
                                <SelectItem value="₽">₽ — рубли</SelectItem>
                                <SelectItem value="шт">шт — штуки</SelectItem>
                                <SelectItem value="кг">кг — килограммы</SelectItem>
                              </SelectContent>
                            </Select>
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
                      <TableHead className="text-foreground font-bold h-8 px-3 py-0 text-sm">Название</TableHead>
                      <TableHead className="text-foreground font-bold h-8 px-3 py-0 text-sm">Код 1С</TableHead>
                      <TableHead className="text-foreground font-bold h-8 px-3 py-0 text-sm">Ед. изм.</TableHead>
                      <TableHead className="text-foreground font-bold h-8 px-3 py-0 text-sm">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuelTypes.map((fuelType) => (
                      <TableRow key={fuelType.id} className="border-b border-border h-8">
                        <TableCell className="font-medium text-foreground px-3 py-1 text-sm">{fuelType.name}</TableCell>
                        <TableCell className="font-mono text-muted-foreground px-3 py-1 text-sm">{fuelType.code_1c}</TableCell>
                        <TableCell className="font-mono text-accent font-bold px-3 py-1 text-sm">{fuelType.unit || 'л'}</TableCell>
                        <TableCell className="px-3 py-1">
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleEditFuelType(fuelType)} className="h-6 w-6 p-0 border border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                              <Icon name="Pencil" className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteFuelType(fuelType.id)} className="h-6 w-6 p-0">
                              <Icon name="Trash2" className="w-3 h-3" />
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

          <TabsContent value="database">
            <DatabaseArchives />
          </TabsContent>
        </Tabs>
      </main>
  );
}