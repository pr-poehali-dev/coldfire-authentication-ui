import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'moderator';
  station: string;
  avatar_url: string;
  warning_count: number;
}

interface AuthFormProps {
  onLogin: (user: User, token: string) => void;
}

export default function AuthForm({ onLogin }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('https://functions.poehali.dev/2c505459-e643-4850-94ac-7305ff8d3734', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isLogin ? 'login' : 'register',
          username,
          password,
          email: !isLogin ? email : undefined
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: isLogin ? "Вход выполнен!" : "Регистрация успешна!",
          description: `Добро пожаловать в метро${data.user.station ? `, сталкер со станции ${data.user.station}` : ''}!`,
        });
        onLogin(data.user, data.token);
      } else {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: data.error || 'Произошла ошибка при входе',
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка подключения",
        description: 'Не удается подключиться к серверу',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-coldfire-black via-coldfire-dark to-coldfire-gray p-4">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'><circle cx='16' cy='16' r='1' fill='%23FF6B35' opacity='0.1'/></svg>")`
      }}></div>
      
      <Card className="w-full max-w-md coldfire-card animate-fade-in relative">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Icon name="Shield" className="text-coldfire-orange w-8 h-8 glow-effect" />
            <CardTitle className="text-2xl font-industrial font-bold text-gray-100">
              COLDFIRE PROJECT
            </CardTitle>
          </div>
          <CardDescription className="text-gray-400 font-mono">
            {isLogin ? 'Вход в систему поддержки' : 'Регистрация нового пользователя'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-300 font-mono text-sm">
                Логин
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="coldfire-input font-mono"
                placeholder="Введите логин"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 font-mono text-sm">
                Пароль
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="coldfire-input font-mono"
                placeholder="Введите пароль"
                required
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300 font-mono text-sm">
                  Электронная почта
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="coldfire-input font-mono"
                  placeholder="user@example.com"
                  required
                />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full coldfire-button font-mono font-bold py-3"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                  <span>Подключение...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Icon name={isLogin ? "LogIn" : "UserPlus"} className="w-4 h-4" />
                  <span>{isLogin ? 'ВОЙТИ' : 'РЕГИСТРАЦИЯ'}</span>
                </div>
              )}
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-coldfire-gray/30">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-coldfire-orange hover:text-coldfire-rust transition-colors font-mono text-sm underline"
            >
              {isLogin ? 'Нужна регистрация?' : 'Уже есть аккаунт?'}
            </button>
          </div>

          {/* Demo accounts */}
          <div className="text-xs text-gray-500 font-mono space-y-2 border-t border-coldfire-gray/20 pt-4">
            <p className="text-coldfire-orange font-bold">🔧 Тестовые аккаунты:</p>
            <div className="grid grid-cols-1 gap-2">
              <Badge variant="outline" className="justify-start text-[10px] p-1">
                <Icon name="Shield" className="w-3 h-3 mr-1 text-coldfire-orange" />
                artyom_spartan / spartan123
              </Badge>
              <Badge variant="outline" className="justify-start text-[10px] p-1">
                <Icon name="Users" className="w-3 h-3 mr-1 text-blue-400" />
                newbie_stalker / metro2033
              </Badge>
            </div>
            <p className="text-[10px] text-gray-600">Или создайте новый аккаунт</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}