import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';
import ModeratorPanel from './ModeratorPanel';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'moderator';
  station: string;
  avatar_url: string;
  warning_count: number;
}

interface Message {
  id: number;
  content: string;
  message_type: string;
  attachment_url?: string;
  created_at: string;
  edited_at?: string;
  is_flagged: boolean;
  sender: {
    username: string;
    role: string;
    station: string;
    avatar_url: string;
  };
}

interface ChatTicket {
  id: number;
  title: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
  user: {
    username: string;
    email: string;
    station: string;
    avatar_url: string;
  };
  message_count: number;
  last_message_at?: string;
}

interface EnhancedChatInterfaceProps {
  user: User;
  token: string;
  onLogout: () => void;
}

export default function EnhancedChatInterface({ user, token, onLogout }: EnhancedChatInterfaceProps) {
  const [tickets, setTickets] = useState<ChatTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [showModeratorPanel, setShowModeratorPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const currentTicket = tickets.find(t => t.id === selectedTicket);

  // Звуковые эффекты
  const playNotificationSound = useCallback(() => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmcoCS6Uy/DMczkIGGOv6OBUEQ4PdqfX8oACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAwAAAA==');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/20a6993a-51e0-4297-99c3-b33e9397a495?role=${user.role}`,
        {
          headers: {
            'X-User-Id': user.id.toString(),
            'X-Auth-Token': token,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      } else {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: 'Не удалось загрузить заявки',
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка подключения",
        description: 'Не удается подключиться к серверу',
      });
    } finally {
      setTicketsLoading(false);
    }
  }, [user.id, user.role, token, toast]);

  const loadMessages = useCallback(async (ticketId: number) => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/5fec0027-eeb9-465f-9d7f-78bc52bfd905?ticket_id=${ticketId}`,
        {
          headers: {
            'X-User-Id': user.id.toString(),
            'X-Auth-Token': token,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [user.id, token]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket);
      const interval = setInterval(() => loadMessages(selectedTicket), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedTicket, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || loading) return;
    if (newMessage.length > 1000) {
      toast({
        variant: "destructive",
        title: "Сообщение слишком длинное",
        description: 'Максимум 1000 символов',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/5fec0027-eeb9-465f-9d7f-78bc52bfd905', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString(),
          'X-Auth-Token': token,
        },
        body: JSON.stringify({
          action: 'send_message',
          ticket_id: selectedTicket,
          content: newMessage,
          message_type: 'text'
        }),
      });

      if (response.ok) {
        setNewMessage('');
        loadMessages(selectedTicket);
        loadTickets();
        playNotificationSound();
        toast({
          title: "Сообщение отправлено",
          description: 'Ваше сообщение доставлено',
        });
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "Ошибка отправки",
          description: data.error || 'Не удалось отправить сообщение',
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

  const createNewTicket = async () => {
    const title = prompt('Введите тему обращения:');
    if (!title || !title.trim()) return;

    try {
      const response = await fetch('https://functions.poehali.dev/20a6993a-51e0-4297-99c3-b33e9397a495', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString(),
          'X-Auth-Token': token,
        },
        body: JSON.stringify({
          title: title.trim(),
          category: 'general',
          priority: 'medium'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        loadTickets();
        setSelectedTicket(data.ticket.id);
        toast({
          title: "Заявка создана",
          description: 'Новая заявка успешно создана',
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: 'Не удалось создать заявку',
      });
    }
  };

  const reportMessage = async (message: Message) => {
    const reason = prompt('Причина жалобы:');
    if (!reason || !reason.trim()) return;

    try {
      const response = await fetch('https://functions.poehali.dev/5fec0027-eeb9-465f-9d7f-78bc52bfd905', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString(),
          'X-Auth-Token': token,
        },
        body: JSON.stringify({
          action: 'report_message',
          message_id: message.id,
          reason: reason.trim(),
          description: ''
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Жалоба отправлена",
          description: data.user_banned ? 'Пользователь заблокирован за нарушения' : 'Жалоба зарегистрирована',
        });
        loadMessages(selectedTicket!);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: 'Не удалось отправить жалобу',
      });
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Время';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open': return 'default';
      case 'in_progress': return 'secondary';
      case 'closed': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-coldfire-black via-coldfire-dark to-coldfire-gray">
      {/* Header with enhanced design */}
      <header className="bg-coldfire-dark/95 border-b border-coldfire-orange/30 backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Icon name="Shield" className="text-coldfire-orange w-8 h-8 glow-effect animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
            </div>
            <div>
              <h1 className="text-xl font-industrial font-bold text-gray-100 tracking-wider">
                COLDFIRE PROJECT
              </h1>
              <div className="flex items-center space-x-2">
                <Badge className="bg-coldfire-orange/20 text-coldfire-orange border-coldfire-orange/50 font-mono text-xs">
                  СИСТЕМА ПОДДЕРЖКИ
                </Badge>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 bg-coldfire-gray/20 rounded-lg p-2 border border-coldfire-gray/30">
              <Avatar className="w-10 h-10 border-2 border-coldfire-orange/50">
                <AvatarFallback className="bg-coldfire-orange text-coldfire-black font-bold">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm font-mono">
                <div className="text-gray-100 font-medium">{user.username}</div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={user.role === 'moderator' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {user.role === 'moderator' ? 'МОДЕРАТОР' : 'СТАЛКЕР'}
                  </Badge>
                  <span className="text-coldfire-orange text-xs">
                    📍 {user.station}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {user.role === 'moderator' && (
                <Button
                  onClick={() => setShowModeratorPanel(!showModeratorPanel)}
                  variant="outline"
                  size="sm"
                  className="border-coldfire-orange/50 text-coldfire-orange hover:bg-coldfire-orange/10 font-mono"
                >
                  <Icon name="Settings" className="w-4 h-4 mr-2" />
                  ПАНЕЛЬ
                </Button>
              )}
              <Button
                onClick={onLogout}
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-mono transition-all duration-200"
              >
                <Icon name="LogOut" className="w-4 h-4 mr-2" />
                ВЫХОД
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-88px)]">
        {/* Enhanced Sidebar */}
        <div className="w-1/4 bg-coldfire-dark/90 border-r border-coldfire-gray/30 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 border-b border-coldfire-gray/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-industrial font-bold text-gray-100 tracking-wide">
                {user.role === 'moderator' ? '🛡️ ЗАЯВКИ' : '💬 МОИ ЧАТЫ'}
              </h2>
              {user.role === 'user' && (
                <Button
                  onClick={createNewTicket}
                  size="sm"
                  className="coldfire-button text-xs font-bold transition-all duration-200 hover:scale-105"
                >
                  <Icon name="Plus" className="w-3 h-3 mr-1" />
                  НОВЫЙ
                </Button>
              )}
            </div>
            
            {/* Stats for moderators */}
            {user.role === 'moderator' && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-coldfire-gray/20 rounded p-2 text-center">
                  <div className="text-coldfire-orange text-lg font-bold">
                    {tickets.filter(t => t.status === 'open').length}
                  </div>
                  <div className="text-xs text-gray-400">Открыто</div>
                </div>
                <div className="bg-coldfire-gray/20 rounded p-2 text-center">
                  <div className="text-yellow-400 text-lg font-bold">
                    {tickets.filter(t => t.status === 'in_progress').length}
                  </div>
                  <div className="text-xs text-gray-400">В работе</div>
                </div>
                <div className="bg-coldfire-gray/20 rounded p-2 text-center">
                  <div className="text-green-400 text-lg font-bold">
                    {tickets.filter(t => t.status === 'closed').length}
                  </div>
                  <div className="text-xs text-gray-400">Закрыто</div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 p-2">
            {ticketsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Icon name="Loader2" className="w-6 h-6 animate-spin text-coldfire-orange" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-gray-400 font-mono">
                <Icon name="Inbox" className="w-12 h-12 mx-auto mb-2 text-coldfire-gray" />
                <p>Пока нет заявок</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                    selectedTicket === ticket.id
                      ? 'bg-coldfire-orange/20 border-coldfire-orange/50 shadow-lg shadow-coldfire-orange/20'
                      : 'coldfire-card hover:bg-coldfire-gray/20 hover:border-coldfire-orange/30'
                  }`}
                  onClick={() => setSelectedTicket(ticket.id)}
                >
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={getStatusBadgeColor(ticket.status)}
                            className="text-xs font-mono"
                          >
                            {ticket.status === 'open' ? 'ОТКРЫТ' : 
                             ticket.status === 'in_progress' ? 'В РАБОТЕ' : 
                             ticket.status === 'closed' ? 'ЗАКРЫТ' : ticket.status.toUpperCase()}
                          </Badge>
                          <Icon 
                            name="AlertTriangle" 
                            className={`w-3 h-3 ${getPriorityColor(ticket.priority)}`}
                          />
                        </div>
                        <span className="text-xs text-gray-400 font-mono">
                          {formatTime(ticket.created_at)}
                        </span>
                      </div>
                      
                      <h3 className="text-sm font-medium text-gray-100 truncate">
                        {ticket.title}
                      </h3>
                      
                      <div className="text-xs text-gray-400 font-mono space-y-1">
                        {user.role === 'moderator' ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Icon name="User" className="w-3 h-3" />
                              <span>{ticket.user.username}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Icon name="MapPin" className="w-3 h-3" />
                              <span>{ticket.user.station}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Icon name="MessageSquare" className="w-3 h-3" />
                              <span>{ticket.message_count} сообщений</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span>📊 {ticket.category}</span>
                            <span>💬 {ticket.message_count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Enhanced Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedTicket && currentTicket ? (
            <>
              {/* Enhanced Chat Header */}
              <div className="bg-coldfire-dark/90 border-b border-coldfire-gray/30 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="text-lg font-industrial font-bold text-gray-100 flex items-center space-x-2">
                        <Icon name="MessageCircle" className="w-5 h-5 text-coldfire-orange" />
                        <span>{currentTicket.title}</span>
                      </h3>
                      <div className="text-sm text-gray-400 font-mono flex items-center space-x-4">
                        <span>🆔 {currentTicket.id}</span>
                        <span>📅 {formatTime(currentTicket.created_at)}</span>
                        <span>📂 {currentTicket.category}</span>
                      </div>
                    </div>
                  </div>
                  
                  {user.role === 'moderator' && (
                    <div className="flex items-center space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="font-mono text-xs">
                            <Icon name="MoreVertical" className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-coldfire-dark border-coldfire-gray">
                          <DropdownMenuItem className="text-gray-100 focus:bg-coldfire-gray/20">
                            <Icon name="Archive" className="w-4 h-4 mr-2" />
                            Архивировать
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-gray-100 focus:bg-coldfire-gray/20">
                            <Icon name="X" className="w-4 h-4 mr-2" />
                            Закрыть заявку
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-gray-100 focus:bg-coldfire-gray/20">
                            <Icon name="UserCheck" className="w-4 h-4 mr-2" />
                            Назначить себе
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-coldfire-black/20 to-coldfire-dark/20">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400 font-mono">
                      <Icon name="MessageSquare" className="w-16 h-16 mx-auto mb-4 text-coldfire-gray animate-pulse" />
                      <h3 className="text-lg mb-2">Начните разговор</h3>
                      <p className="text-sm">Отправьте первое сообщение</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender.username === user.username ? 'justify-end' : 'justify-start'
                      } animate-fade-in`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-4 relative group transition-all duration-200 hover:scale-[1.02] ${
                          message.sender.role === 'moderator'
                            ? 'bg-gradient-to-br from-coldfire-orange/20 to-coldfire-rust/20 border border-coldfire-orange/30 shadow-lg'
                            : 'bg-gradient-to-br from-coldfire-gray/20 to-coldfire-dark/40 border border-coldfire-gray/30'
                        } ${message.is_flagged ? 'border-red-500/50 bg-red-500/10' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6 border border-coldfire-orange/50">
                              <AvatarFallback className="bg-coldfire-orange text-coldfire-black text-xs font-bold">
                                {message.sender.username.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <Badge
                              variant={message.sender.role === 'moderator' ? 'default' : 'secondary'}
                              className="text-xs font-mono"
                            >
                              {message.sender.role === 'moderator' ? '🛡️ МОД' : '👤 USER'}
                            </Badge>
                            <span className="text-xs text-gray-400 font-mono">
                              📍 {message.sender.station}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-400 font-mono">
                              {formatTime(message.created_at)}
                            </span>
                            {message.sender.username !== user.username && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 p-0"
                                  >
                                    <Icon name="MoreHorizontal" className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-coldfire-dark border-coldfire-gray">
                                  <DropdownMenuItem 
                                    onClick={() => reportMessage(message)}
                                    className="text-red-400 focus:bg-red-500/10"
                                  >
                                    <Icon name="Flag" className="w-4 h-4 mr-2" />
                                    Пожаловаться
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-gray-100 font-mono text-sm leading-relaxed">
                          {message.content}
                        </p>
                        
                        {message.is_flagged && (
                          <div className="mt-2 text-xs text-red-400 font-mono flex items-center space-x-1">
                            <Icon name="Flag" className="w-3 h-3" />
                            <span>Сообщение помечено</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Enhanced Message Input */}
              <div className="bg-coldfire-dark/95 border-t border-coldfire-gray/30 p-4 backdrop-blur-sm">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Введите сообщение... (Ctrl+Enter для отправки)"
                      className="coldfire-input font-mono resize-none transition-all duration-200 focus:ring-2 focus:ring-coldfire-orange/50"
                      rows={2}
                      maxLength={1000}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          handleSendMessage();
                        }
                      }}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-400 font-mono">
                        {newMessage.length}/1000 символов
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        Ctrl+Enter для отправки
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-coldfire-gray/50 text-gray-400 hover:bg-coldfire-gray/20 transition-all duration-200"
                      disabled
                    >
                      <Icon name="Paperclip" className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || loading}
                      className="coldfire-button font-bold transition-all duration-200 hover:scale-105 disabled:opacity-50"
                    >
                      {loading ? (
                        <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon name="Send" className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-coldfire-black/20 to-coldfire-dark/20">
              <div className="text-center text-gray-400 font-mono animate-fade-in">
                <Icon name="MessageSquare" className="w-24 h-24 mx-auto mb-6 text-coldfire-gray animate-pulse" />
                <h3 className="text-xl mb-4 font-industrial">Выберите чат</h3>
                <p className="text-sm mb-6 max-w-md">
                  {user.role === 'moderator' 
                    ? 'Выберите заявку из списка слева для начала общения с пользователем' 
                    : 'Выберите существующий чат или создайте новое обращение в службу поддержки'
                  }
                </p>
                {user.role === 'user' && (
                  <Button
                    onClick={createNewTicket}
                    className="coldfire-button font-bold"
                  >
                    <Icon name="Plus" className="w-4 h-4 mr-2" />
                    СОЗДАТЬ НОВОЕ ОБРАЩЕНИЕ
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальная панель модератора */}
      {showModeratorPanel && user.role === 'moderator' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-coldfire-dark border border-coldfire-gray/30 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <ModeratorPanel
                user={user}
                token={token}
                onClose={() => setShowModeratorPanel(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}