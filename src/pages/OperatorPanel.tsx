import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const OPERATOR_API = 'https://functions.poehali.dev/63d97170-36d0-4590-bf1f-e247777c20db';
const AUTH_API = 'https://functions.poehali.dev/9f5ff2f8-a6c2-489f-8a85-40f260bbac9e';
const STATIONS_API = 'https://functions.poehali.dev/80fb772c-a848-45ed-84c5-780c2b3e690c';

interface Station {
  id: number;
  name: string;
  code_1c: string;
  address: string;
}

interface CardInfo {
  id: number;
  card_code: string;
  card_index: number;
  fuel_type: string;
  balance_liters: number;
  daily_limit: number;
  available_balance: number;
  client_name: string;
  multiple?: boolean;
}

type Stage = 'login' | 'scan' | 'select' | 'card' | 'confirm';

function NumpadModal({
  value,
  unit,
  onConfirm,
  onCancel,
}: {
  value: string;
  unit: string;
  onConfirm: (v: string) => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState(value);

  const press = (key: string) => {
    setInput((prev) => {
      if (key === 'DEL') return prev.slice(0, -1);
      if (key === 'CLR') return '';
      if (key === '.') {
        if (prev.includes('.')) return prev;
        return prev === '' ? '0.' : prev + '.';
      }
      const parts = prev.split('.');
      if (parts[1] !== undefined && parts[1].length >= 3) return prev;
      return prev + key;
    });
  };

  const keys = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['CLR', '0', '.'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border-2 border-accent rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 flex flex-col gap-4">
        <div className="text-center text-muted-foreground text-lg font-medium">Введите количество ({unit})</div>
        <div
          className="bg-input border-2 border-accent rounded-xl px-4 py-3 text-center font-mono font-bold text-foreground"
          style={{ fontSize: '3rem', letterSpacing: '0.05em', minHeight: '5rem', lineHeight: 1 }}
        >
          {input || <span className="text-muted-foreground/50">0</span>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {keys.map((row, ri) =>
            row.map((k) => (
              <button
                key={`${ri}-${k}`}
                onClick={() => press(k)}
                className={`rounded-xl font-bold transition-all active:scale-95 select-none
                  ${k === 'CLR'
                    ? 'bg-destructive/20 text-destructive border-2 border-destructive/40 hover:bg-destructive/30'
                    : 'bg-secondary text-foreground border-2 border-border hover:bg-accent hover:text-accent-foreground hover:border-accent'
                  }`}
                style={{ fontSize: '2rem', height: '4rem' }}
              >
                {k === 'CLR' ? <Icon name="Delete" size={24} className="mx-auto" /> : k}
              </button>
            ))
          )}
        </div>
        <button
          onClick={() => press('DEL')}
          className="w-full rounded-xl border-2 border-border bg-secondary text-foreground hover:bg-muted font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
          style={{ height: '3.5rem', fontSize: '1.2rem' }}
        >
          <Icon name="Delete" size={20} />
          Стереть
        </button>
        <div className="flex gap-3 mt-1">
          <Button onClick={onCancel} variant="outline" className="flex-1 h-14 text-lg font-bold border-2 border-border">
            Отмена
          </Button>
          <Button
            onClick={() => onConfirm(input)}
            disabled={!input || input === '0' || input === '0.'}
            className="flex-1 h-14 text-lg font-bold bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40"
          >
            ОК
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function OperatorPanel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [stage, setStage] = useState<Stage>('login');

  const [stations, setStations] = useState<Station[]>([]);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [barcode, setBarcode] = useState('');
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [multipleCards, setMultipleCards] = useState<CardInfo[]>([]);
  const [cardError, setCardError] = useState('');
  const [cardLoading, setCardLoading] = useState(false);

  const [quantity, setQuantity] = useState('');
  const [showNumpad, setShowNumpad] = useState(false);
  const [invalidCodeWarning, setInvalidCodeWarning] = useState<string | null>(null);
  const [dispenseError, setDispenseError] = useState('');
  const [dispenseLoading, setDispenseLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const barcodeRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urlLogin = searchParams.get('login');
    const urlPassword = searchParams.get('password');
    const urlStation = searchParams.get('station');

    fetch(STATIONS_API)
      .then((r) => r.json())
      .then((d) => {
        const list: Station[] = d.stations || [];
        setStations(list);

        if (urlLogin && urlPassword && urlStation) {
          const st = list.find((s) => s.id === Number(urlStation));
          if (st) {
            setLogin(urlLogin);
            setPassword(urlPassword);
            setSelectedStation(st);
            autoLogin(urlLogin, urlPassword, st);
            return;
          }
        }

        const saved = localStorage.getItem('operator_session');
        if (saved) {
          try {
            const { login: sl, password: sp, stationId } = JSON.parse(saved);
            const st = list.find((s) => s.id === stationId);
            if (sl && sp && st) {
              setLogin(sl);
              setPassword(sp);
              setSelectedStation(st);
              autoLogin(sl, sp, st);
            }
          } catch (e) {
            console.warn('operator_session parse error', e);
          }
        }
      })
      .finally(() => setStationsLoading(false));
  }, []);

  const autoLogin = async (l: string, p: string, st: Station) => {
    setAuthLoading(true);
    try {
      const res = await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: l, password: p }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user.admin) {
        setSelectedStation(st);
        setStage('scan');
      } else {
        localStorage.removeItem('operator_session');
      }
    } catch {
      localStorage.removeItem('operator_session');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (stage === 'scan') {
      setTimeout(() => barcodeRef.current?.focus(), 50);
    }
    if (stage === 'card') {
      setTimeout(() => quantityRef.current?.focus(), 50);
    }
  }, [stage]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user.admin) {
        if (selectedStation) {
          localStorage.setItem('operator_session', JSON.stringify({ login, password, stationId: selectedStation.id }));
        }
        setStage('scan');
      } else if (res.ok && data.success && !data.user.admin) {
        setAuthError('Доступ только для операторов');
      } else {
        setAuthError(data.error || 'Неверный логин или пароль');
      }
    } catch {
      setAuthError('Ошибка соединения с сервером');
    } finally {
      setAuthLoading(false);
    }
  };

  const extractCardCode = (raw: string): string => {
    const cleaned = raw.trim();
    if (cleaned.length === 4) return cleaned;
    if (cleaned.length >= 12) return cleaned.substring(8, 12);
    return cleaned;
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    setCardError('');
    const code = extractCardCode(barcode);

    if (code === '0000') {
      setInvalidCodeWarning('Карта с кодом 0000 является системной и не может использоваться для отпуска топлива.');
      setBarcode('');
      return;
    }
    if (!/^\d{1,4}$/.test(code)) {
      setInvalidCodeWarning(`Код карты «${code}» содержит недопустимые символы. Код карты должен состоять только из цифр.`);
      setBarcode('');
      return;
    }

    setCardLoading(true);
    try {
      const res = await fetch(`${OPERATOR_API}?card_code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (res.ok) {
        if (data.multiple && data.cards) {
          setMultipleCards(data.cards);
          setQuantity('');
          setDispenseError('');
          setSuccessMsg('');
          setStage('select');
        } else {
          setCardInfo(data);
          setQuantity('');
          setDispenseError('');
          setSuccessMsg('');
          setStage('card');
        }
      } else {
        setCardError(data.error || 'Карта не найдена');
        setBarcode('');
        setTimeout(() => barcodeRef.current?.focus(), 50);
      }
    } catch {
      setCardError('Ошибка соединения с сервером');
    } finally {
      setCardLoading(false);
    }
  };

  const handleDispense = () => {
    if (!cardInfo) return;
    const qty = parseFloat(quantity.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      setDispenseError('Введите корректное количество топлива');
      return;
    }
    if (qty > cardInfo.available_balance) {
      setDispenseError(`Превышает доступный остаток: ${cardInfo.available_balance.toFixed(3)} л`);
      return;
    }
    setStage('confirm');
  };

  const handleConfirmYes = async () => {
    if (!cardInfo || !selectedStation) return;
    setDispenseError('');
    setDispenseLoading(true);
    const qty = parseFloat(quantity.replace(',', '.'));
    try {
      const res = await fetch(OPERATOR_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: cardInfo.id,
          quantity: qty,
          station_id: selectedStation.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Отпущено ${qty.toFixed(3)} ${cardInfo.fuel_type}. Остаток: ${data.new_balance.toFixed(3)} ${cardInfo.fuel_type}`);
        setTimeout(() => handleReset(), 4000);
      } else {
        setDispenseError(data.error || 'Ошибка списания');
        setStage('card');
      }
    } catch {
      setDispenseError('Ошибка соединения с сервером');
      setStage('card');
    } finally {
      setDispenseLoading(false);
    }
  };

  const handleReset = () => {
    setBarcode('');
    setCardInfo(null);
    setMultipleCards([]);
    setCardError('');
    setQuantity('');
    setDispenseError('');
    setSuccessMsg('');
    setStage('scan');
  };

  const handleSelectCard = (card: CardInfo) => {
    setCardInfo(card);
    setMultipleCards([]);
    setQuantity('');
    setDispenseError('');
    setSuccessMsg('');
    setStage('card');
  };

  const cardLabel = (card: { card_code: string; card_index: number }) =>
    `${card.card_code}/${card.card_index}`;

  const handleNumpadConfirm = (val: string) => {
    setQuantity(val);
    setShowNumpad(false);
    setDispenseError('');
  };

  const qty = parseFloat(quantity.replace(',', '.'));
  const validQty = !isNaN(qty) && qty > 0;

  if (stage === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl font-bold text-accent mb-8 text-center">Панель оператора</h1>
        <Card className="w-full max-w-sm border-2 border-accent shadow-xl bg-card/95">
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">

              <div className="space-y-1">
                <label className="text-sm text-foreground font-medium">АЗС</label>
                {stationsLoading ? (
                  <div className="h-11 flex items-center text-muted-foreground text-sm px-2">Загрузка...</div>
                ) : (
                  <select
                    value={selectedStation?.id ?? ''}
                    onChange={(e) => {
                      const st = stations.find((s) => s.id === Number(e.target.value)) || null;
                      setSelectedStation(st);
                    }}
                    required
                    className="w-full h-11 rounded-md border-2 border-border bg-input text-foreground px-3 text-base focus:border-accent outline-none"
                  >
                    <option value="" disabled>Выберите АЗС...</option>
                    {stations.filter((s) => !s.name.toLowerCase().includes('склад')).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm text-foreground font-medium">Логин</label>
                <Input
                  type="text"
                  placeholder="Введите логин"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="h-11 bg-input border-2 border-border focus:border-accent text-foreground"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-foreground font-medium">Пароль</label>
                <Input
                  type="password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-input border-2 border-border focus:border-accent text-foreground"
                  required
                />
              </div>

              {authError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm">
                  {authError}
                </div>
              )}

              <Button
                type="submit"
                disabled={authLoading || !selectedStation}
                className="w-full h-11 font-semibold bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {authLoading ? 'Вход...' : 'Войти'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {showNumpad && (
        <NumpadModal
          value={quantity}
          unit={cardInfo?.fuel_type || 'л'}
          onConfirm={handleNumpadConfirm}
          onCancel={() => setShowNumpad(false)}
        />
      )}

      {invalidCodeWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-card border-4 border-destructive rounded-3xl shadow-2xl p-10 w-full max-w-lg mx-4 flex flex-col items-center gap-6 text-center">
            <div className="w-24 h-24 rounded-full bg-destructive/15 border-4 border-destructive flex items-center justify-center">
              <Icon name="ShieldAlert" size={52} className="text-destructive" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-destructive mb-3 uppercase tracking-wide">Недопустимый код карты</h2>
              <p className="text-foreground text-lg leading-relaxed">{invalidCodeWarning}</p>
            </div>
            <Button
              onClick={() => {
                setInvalidCodeWarning(null);
                setTimeout(() => barcodeRef.current?.focus(), 50);
              }}
              className="h-14 px-12 text-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Понятно
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80">
          <div>
            <h1 className="text-2xl font-bold text-accent tracking-wide">Панель оператора</h1>
            {selectedStation && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Icon name="MapPin" size={14} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-medium">{selectedStation.name}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open('/operator-manual.html', '_blank')}
              className="border-2 border-border text-foreground hover:bg-secondary font-bold px-6 h-10"
            >
              <Icon name="BookOpen" size={16} className="mr-2" />
              Инструкция
            </Button>
            <Button
              variant="outline"
              onClick={() => { localStorage.removeItem('operator_session'); navigate('/'); }}
              className="border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground font-bold px-6 h-10"
            >
              <Icon name="LogOut" size={16} className="mr-2" />
              ВЫХОД
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">

          {stage === 'scan' && (
            <div className="w-full max-w-xl flex flex-col items-center gap-5">
              <p className="text-muted-foreground text-center text-xl">
                Поднесите штрихкод карты к сканеру или введите код вручную
              </p>
              <form onSubmit={handleBarcodeSubmit} className="w-full flex flex-col gap-4">
                <input
                  ref={barcodeRef}
                  type="text"
                  placeholder="Сканируйте штрихкод..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  disabled={cardLoading}
                  autoComplete="off"
                  className="w-full bg-input border-2 border-accent rounded-xl text-center font-mono font-bold text-foreground outline-none focus:border-accent focus:ring-0 px-4"
                  style={{ fontSize: '3rem', height: '5.5rem', letterSpacing: '0.08em' }}
                />
                {cardError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive text-destructive text-base text-center">
                    {cardError}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={cardLoading || !barcode.trim()}
                  className="h-14 font-bold text-xl bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {cardLoading ? 'Поиск...' : 'Найти карту'}
                </Button>
              </form>
            </div>
          )}

          {stage === 'select' && multipleCards.length > 0 && (
            <div className="w-full max-w-xl flex flex-col gap-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground">Выберите карту</h2>
                <p className="text-muted-foreground mt-1">Найдено несколько карт с кодом <span className="font-mono text-accent font-bold">{multipleCards[0]?.card_code}</span></p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {multipleCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handleSelectCard(card)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-border bg-card hover:border-accent hover:bg-accent/10 active:scale-95 transition-all text-left"
                  >
                    <div className="font-mono text-2xl font-black text-accent">{cardLabel(card)}</div>
                    <div className="text-sm font-semibold text-foreground text-center leading-tight">{card.fuel_type}</div>
                    <div className="w-full border-t border-border pt-2 mt-1 space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Баланс</span>
                        <span className="font-bold text-foreground">{card.balance_liters.toFixed(1)} {card.fuel_type}</span>
                      </div>
                      {card.daily_limit > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Лимит</span>
                          <span className="text-foreground">{card.daily_limit.toFixed(1)} {card.fuel_type}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Доступно</span>
                        <span className={`font-bold ${card.available_balance > 0 ? 'text-green-500' : 'text-destructive'}`}>
                          {card.available_balance.toFixed(1)} {card.fuel_type}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <Button
                onClick={handleReset}
                variant="outline"
                className="h-12 font-bold text-lg border-2 border-border"
              >
                <Icon name="ArrowLeft" size={18} className="mr-2" />
                Назад
              </Button>
            </div>
          )}

          {(stage === 'card' || stage === 'confirm') && cardInfo && (
            <div className="w-full max-w-xl flex flex-col gap-4">

              <Card className="border-2 border-accent bg-card shadow-lg">
                <CardContent className="pt-5 pb-4 grid grid-cols-2 gap-y-3 gap-x-4">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Номер карты</div>
                    <div className="font-mono text-2xl font-bold text-accent">{cardLabel(cardInfo)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Клиент</div>
                    <div className="text-foreground font-medium text-lg">{cardInfo.client_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Вид топлива</div>
                    <div className="text-foreground font-medium text-lg">{cardInfo.fuel_type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Баланс</div>
                    <div className="text-foreground font-bold text-xl">{cardInfo.balance_liters.toFixed(3)} {cardInfo.fuel_type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Дневной лимит</div>
                    <div className="text-foreground text-lg">
                      {cardInfo.daily_limit > 0 ? `${cardInfo.daily_limit.toFixed(3)} ${cardInfo.fuel_type}` : 'без лимита'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Доступно</div>
                    <div className={`font-bold text-xl ${cardInfo.available_balance > 0 ? 'text-green-500' : 'text-destructive'}`}>
                      {cardInfo.available_balance.toFixed(3)} {cardInfo.fuel_type}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {successMsg ? (
                <div className="p-5 rounded-xl bg-green-500/10 border-2 border-green-500 text-green-500 text-center text-xl font-bold">
                  <Icon name="CheckCircle" size={32} className="mx-auto mb-2" />
                  {successMsg}
                </div>
              ) : stage === 'confirm' ? (
                <div className="flex flex-col gap-3">
                  <div className="p-5 rounded-xl bg-accent/10 border-2 border-accent text-foreground text-center text-xl font-semibold flex flex-col gap-2">
                    <div>
                      Отпустить <span className="text-accent font-bold text-2xl">{parseFloat(quantity.replace(',', '.')).toFixed(3)} л</span> на карту{' '}
                      <span className="font-mono text-accent">{cardLabel(cardInfo)}</span>?
                    </div>
                    <div className="text-base text-muted-foreground font-normal flex flex-col gap-0.5">
                      <span><span className="font-medium text-foreground">Клиент:</span> {cardInfo.client_name}</span>
                      <span><span className="font-medium text-foreground">Топливо:</span> {cardInfo.fuel_type}</span>
                      {selectedStation && (
                        <span><span className="font-medium text-foreground">АЗС:</span> {selectedStation.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleConfirmYes}
                      disabled={dispenseLoading}
                      className="flex-1 h-16 font-bold text-xl bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      {dispenseLoading ? 'Выполняется...' : 'Да, отпустить'}
                    </Button>
                    <Button
                      onClick={() => setStage('card')}
                      variant="outline"
                      disabled={dispenseLoading}
                      className="flex-1 h-16 font-bold text-xl border-2 border-border"
                    >
                      Нет
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-base text-muted-foreground font-medium text-center">
                      Количество топлива для отпуска (литры)
                    </label>
                    <div className="flex gap-2 items-stretch">
                      <input
                        ref={quantityRef}
                        type="text"
                        inputMode="decimal"
                        placeholder="0000.000"
                        value={quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^[\d]*[.,]?[\d]{0,3}$/.test(val) || val === '') {
                            setQuantity(val);
                            setDispenseError('');
                          }
                        }}
                        className="flex-1 bg-input border-2 border-accent rounded-xl text-center font-mono font-bold text-foreground outline-none focus:border-accent px-4"
                        style={{ fontSize: '3rem', height: '5.5rem', letterSpacing: '0.08em' }}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNumpad(true)}
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-accent bg-accent/10 hover:bg-accent hover:text-accent-foreground text-accent transition-all px-4 gap-1"
                        title="Цифровая клавиатура"
                      >
                        <Icon name="Grid3x3" size={28} />
                        <span className="text-xs font-semibold">Клавиши</span>
                      </button>
                    </div>
                    {dispenseError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive text-destructive text-base text-center">
                        {dispenseError}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleDispense}
                      disabled={!validQty}
                      className="flex-1 h-14 font-bold text-xl bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40"
                    >
                      <Icon name="Fuel" size={20} className="mr-2" />
                      Отпустить топливо
                    </Button>
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      className="flex-1 h-14 font-bold text-xl border-2 border-border"
                    >
                      <Icon name="X" size={20} className="mr-2" />
                      Отмена
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}