import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import CardFuelPrices from '@/components/CardFuelPrices';
import type { AdminState } from './useAdminDashboard';

export default function AdminCardDialogs({ dash }: { dash: AdminState }) {
  const {
    fuelTypes,
    cards,
    recalculateDialogOpen,
    setRecalculateDialogOpen,
    recalculateResult,
    topupDialogOpen,
    setTopupDialogOpen,
    topupCardId,
    topupQuantity,
    topupPrice,
    topupAmount,
    topupComment,
    setTopupComment,
    topupSuccessDialog,
    setTopupSuccessDialog,
    blockCardDialogOpen,
    setBlockCardDialogOpen,
    unblockCardDialogOpen,
    setUnblockCardDialogOpen,
    blockCardId,
    blockCardReason,
    setBlockCardReason,
    transferDialogOpen,
    setTransferDialogOpen,
    transferConfirmOpen,
    setTransferConfirmOpen,
    transferFromCardId,
    transferToCardId,
    setTransferToCardId,
    transferDebitQty,
    setTransferDebitQty,
    transferCreditQty,
    setTransferCreditQty,
    transferLoading,
    transferSuccessDialog,
    setTransferSuccessDialog,
    confirmBlockCard,
    confirmUnblockCard,
    handleTopupQuantityChange,
    handleTopupPriceChange,
    handleTopupAmountChange,
    confirmTopup,
    confirmRecalculateBalance,
    closeRecalculateDialog,
    handleTransferConfirm,
    confirmTransfer,
    cardLabel,
    getCardUnit,
    editingCard,
    setEditingCard,
    isCardDialogOpen,
    setIsCardDialogOpen,
    setIsAddCardDialogOpen,
    cardSuccessDialog,
    setCardSuccessDialog,
    cardDuplicateDialog,
    setCardDuplicateDialog,
    fuelTypeWarningDialog,
    setFuelTypeWarningDialog,
    handleSaveCard,
    handleFuelTypeChange
  } = dash;

  return (
    <>
      <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-2 border-primary">
          <DialogHeader>
            <DialogTitle className="text-foreground">Редактировать карту</DialogTitle>
          </DialogHeader>
          {editingCard && (
            (fuelTypes.find((ft) => ft.id === editingCard.fuel_type_id)?.unit === '₽') ? (
              <Tabs defaultValue="main">
                <TabsList>
                  <TabsTrigger value="main">Основное</TabsTrigger>
                  <TabsTrigger value="fuel">Доступное топливо</TabsTrigger>
                </TabsList>
                <TabsContent value="main" className="h-[540px] overflow-y-auto">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-code" className="text-right text-foreground">Код карты</Label>
                <Input id="edit-card-code" value={editingCard.card_code} onChange={(e) => setEditingCard({...editingCard, card_code: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-index" className="text-right text-foreground">Индекс</Label>
                <Select value={(editingCard.card_index ?? 0).toString()} onValueChange={(v) => setEditingCard({...editingCard, card_index: parseInt(v)})}>
                  <SelectTrigger id="edit-card-index" className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0,1,2,3,4,5,6,7,8,9].map(i => (
                      <SelectItem key={i} value={i.toString()}>{editingCard.card_code}/{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label htmlFor="edit-card-balance" className="text-right text-foreground">Баланс</Label>
                <Input id="edit-card-balance" type="number" value={editingCard.balance_liters} onChange={(e) => setEditingCard({...editingCard, balance_liters: parseFloat(e.target.value)})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-pin" className="text-right text-foreground">PIN-код</Label>
                <Input id="edit-card-pin" type="password" value={editingCard.pin_code} onChange={(e) => setEditingCard({...editingCard, pin_code: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-daily-limit" className="text-right text-foreground">Дневной лимит</Label>
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

                </TabsContent>
                <TabsContent value="fuel" className="h-[540px] overflow-y-auto">
                  <CardFuelPrices cardId={editingCard.id} fuelTypes={fuelTypes} />
                </TabsContent>
              </Tabs>
            ) : (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-code" className="text-right text-foreground">Код карты</Label>
                <Input id="edit-card-code" value={editingCard.card_code} onChange={(e) => setEditingCard({...editingCard, card_code: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-index" className="text-right text-foreground">Индекс</Label>
                <Select value={(editingCard.card_index ?? 0).toString()} onValueChange={(v) => setEditingCard({...editingCard, card_index: parseInt(v)})}>
                  <SelectTrigger id="edit-card-index" className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0,1,2,3,4,5,6,7,8,9].map(i => (
                      <SelectItem key={i} value={i.toString()}>{editingCard.card_code}/{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label htmlFor="edit-card-balance" className="text-right text-foreground">Баланс</Label>
                <Input id="edit-card-balance" type="number" value={editingCard.balance_liters} onChange={(e) => setEditingCard({...editingCard, balance_liters: parseFloat(e.target.value)})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-pin" className="text-right text-foreground">PIN-код</Label>
                <Input id="edit-card-pin" type="password" value={editingCard.pin_code} onChange={(e) => setEditingCard({...editingCard, pin_code: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-card-daily-limit" className="text-right text-foreground">Дневной лимит</Label>
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

            )
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

      <Dialog open={cardDuplicateDialog.open} onOpenChange={(open) => setCardDuplicateDialog({...cardDuplicateDialog, open})}>
        <DialogContent className="max-w-md bg-card border-4 border-destructive">
          <DialogHeader>
            <div className="flex flex-col items-center gap-4 pt-2">
              <div className="w-20 h-20 rounded-full bg-destructive/15 border-4 border-destructive flex items-center justify-center">
                <Icon name="CreditCard" size={42} className="text-destructive" />
              </div>
              <DialogTitle className="text-2xl text-destructive text-center font-black uppercase tracking-wide">
                Карта уже существует!
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="py-4 text-center space-y-3">
            <p className="text-foreground text-lg">
              Карта с кодом{' '}
              <span className="font-mono font-black text-destructive text-xl">
                {cardDuplicateDialog.card_code}/{cardDuplicateDialog.card_index}
              </span>{' '}
              уже зарегистрирована в системе.
            </p>
            <p className="text-muted-foreground text-sm">
              Выберите другой код карты или другой индекс.
            </p>
          </div>
          <div className="flex justify-center pb-2">
            <Button
              onClick={() => {
                const src = cardDuplicateDialog.source;
                setCardDuplicateDialog({open: false, card_code: '', card_index: 0, source: 'create'});
                if (src === 'edit') setIsCardDialogOpen(true);
                else setIsAddCardDialogOpen(true);
              }}
              className="h-12 px-8 text-lg font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Изменить данные
            </Button>
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
                    <span className="font-mono text-xl font-bold text-accent">{cardLabel(cardSuccessDialog.card)}</span>
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

      {/* Диалог перемещения топлива — выбор параметров */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-2 border-accent">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Icon name="ArrowLeftRight" className="text-accent" />
              Перемещение топлива между картами
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const fromCard = cards.find(c => c.id === transferFromCardId);
            const toCard = cards.find(c => c.id === parseInt(transferToCardId));
            return (
              <div className="space-y-4 py-2">
                {fromCard && (
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent">
                    <div className="text-xs text-muted-foreground mb-1">Карта-источник (списание)</div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-accent">{cardLabel(fromCard)}</span>
                      <span className="text-sm text-foreground">{fromCard.client_name}</span>
                      <span className="text-sm font-semibold text-foreground">{fromCard.fuel_type}</span>
                      <span className="font-bold text-primary">{fromCard.balance_liters.toFixed(3)} {getCardUnit(fromCard)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-foreground">Карта-назначение (оприходование)</Label>
                  <Select value={transferToCardId} onValueChange={setTransferToCardId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите карту назначения" />
                    </SelectTrigger>
                    <SelectContent>
                      {cards.filter(c => c.id !== transferFromCardId).map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {cardLabel(c)} — {c.client_name} ({c.fuel_type}) / {c.balance_liters.toFixed(3)} {getCardUnit(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-foreground">
                      Списать {fromCard ? `(${fromCard.fuel_type})` : ''}, л
                    </Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      placeholder="0.000"
                      value={transferDebitQty}
                      onChange={(e) => setTransferDebitQty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-foreground">
                      Оприходовать {toCard ? `(${toCard.fuel_type})` : ''}, л
                    </Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      placeholder="0.000"
                      value={transferCreditQty}
                      onChange={(e) => setTransferCreditQty(e.target.value)}
                    />
                  </div>
                </div>

                {fromCard && transferDebitQty && parseFloat(transferDebitQty) > fromCard.balance_liters && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive text-sm text-destructive flex items-center gap-2">
                    <Icon name="AlertTriangle" size={16} />
                    Недостаточно топлива. Баланс карты: {fromCard.balance_liters.toFixed(3)} л
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setTransferDialogOpen(false)} className="border-2 border-muted text-foreground">
                    <Icon name="X" size={16} className="mr-2" />
                    Отмена
                  </Button>
                  <Button
                    onClick={handleTransferConfirm}
                    disabled={!transferToCardId || !transferDebitQty || !transferCreditQty || (fromCard ? parseFloat(transferDebitQty) > fromCard.balance_liters : false)}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    <Icon name="ArrowRight" size={16} className="mr-2" />
                    Далее
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения перемещения */}
      <Dialog open={transferConfirmOpen} onOpenChange={(open) => { if (!open && !transferLoading) setTransferConfirmOpen(false); }}>
        <DialogContent className="max-w-md bg-card border-2 border-accent">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Icon name="AlertTriangle" className="text-accent" />
              Подтвердите перемещение
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const fromCard = cards.find(c => c.id === transferFromCardId);
            const toCard = cards.find(c => c.id === parseInt(transferToCardId));
            if (!fromCard || !toCard) return null;
            return (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-lg bg-accent/10 border-2 border-accent space-y-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Списание с карты</div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-accent text-lg">{cardLabel(fromCard)}</span>
                      <span className="text-sm text-foreground">{fromCard.client_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Вид топлива:</span>
                      <span className="font-semibold">{fromCard.fuel_type}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Объём списания:</span>
                      <span className="font-bold text-destructive text-lg">−{parseFloat(transferDebitQty || '0').toFixed(3)} л</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Баланс после:</span>
                      <span>{(fromCard.balance_liters - parseFloat(transferDebitQty || '0')).toFixed(3)} л</span>
                    </div>
                  </div>

                  <div className="flex justify-center py-1">
                    <Icon name="ArrowDown" size={24} className="text-accent" />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Оприходование на карту</div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-accent text-lg">{cardLabel(toCard)}</span>
                      <span className="text-sm text-foreground">{toCard.client_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Вид топлива:</span>
                      <span className="font-semibold">{toCard.fuel_type}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Объём оприходования:</span>
                      <span className="font-bold text-primary text-lg">+{parseFloat(transferCreditQty || '0').toFixed(3)} л</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Баланс после:</span>
                      <span>{(toCard.balance_liters + parseFloat(transferCreditQty || '0')).toFixed(3)} л</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setTransferConfirmOpen(false); setTransferDialogOpen(true); }} disabled={transferLoading} className="border-2 border-muted text-foreground">
                    <Icon name="ChevronLeft" size={16} className="mr-2" />
                    Назад
                  </Button>
                  <Button onClick={confirmTransfer} disabled={transferLoading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {transferLoading ? <Icon name="Loader2" size={16} className="mr-2 animate-spin" /> : <Icon name="CheckCircle2" size={16} className="mr-2" />}
                    Подтвердить
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Диалог успешного перемещения */}
      <Dialog open={transferSuccessDialog.open} onOpenChange={(open) => setTransferSuccessDialog({...transferSuccessDialog, open})}>
        <DialogContent className="max-w-md bg-card border-2 border-primary">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Icon name="CheckCircle2" size={28} className="text-primary" />
              </div>
              <DialogTitle className="text-xl text-foreground">Перемещение выполнено!</DialogTitle>
            </div>
          </DialogHeader>
          {transferSuccessDialog.result && (
            <div className="py-2 space-y-3">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive space-y-1">
                <div className="text-xs text-muted-foreground">Списано с карты {transferSuccessDialog.result.from_card?.label}</div>
                <div className="flex justify-between">
                  <span className="text-sm text-foreground">{transferSuccessDialog.result.from_card?.client_name} / {transferSuccessDialog.result.from_card?.fuel_type}</span>
                  <span className="font-bold text-destructive">−{parseFloat(transferDebitQty || '0').toFixed(3)} л</span>
                </div>
                <div className="text-xs text-muted-foreground">Новый баланс: {transferSuccessDialog.result.from_card?.new_balance?.toFixed(3)} л</div>
              </div>
              <div className="flex justify-center">
                <Icon name="ArrowDown" size={20} className="text-primary" />
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary space-y-1">
                <div className="text-xs text-muted-foreground">Оприходовано на карту {transferSuccessDialog.result.to_card?.label}</div>
                <div className="flex justify-between">
                  <span className="text-sm text-foreground">{transferSuccessDialog.result.to_card?.client_name} / {transferSuccessDialog.result.to_card?.fuel_type}</span>
                  <span className="font-bold text-primary">+{parseFloat(transferCreditQty || '0').toFixed(3)} л</span>
                </div>
                <div className="text-xs text-muted-foreground">Новый баланс: {transferSuccessDialog.result.to_card?.new_balance?.toFixed(3)} л</div>
              </div>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button onClick={() => setTransferSuccessDialog({open: false, result: null})} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Icon name="CheckCircle2" size={16} className="mr-2" />
              Отлично!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
