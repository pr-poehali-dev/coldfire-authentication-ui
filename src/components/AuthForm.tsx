import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import CaptchaComponent from './CaptchaComponent';

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
  onLogin: (userData: User, authToken: string) => void;
}

export default function AuthForm({ onLogin }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [station, setStation] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const stations = [
    'Полис', 'Выставочная', 'ВДНХ', 'Ботанический сад', 'Свиблово',
    'Бабушкинская', 'Медведково', 'Красносельская', 'Сокольники',
    'Преображенская площадь', 'Электрозаводская', 'Семёновская',
    'Партизанская', 'Измайловская', 'Первомайская', 'Щёлковская'
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: 'Заполните все поля',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/2c505459-e643-4850-94ac-7305ff8d3734', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          username: username.trim(),
          password: password.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user && data.token) {
        onLogin(data.user, data.token);
        toast({
          title: "Вход выполнен",
          description: `Добро пожаловать, ${data.user.username}!`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Ошибка входа",
          description: data.error || 'Неверные данные для входа',
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !station) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: 'Заполните все поля',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: 'Пароли не совпадают',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: 'Пароль должен содержать минимум 6 символов',
      });
      return;
    }

    if (!captchaToken) {
      setShowCaptcha(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/2c505459-e643-4850-94ac-7305ff8d3734', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'register',
          username: username.trim(),
          email: email.trim(),
          password: password.trim(),
          station: station,
          captcha_token: captchaToken
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user && data.token) {
        onLogin(data.user, data.token);
        toast({
          title: "Регистрация успешна",
          description: `Добро пожаловать в метро, ${data.user.username}!`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Ошибка регистрации",
          description: data.error || 'Не удалось создать аккаунт',
        });
        setShowCaptcha(false);
        setCaptchaToken('');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка подключения",
        description: 'Не удается подключиться к серверу',
      });
      setShowCaptcha(false);
      setCaptchaToken('');
    } finally {
      setLoading(false);
    }
  };

  const handleCaptchaVerified = (token: string) => {
    setCaptchaToken(token);
    setShowCaptcha(false);
    toast({
      title: "Капча пройдена",
      description: "Теперь можно завершить регистрацию",
    });
  };

  const handleCaptchaError = (error: string) => {
    toast({
      variant: "destructive",
      title: "Ошибка капчи",
      description: error,
    });
    setCaptchaToken('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-coldfire-black via-coldfire-dark to-coldfire-gray p-4">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><circle cx='50' cy='50' r='2' fill='%23FF6B35' opacity='0.3'/><circle cx='20' cy='20' r='1' fill='%23FF6B35' opacity='0.2'/><circle cx='80' cy='30' r='1.5' fill='%23FF6B35' opacity='0.25'/></svg>")`
      }}></div>
      
      <Card className="w-full max-w-lg coldfire-card animate-fade-in relative backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="relative">
              <Icon name="Shield" className="text-coldfire-orange w-10 h-10 glow-effect animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
            </div>
            <div>
              <CardTitle className="text-3xl font-industrial font-bold text-gray-100 tracking-wider">
                COLDFIRE PROJECT
              </CardTitle>
              <div className="flex items-center justify-center space-x-2 mt-1">
                <Badge className="bg-coldfire-orange/20 text-coldfire-orange border-coldfire-orange/50 font-mono text-xs">
                  СИСТЕМА ПОДДЕРЖКИ v2.0
                </Badge>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
          <CardDescription className="text-gray-400 font-mono text-lg">
            🚇 Добро пожаловать в метро будущего
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Tabs value={mode} onValueChange={(value) => setMode(value as 'login' | 'register')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-coldfire-gray/20 border border-coldfire-gray/30">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-coldfire-orange data-[state=active]:text-coldfire-black font-industrial font-bold transition-all duration-200"
              >
                <Icon name="LogIn" className="w-4 h-4 mr-2" />
                ВХОД
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="data-[state=active]:bg-coldfire-orange data-[state=active]:text-coldfire-black font-industrial font-bold transition-all duration-200"
              >
                <Icon name="UserPlus" className="w-4 h-4 mr-2" />
                РЕГИСТРАЦИЯ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-coldfire-orange font-mono font-bold flex items-center space-x-2">
                    <Icon name="User" className="w-4 h-4" />
                    <span>ПОЗЫВНОЙ</span>
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="coldfire-input font-mono text-lg"
                    placeholder="Введите ваш позывной"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-coldfire-orange font-mono font-bold flex items-center space-x-2">
                    <Icon name="Lock" className="w-4 h-4" />
                    <span>ПАРОЛЬ</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="coldfire-input font-mono text-lg"
                    placeholder="Введите пароль"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full coldfire-button font-bold text-lg py-6 transition-all duration-300 hover:scale-105"
                >
                  {loading ? (
                    <Icon name="Loader2" className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Icon name="Shield" className="w-5 h-5 mr-2" />
                  )}
                  {loading ? 'ПОДКЛЮЧЕНИЕ...' : 'ВОЙТИ В СИСТЕМУ'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              {showCaptcha ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-industrial font-bold text-coldfire-orange mb-2">
                      🛡️ ЗАВЕРШЕНИЕ РЕГИСТРАЦИИ
                    </h3>
                    <p className="text-sm text-gray-400 font-mono">
                      Пройдите проверку безопасности для завершения
                    </p>
                  </div>
                  <CaptchaComponent
                    onVerified={handleCaptchaVerified}
                    onError={handleCaptchaError}
                  />
                  <Button
                    onClick={() => setShowCaptcha(false)}
                    variant="outline"
                    className="w-full border-coldfire-gray/50 text-gray-400 hover:bg-coldfire-gray/20"
                  >
                    <Icon name="ArrowLeft" className="w-4 h-4 mr-2" />
                    Назад к регистрации
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-username" className="text-coldfire-orange font-mono font-bold text-sm">
                        ПОЗЫВНОЙ
                      </Label>
                      <Input
                        id="reg-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="coldfire-input font-mono"
                        placeholder="Ваш позывной"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="station-select" className="text-coldfire-orange font-mono font-bold text-sm">
                        СТАНЦИЯ
                      </Label>
                      <Select value={station} onValueChange={setStation} required>
                        <SelectTrigger className="coldfire-input font-mono">
                          <SelectValue placeholder="Выберите станцию" />
                        </SelectTrigger>
                        <SelectContent className="bg-coldfire-dark border-coldfire-gray font-mono max-h-40">
                          {stations.map((s) => (
                            <SelectItem key={s} value={s} className="text-gray-100 focus:bg-coldfire-gray/20">
                              🚇 {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-coldfire-orange font-mono font-bold text-sm">
                      ЭЛЕКТРОННАЯ ПОЧТА
                    </Label>
                    <Input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="coldfire-input font-mono"
                      placeholder="stalker@metro.ru"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-coldfire-orange font-mono font-bold text-sm">
                        ПАРОЛЬ
                      </Label>
                      <Input
                        id="reg-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="coldfire-input font-mono"
                        placeholder="Минимум 6 символов"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-coldfire-orange font-mono font-bold text-sm">
                        ПОДТВЕРЖДЕНИЕ
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="coldfire-input font-mono"
                        placeholder="Повторите пароль"
                        required
                      />
                    </div>
                  </div>

                  {captchaToken && (
                    <div className="flex items-center space-x-2 bg-green-900/20 border border-green-500/30 rounded p-3">
                      <Icon name="CheckCircle" className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-green-400 font-mono font-bold">
                        ✅ Проверка безопасности пройдена
                      </span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full coldfire-button font-bold text-lg py-6 transition-all duration-300 hover:scale-105"
                  >
                    {loading ? (
                      <Icon name="Loader2" className="w-5 h-5 animate-spin mr-2" />
                    ) : captchaToken ? (
                      <Icon name="CheckCircle" className="w-5 h-5 mr-2" />
                    ) : (
                      <Icon name="UserPlus" className="w-5 h-5 mr-2" />
                    )}
                    {loading ? 'СОЗДАНИЕ АККАУНТА...' : captchaToken ? 'ЗАВЕРШИТЬ РЕГИСТРАЦИЮ' : 'ПРОДОЛЖИТЬ К ПРОВЕРКЕ'}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          {mode === 'login' && (
            <div className="text-xs text-gray-500 font-mono space-y-3 border-t border-coldfire-gray/20 pt-4">
              <p className="text-coldfire-orange font-bold flex items-center space-x-2">
                <Icon name="TestTube" className="w-4 h-4" />
                <span>🔧 ТЕСТОВЫЕ АККАУНТЫ ДЛЯ ДЕМО:</span>
              </p>
              <div className="grid grid-cols-1 gap-2">
                <Badge variant="outline" className="justify-start text-[11px] p-2 border-coldfire-orange/30 bg-coldfire-orange/5">
                  <Icon name="Shield" className="w-3 h-3 mr-2 text-coldfire-orange" />
                  <span className="font-bold">МОДЕРАТОР:</span>
                  <span className="ml-2">artyom_spartan / spartan123</span>
                </Badge>
                <Badge variant="outline" className="justify-start text-[11px] p-2 border-blue-400/30 bg-blue-400/5">
                  <Icon name="Users" className="w-3 h-3 mr-2 text-blue-400" />
                  <span className="font-bold">ПОЛЬЗОВАТЕЛЬ:</span>
                  <span className="ml-2">newbie_stalker / metro2033</span>
                </Badge>
              </div>
              <p className="text-[10px] text-gray-600 text-center">
                💡 Либо создайте собственный аккаунт через регистрацию
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}