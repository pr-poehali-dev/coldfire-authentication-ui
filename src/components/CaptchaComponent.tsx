import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

interface CaptchaComponentProps {
  onVerified: (token: string) => void;
  onError: (error: string) => void;
}

interface CaptchaData {
  session_token: string;
  captcha_image: string;
  expires_in: number;
}

export default function CaptchaComponent({ onVerified, onError }: CaptchaComponentProps) {
  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const { toast } = useToast();

  const loadCaptcha = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://functions.poehali.dev/5f794848-19db-405f-b6b4-bab281857abf');
      
      if (response.ok) {
        const data: CaptchaData = await response.json();
        setCaptchaData(data);
        setTimeLeft(data.expires_in);
        setUserInput('');
      } else {
        onError('Не удалось загрузить капчу');
      }
    } catch (error) {
      onError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const verifyCaptcha = async () => {
    if (!captchaData || !userInput.trim()) {
      onError('Введите код с картинки');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('https://functions.poehali.dev/5f794848-19db-405f-b6b4-bab281857abf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_token: captchaData.session_token,
          captcha_input: userInput.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        onVerified(captchaData.session_token);
        toast({
          title: "Капча пройдена",
          description: "Проверка прошла успешно",
        });
      } else {
        onError(data.error || 'Неверный код');
        loadCaptcha(); // Загружаем новую капчу
      }
    } catch (error) {
      onError('Ошибка проверки капчи');
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && captchaData) {
      onError('Капча истекла');
      loadCaptcha();
    }
  }, [timeLeft, captchaData]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="coldfire-card">
      <CardContent className="p-4 space-y-4">
        <div className="text-center">
          <h4 className="text-sm font-industrial font-bold text-coldfire-orange mb-2">
            🛡️ ПРОВЕРКА БЕЗОПАСНОСТИ
          </h4>
          <p className="text-xs text-gray-400 font-mono">
            Введите код для продолжения
          </p>
        </div>

        {captchaData ? (
          <div className="space-y-3">
            {/* ASCII Captcha Display */}
            <div className="bg-coldfire-black/50 border border-coldfire-gray/30 rounded p-3">
              <pre className="text-coldfire-orange font-mono text-xs leading-tight text-center whitespace-pre-wrap">
                {captchaData.captcha_image}
              </pre>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2">
                <Icon name="Clock" className="w-3 h-3 text-coldfire-orange" />
                <span className="text-gray-400">Истекает через:</span>
                <span className={`font-bold ${timeLeft < 30 ? 'text-red-400' : 'text-coldfire-orange'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <Button
                onClick={loadCaptcha}
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs border-coldfire-gray/50"
                disabled={loading}
              >
                <Icon name="RotateCcw" className="w-3 h-3" />
              </Button>
            </div>

            {/* Input */}
            <div className="space-y-2">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value.toUpperCase())}
                placeholder="Введите код"
                className="coldfire-input font-mono text-center text-lg tracking-widest"
                maxLength={5}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    verifyCaptcha();
                  }
                }}
              />
              <div className="text-xs text-gray-500 text-center font-mono">
                5 символов, только буквы и цифры
              </div>
            </div>

            {/* Verify Button */}
            <Button
              onClick={verifyCaptcha}
              disabled={loading || userInput.length !== 5}
              className="w-full coldfire-button font-bold transition-all duration-200"
            >
              {loading ? (
                <Icon name="Loader2" className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Icon name="Shield" className="w-4 h-4 mr-2" />
              )}
              {loading ? 'ПРОВЕРКА...' : 'ПРОВЕРИТЬ КОД'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Icon name="Loader2" className="w-8 h-8 animate-spin text-coldfire-orange mx-auto mb-2" />
              <p className="text-xs text-gray-400 font-mono">Загрузка капчи...</p>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 font-mono text-center border-t border-coldfire-gray/20 pt-3">
          <Icon name="Info" className="w-3 h-3 inline mr-1" />
          Система защиты от ботов
        </div>
      </CardContent>
    </Card>
  );
}