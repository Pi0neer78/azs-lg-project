import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import ChatWidget from './ChatWidget';

const AUTH_API = 'https://functions.poehali.dev/9f5ff2f8-a6c2-489f-8a85-40f260bbac9e';

function readAuth(): { login?: string; password?: string } {
  try {
    return JSON.parse(localStorage.getItem('chat_auth') || '{}');
  } catch {
    return {};
  }
}

export default function ChatLauncher() {
  const [auth, setAuth] = useState(readAuth());
  const [open, setOpen] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (auth.login && auth.password) {
    return <ChatWidget login={auth.login} password={auth.password} />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: login.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user.admin) {
        const a = { login: login.trim(), password: password.trim() };
        localStorage.setItem('chat_auth', JSON.stringify(a));
        setAuth(a);
      } else {
        setError(data.error || 'Нет доступа к чату');
      }
    } catch {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-14 right-4 z-50 h-14 w-14 rounded-full bg-accent text-accent-foreground shadow-xl flex items-center justify-center hover:bg-accent/90"
        title="Чат"
      >
        <Icon name="MessageCircle" size={26} />
      </button>
      {open && (
        <form
          onSubmit={submit}
          className="fixed bottom-32 right-4 z-50 w-72 bg-card border-2 border-accent rounded-xl shadow-2xl p-4 flex flex-col gap-3"
        >
          <div className="font-bold text-foreground">Вход в чат</div>
          <Input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Логин" className="bg-input text-foreground border-2 border-border" />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" className="bg-input text-foreground border-2 border-border" />
          {error && <div className="text-destructive text-sm">{error}</div>}
          <Button type="submit" disabled={loading} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold">
            {loading ? 'Вход...' : 'Войти'}
          </Button>
        </form>
      )}
    </>
  );
}
