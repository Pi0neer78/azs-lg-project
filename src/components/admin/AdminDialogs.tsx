import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import ClientMemo from '@/components/ClientMemo';
import type { AdminState } from './useAdminDashboard';

export default function AdminDialogs({ dash }: { dash: AdminState }) {
  const {
    stations,
    editingClient,
    setEditingClient,
    isClientDialogOpen,
    setIsClientDialogOpen,
    showEditPassword,
    setShowEditPassword,
    generatePassword,
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
    handleSaveClient,
    editingStation,
    setEditingStation,
    isStationDialogOpen,
    setIsStationDialogOpen,
    handleSaveStation,
    editingFuelType,
    setEditingFuelType,
    isFuelTypeDialogOpen,
    setIsFuelTypeDialogOpen,
    handleSaveFuelType,
    editingOperation,
    setEditingOperation,
    isOperationDialogOpen,
    setIsOperationDialogOpen,
    balanceChangeDialog,
    setBalanceChangeDialog,
    handleSaveOperation
  } = dash;

  return (
    <>
      <Dialog open={operatorLinkDialog.open} onOpenChange={(open) => setOperatorLinkDialog({...operatorLinkDialog, open})}>
        <DialogContent className="max-w-lg bg-card border-2 border-accent">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Icon name="Link" className="text-accent" />
              Ярлык для оператора
            </DialogTitle>
          </DialogHeader>
          {operatorLinkDialog.client && (() => {
            const link = operatorLinkStation && operatorLinkPassword
              ? `http://azs-lg.ru/operator?station=${operatorLinkStation}&login=${encodeURIComponent(operatorLinkDialog.client.login)}&password=${encodeURIComponent(operatorLinkPassword)}`
              : '';
            return (
              <div className="space-y-4 py-2">
                <div className="p-3 rounded-lg bg-accent/10 border border-accent text-sm text-foreground">
                  <span className="font-semibold text-accent">{operatorLinkDialog.client.name}</span>
                  <span className="text-muted-foreground ml-2">(логин: {operatorLinkDialog.client.login})</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground">АЗС</Label>
                  <Select value={operatorLinkStation} onValueChange={setOperatorLinkStation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите АЗС..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.filter(s => !s.name.toLowerCase().includes('склад')).map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground">Пароль оператора</Label>
                  <Input
                    type="text"
                    placeholder="Введите пароль..."
                    value={operatorLinkPassword}
                    onChange={(e) => { setOperatorLinkPassword(e.target.value); setOperatorLinkCopied(false); }}
                  />
                </div>
                {link && (
                  <div className="space-y-2">
                    <Label className="text-foreground">Ссылка для ярлыка</Label>
                    <textarea
                      readOnly
                      value={link}
                      rows={3}
                      onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      onFocus={(e) => (e.target as HTMLTextAreaElement).select()}
                      className="w-full bg-input border-2 border-accent rounded-md px-3 py-2 text-sm text-foreground font-mono outline-none resize-none cursor-pointer"
                    />
                    <Button
                      onClick={(e) => {
                        const textarea = (e.currentTarget as HTMLElement).previousElementSibling as HTMLTextAreaElement;
                        textarea?.select();
                        try {
                          document.execCommand('copy');
                          setOperatorLinkCopied(true);
                          setTimeout(() => setOperatorLinkCopied(false), 2000);
                        } catch {
                          setOperatorLinkCopied(false);
                        }
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(link).then(() => {
                            setOperatorLinkCopied(true);
                            setTimeout(() => setOperatorLinkCopied(false), 2000);
                          }).catch(() => {});
                        }
                      }}
                      className={`w-full ${operatorLinkCopied ? 'bg-green-600 text-white hover:bg-green-600' : 'bg-accent text-accent-foreground hover:bg-accent/90'}`}
                    >
                      <Icon name={operatorLinkCopied ? 'Check' : 'Copy'} className="w-4 h-4 mr-2" />
                      {operatorLinkCopied ? 'Скопировано!' : 'Копировать ссылку'}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Кликните на поле со ссылкой — она выделится, затем Ctrl+C для копирования
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOperatorLinkDialog({open: false, client: null})} className="border-2 border-border">Закрыть</Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-password" className="text-right text-foreground">Пароль</Label>
                <div className="col-span-3 flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="edit-password"
                      type={showEditPassword ? "text" : "password"}
                      placeholder="Новый пароль"
                      value={editingClient.password || ''}
                      onChange={(e) => setEditingClient({...editingClient, password: e.target.value})}
                      className="pr-9 w-full"
                    />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-2 hover:bg-transparent" onClick={() => setShowEditPassword(!showEditPassword)}>
                      <Icon name={showEditPassword ? "EyeOff" : "Eye"} className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <Button type="button" variant="outline" onClick={() => { setEditingClient({...editingClient, password: generatePassword()}); setShowEditPassword(true); }} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                    <Icon name="RefreshCw" className="w-4 h-4 mr-2" />
                    Сгенерировать
                  </Button>
                </div>
              </div>
              {editingClient.admin && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-operator" className="text-right text-foreground">Оператор АЗС</Label>
                  <div className="col-span-3 flex items-center">
                    <input
                      id="edit-operator"
                      type="checkbox"
                      checked={!!editingClient.operator}
                      onChange={(e) => setEditingClient({...editingClient, operator: e.target.checked})}
                      className="h-4 w-4 accent-[hsl(var(--accent))]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsClientDialogOpen(false)} className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">Отмена</Button>
            <Button onClick={handleSaveClient} className="bg-accent text-accent-foreground hover:bg-accent/90">Сохранить</Button>
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-fuel-unit" className="text-right text-foreground">Ед. изм.</Label>
                <Select value={editingFuelType.unit || 'л'} onValueChange={(v) => setEditingFuelType({...editingFuelType, unit: v})}>
                  <SelectTrigger id="edit-fuel-unit" className="col-span-3">
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

      {memoClient && (
        <ClientMemo client={memoClient} onClose={() => setMemoClient(null)} />
      )}
    </>
  );
}
