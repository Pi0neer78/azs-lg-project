import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface LoginProps {
  onLogin: (login: string, password: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('https://functions.poehali.dev/9f5ff2f8-a6c2-489f-8a85-40f260bbac9e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login: login.trim(), password: password.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('chat_auth', JSON.stringify({ login: login.trim(), password: password.trim() }));
        sessionStorage.removeItem('fromAdmin');
        sessionStorage.removeItem('viewClientLogin');
        
        if (data.user.admin && data.user.operator) {
          navigate('/operator');
        } else if (data.user.admin) {
          navigate('/admin');
        } else {
          navigate('/client');
        }
      } else {
        setError(data.error || 'Ошибка авторизации');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen -mb-10 bg-cover bg-center bg-no-repeat bg-fixed flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundImage: "linear-gradient(rgba(6,26,18,0.35), rgba(6,26,18,0.55)), url('/bg-login.webp')" }}
    >
      <Card className="w-full max-w-[360px] border-2 border-accent shadow-2xl bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-3 pt-5 px-5 space-y-2">
          <h1 className="text-lg font-bold text-accent tracking-tight leading-tight">
            СЕТЬ АВТОЗАПРАВОЧНЫХ СТАНЦИЙ
          </h1>
          <CardTitle className="text-xl text-foreground">Вход в кабинет</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="login" className="text-foreground">Логин</Label>
              <Input
                id="login"
                type="text"
                placeholder="Введите логин"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="h-10 bg-input border-2 border-border focus:border-accent text-foreground"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-foreground">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 pr-10 bg-input border-2 border-border focus:border-accent text-foreground"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-accent"
                  title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={18} />
                </button>
              </div>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 !mt-7 font-bold text-base text-accent-foreground border-0 rounded-lg bg-gradient-to-r from-yellow-200 via-accent to-amber-600 hover:brightness-105 shadow-[0_6px_0_0_rgb(146,82,10),0_10px_18px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.6)] active:translate-y-[4px] active:shadow-[0_2px_0_0_rgb(146,82,10),0_4px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all disabled:opacity-50 mt-3 mb-1.5"
            >
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
