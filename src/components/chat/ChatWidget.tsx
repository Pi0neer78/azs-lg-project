import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

const CHAT_API = 'https://functions.poehali.dev/69e2d83c-39b4-45ff-8cf5-0875a45e5fec';
const POLL_MS = 20000;

interface Msg {
  id: number;
  channel: 'general' | 'private';
  sender_id: number;
  sender_name: string;
  sender_role: string;
  recipient_id: number | null;
  recipient_name: string | null;
  text: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
}

interface ChatUser {
  id: number;
  name: string;
  role: string;
}

interface Me {
  id: number;
  name: string;
  role: string;
}

function playSound() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.17);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.18);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    return;
  }
}

function renderText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="underline break-all">
        {p}
      </a>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function formatSize(n: number | null) {
  if (!n) return '';
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} МБ` : `${Math.max(1, Math.round(n / 1024))} КБ`;
}

export default function ChatWidget({ login, password }: { login: string; password: string }) {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [target, setTarget] = useState<'general' | number>('general');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const lastIdRef = useRef(0);
  const firstLoadRef = useRef(true);
  const openRef = useRef(false);
  const targetRef = useRef<'general' | number>('general');
  const meRef = useRef<Me | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const headers = { 'Content-Type': 'application/json', 'X-User-Id': login, 'X-Auth-Token': password };

  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { targetRef.current = target; }, [target]);

  const keyOf = (m: Msg, myId: number) =>
    m.channel === 'general' ? 'general' : String(m.sender_id === myId ? m.recipient_id : m.sender_id);

  const poll = useCallback(async () => {
    if (!login || !password) return;
    try {
      const res = await fetch(`${CHAT_API}?action=messages&after_id=${lastIdRef.current}`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      const list: Msg[] = data.messages || [];
      const my: Me = data.me;
      meRef.current = my;
      setMe(my);
      if (list.length === 0) {
        firstLoadRef.current = false;
        return;
      }
      lastIdRef.current = list[list.length - 1].id;
      setMessages((prev) => [...prev, ...list]);

      if (!firstLoadRef.current) {
        const incoming = list.filter((m) => m.sender_id !== my.id);
        if (incoming.length > 0) {
          const counts: Record<string, number> = {};
          incoming.forEach((m) => {
            const k = keyOf(m, my.id);
            const viewing = openRef.current && String(targetRef.current) === k;
            if (!viewing) counts[k] = (counts[k] || 0) + 1;
          });
          if (Object.keys(counts).length > 0) {
            setUnread((u) => {
              const n = { ...u };
              Object.entries(counts).forEach(([k, v]) => { n[k] = (n[k] || 0) + v; });
              return n;
            });
          }
          const last = incoming[incoming.length - 1];
          toast({
            title: last.channel === 'general' ? `Общий чат: ${last.sender_name}` : `Сообщение от ${last.sender_name}`,
            description: last.text || last.file_name || 'Вложение',
          });
          playSound();
        }
      }
      firstLoadRef.current = false;
    } catch {
      return;
    }
  }, [login, password]);

  useEffect(() => {
    if (!login || !password) return;
    fetch(`${CHAT_API}?action=users`, { headers })
      .then((r) => r.json())
      .then((d) => { if (d.users) { setUsers(d.users); setMe(d.me); meRef.current = d.me; } })
      .catch(() => undefined);
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [login, password, poll]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, open, target]);

  const selectTarget = (t: 'general' | number) => {
    setTarget(t);
    setUnread((u) => { const n = { ...u }; delete n[String(t)]; return n; });
  };

  const visible = messages.filter((m) => {
    if (!me) return false;
    if (target === 'general') return m.channel === 'general';
    return m.channel === 'private' && (m.sender_id === target || m.recipient_id === target);
  });

  const toBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = reject;
      r.readAsDataURL(f);
    });

  const send = async () => {
    if (sending || (!text.trim() && !file)) return;
    if (file && file.size > 4 * 1024 * 1024) {
      toast({ title: 'Файл слишком большой', description: 'Максимум 4 МБ', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        text,
        channel: target === 'general' ? 'general' : 'private',
        recipient_id: target === 'general' ? undefined : target,
      };
      if (file) payload.file = { name: file.name, type: file.type, content: await toBase64(file) };
      const res = await fetch(CHAT_API, { method: 'POST', headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        setText('');
        setFile(null);
        if (fileRef.current) fileRef.current.value = '';
        await poll();
      } else {
        toast({ title: 'Не отправлено', description: data.error || 'Ошибка', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);
  const targetName = target === 'general' ? 'Общий чат' : users.find((u) => u.id === target)?.name || 'Диалог';

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) playSoundPrime(); }}
        className="fixed bottom-14 right-4 z-50 h-14 w-14 rounded-full bg-accent text-accent-foreground shadow-xl flex items-center justify-center hover:bg-accent/90"
        title="Чат"
      >
        <Icon name="MessageCircle" size={26} />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
            {totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-32 right-4 z-50 w-[min(94vw,640px)] h-[min(75vh,520px)] bg-card border-2 border-accent rounded-xl shadow-2xl flex overflow-hidden">
          <div className="w-44 shrink-0 border-r border-border bg-secondary/40 overflow-y-auto">
            <button
              type="button"
              onClick={() => selectTarget('general')}
              className={`w-full text-left px-3 py-2 text-sm font-semibold flex justify-between items-center ${target === 'general' ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-secondary'}`}
            >
              <span>Общий чат</span>
              {unread['general'] > 0 && <span className="rounded-full bg-destructive text-destructive-foreground text-xs px-1.5">{unread['general']}</span>}
            </button>
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => selectTarget(u.id)}
                className={`w-full text-left px-3 py-2 text-sm flex justify-between items-center gap-1 ${target === u.id ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-secondary'}`}
              >
                <span className="truncate">{u.name}</span>
                {unread[String(u.id)] > 0 && <span className="rounded-full bg-destructive text-destructive-foreground text-xs px-1.5">{unread[String(u.id)]}</span>}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-3 py-2 border-b border-border font-bold text-foreground flex justify-between items-center">
              <span className="truncate">{targetName}</span>
              <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {visible.length === 0 && <div className="text-center text-muted-foreground text-sm mt-6">Сообщений пока нет</div>}
              {visible.map((m) => {
                const mine = me?.id === m.sender_id;
                return (
                  <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${mine ? 'self-end bg-accent text-accent-foreground' : 'self-start bg-secondary text-foreground'}`}>
                    {!mine && <div className="text-xs font-bold mb-0.5">{m.sender_name}</div>}
                    {m.text && <div className="whitespace-pre-wrap break-words">{renderText(m.text)}</div>}
                    {m.file_url && (
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline mt-1 break-all">
                        <Icon name="Paperclip" size={14} />
                        {m.file_name} {formatSize(m.file_size) && `(${formatSize(m.file_size)})`}
                      </a>
                    )}
                    <div className="text-[10px] opacity-70 mt-1 text-right">{m.created_at.slice(5, 16)}</div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {file && (
              <div className="px-3 py-1 text-xs text-foreground flex items-center justify-between bg-secondary/50">
                <span className="truncate">{file.name}</span>
                <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}>
                  <Icon name="X" size={14} />
                </button>
              </div>
            )}

            <div className="p-2 border-t border-border flex gap-2 items-end">
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <Button type="button" variant="outline" size="icon" onClick={() => fileRef.current?.click()} className="border-2 border-border shrink-0">
                <Icon name="Paperclip" size={18} />
              </Button>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={2}
                placeholder="Сообщение или ссылка"
                className="flex-1 resize-none bg-input border-2 border-border rounded-md px-2 py-1 text-sm text-foreground outline-none focus:border-accent"
              />
              <Button type="button" onClick={send} disabled={sending} className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0">
                <Icon name="Send" size={18} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function playSoundPrime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    ctx.resume().then(() => ctx.close());
  } catch {
    return;
  }
}
