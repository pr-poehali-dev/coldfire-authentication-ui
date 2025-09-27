import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

interface ModeratorStats {
  total_tickets_closed: number;
  average_rating: number;
  total_reviews: number;
  response_time_avg: number;
  last_active: string;
}

interface TopModerator {
  username: string;
  station: string;
  total_tickets_closed: number;
  average_rating: number;
  total_reviews: number;
}

interface SystemStats {
  total_tickets: number;
  open_tickets: number;
  closed_today: number;
  average_response_time: number;
  user_satisfaction: number;
}

interface ModeratorPanelProps {
  user: User;
  token: string;
  onClose: () => void;
}

export default function ModeratorPanel({ user, token, onClose }: ModeratorPanelProps) {
  const [stats, setStats] = useState<ModeratorStats | null>(null);
  const [topModerators, setTopModerators] = useState<TopModerator[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadModeratorData();
  }, []);

  const loadModeratorData = async () => {
    try {
      setLoading(true);
      
      // Загружаем статистику модератора
      const statsResponse = await fetch(`https://functions.poehali.dev/e804eb0c-7c14-42b7-9a12-40d41f5010f9?moderator_id=${user.id}`, {
        headers: {
          'X-User-Id': user.id.toString(),
          'X-Auth-Token': token,
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
        setTopModerators(statsData.top_moderators || []);
        setSystemStats(statsData.system_stats);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка загрузки",
        description: 'Не удалось загрузить статистику',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-400';
    if (rating >= 4.0) return 'text-yellow-400';
    if (rating >= 3.0) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRatingIcon = (rating: number) => {
    if (rating >= 4.5) return 'Star';
    if (rating >= 4.0) return 'Award';
    if (rating >= 3.0) return 'TrendingUp';
    return 'TrendingDown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Icon name="Loader2" className="w-8 h-8 animate-spin text-coldfire-orange mx-auto mb-4" />
          <p className="text-gray-400 font-mono">Загрузка панели модератора...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-industrial font-bold text-coldfire-orange">
            🛡️ ПАНЕЛЬ МОДЕРАТОРА
          </h2>
          <p className="text-gray-400 font-mono text-sm">
            Управление системой поддержки • {user.username}
          </p>
        </div>
        <Button
          onClick={onClose}
          variant="outline"
          size="sm"
          className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10"
        >
          <Icon name="X" className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-coldfire-gray/20">
          <TabsTrigger value="profile" className="data-[state=active]:bg-coldfire-orange data-[state=active]:text-coldfire-black font-mono">
            ПРОФИЛЬ
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-coldfire-orange data-[state=active]:text-coldfire-black font-mono">
            РЕЙТИНГ
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-coldfire-orange data-[state=active]:text-coldfire-black font-mono">
            СИСТЕМА
          </TabsTrigger>
        </TabsList>

        {/* Профиль модератора */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Статистика модератора */}
            <Card className="coldfire-card">
              <CardHeader>
                <CardTitle className="text-coldfire-orange font-industrial flex items-center space-x-2">
                  <Icon name="BarChart3" className="w-5 h-5" />
                  <span>МОЯ СТАТИСТИКА</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-coldfire-gray/20 rounded">
                        <div className="text-2xl font-bold text-coldfire-orange">
                          {stats.total_tickets_closed}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">Заявок закрыто</div>
                      </div>
                      <div className="text-center p-4 bg-coldfire-gray/20 rounded">
                        <div className={`text-2xl font-bold ${getRatingColor(stats.average_rating)}`}>
                          {stats.average_rating.toFixed(1)}★
                        </div>
                        <div className="text-xs text-gray-400 font-mono">Средний рейтинг</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-mono text-gray-300">Отзывы получено:</span>
                        <Badge variant="outline" className="font-mono">
                          {stats.total_reviews}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-mono text-gray-300">Среднее время ответа:</span>
                        <Badge variant="outline" className="font-mono">
                          {stats.response_time_avg}м
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-mono text-gray-300">Последняя активность:</span>
                        <span className="text-xs text-gray-400 font-mono">
                          {new Date(stats.last_active).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>

                    {/* Прогресс рейтинга */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-400">Рейтинг модератора</span>
                        <span className={getRatingColor(stats.average_rating)}>
                          {stats.average_rating.toFixed(1)}/5.0
                        </span>
                      </div>
                      <Progress 
                        value={(stats.average_rating / 5) * 100} 
                        className="h-2 bg-coldfire-gray/30"
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-400 font-mono">
                    Статистика недоступна
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Достижения */}
            <Card className="coldfire-card">
              <CardHeader>
                <CardTitle className="text-coldfire-orange font-industrial flex items-center space-x-2">
                  <Icon name="Trophy" className="w-5 h-5" />
                  <span>ДОСТИЖЕНИЯ</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats && (
                  <>
                    {stats.total_tickets_closed >= 50 && (
                      <div className="flex items-center space-x-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded">
                        <Icon name="Medal" className="w-5 h-5 text-yellow-400" />
                        <div>
                          <div className="text-sm font-mono text-yellow-400">Опытный модератор</div>
                          <div className="text-xs text-gray-400">Закрыто 50+ заявок</div>
                        </div>
                      </div>
                    )}
                    
                    {stats.average_rating >= 4.5 && (
                      <div className="flex items-center space-x-3 p-2 bg-green-900/20 border border-green-500/30 rounded">
                        <Icon name="Star" className="w-5 h-5 text-green-400" />
                        <div>
                          <div className="text-sm font-mono text-green-400">Высокий рейтинг</div>
                          <div className="text-xs text-gray-400">Рейтинг выше 4.5</div>
                        </div>
                      </div>
                    )}
                    
                    {stats.response_time_avg <= 30 && (
                      <div className="flex items-center space-x-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded">
                        <Icon name="Zap" className="w-5 h-5 text-blue-400" />
                        <div>
                          <div className="text-sm font-mono text-blue-400">Быстрый ответ</div>
                          <div className="text-xs text-gray-400">Ответ менее 30 минут</div>
                        </div>
                      </div>
                    )}

                    {(!stats.total_tickets_closed || stats.total_tickets_closed < 10) && (
                      <div className="text-center py-4 text-gray-500 font-mono text-sm">
                        🎯 Закройте больше заявок для получения достижений
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Рейтинг модераторов */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card className="coldfire-card">
            <CardHeader>
              <CardTitle className="text-coldfire-orange font-industrial flex items-center space-x-2">
                <Icon name="Crown" className="w-5 h-5" />
                <span>ТОП МОДЕРАТОРОВ</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topModerators.length > 0 ? (
                <div className="space-y-3">
                  {topModerators.map((moderator, index) => (
                    <div
                      key={moderator.username}
                      className={`flex items-center justify-between p-3 rounded transition-all duration-200 ${
                        moderator.username === user.username
                          ? 'bg-coldfire-orange/20 border border-coldfire-orange/50'
                          : 'bg-coldfire-gray/10 hover:bg-coldfire-gray/20'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-amber-600 text-white' :
                          'bg-coldfire-gray text-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-mono font-bold text-gray-100">
                            {moderator.username}
                            {moderator.username === user.username && (
                              <Badge variant="outline" className="ml-2 text-xs">ВЫ</Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">📍 {moderator.station}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getRatingColor(moderator.average_rating)}`}>
                          {moderator.average_rating.toFixed(1)}★
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          {moderator.total_tickets_closed} заявок
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 font-mono">
                  <Icon name="Users" className="w-12 h-12 mx-auto mb-2 text-coldfire-gray" />
                  <p>Данные рейтинга недоступны</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Системная статистика */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemStats && (
              <>
                <Card className="coldfire-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-coldfire-orange mb-2">
                      {systemStats.total_tickets}
                    </div>
                    <div className="text-sm text-gray-400 font-mono">Всего заявок</div>
                  </CardContent>
                </Card>

                <Card className="coldfire-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">
                      {systemStats.open_tickets}
                    </div>
                    <div className="text-sm text-gray-400 font-mono">Открытых заявок</div>
                  </CardContent>
                </Card>

                <Card className="coldfire-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">
                      {systemStats.closed_today}
                    </div>
                    <div className="text-sm text-gray-400 font-mono">Закрыто сегодня</div>
                  </CardContent>
                </Card>

                <Card className="coldfire-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">
                      {systemStats.average_response_time}м
                    </div>
                    <div className="text-sm text-gray-400 font-mono">Среднее время ответа</div>
                  </CardContent>
                </Card>

                <Card className="coldfire-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-2">
                      {systemStats.user_satisfaction.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-400 font-mono">Удовлетворенность</div>
                  </CardContent>
                </Card>

                <Card className="coldfire-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-gray-400 mb-2">
                      v2.0
                    </div>
                    <div className="text-sm text-gray-400 font-mono">Версия системы</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}