import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';

interface User {
  username: string;
  role: 'user' | 'moderator';
}

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  senderRole: 'user' | 'moderator';
}

interface ChatTicket {
  id: string;
  title: string;
  user: string;
  email: string;
  created: Date;
  status: 'open' | 'closed' | 'archived';
  messages: Message[];
}

interface ChatInterfaceProps {
  user: User;
  onLogout: () => void;
}

export default function ChatInterface({ user, onLogout }: ChatInterfaceProps) {
  const [tickets, setTickets] = useState<ChatTicket[]>([
    {
      id: '1',
      title: 'Проблема с подключением к серверу',
      user: 'stalker_user',
      email: 'stalker@metro.zone',
      created: new Date(Date.now() - 3600000),
      status: 'open',
      messages: [
        {
          id: '1',
          text: 'Здравствуйте! Не могу подключиться к серверу Metro RP. Помогите пожалуйста.',
          sender: 'stalker_user',
          timestamp: new Date(Date.now() - 3600000),
          senderRole: 'user'
        }
      ]
    },
    {
      id: '2',
      title: 'Вопрос по игровой механике',
      user: 'newbie_player',
      email: 'newbie@metro.zone',
      created: new Date(Date.now() - 7200000),
      status: 'open',
      messages: [
        {
          id: '2',
          text: 'Как правильно использовать систему торговли в игре?',
          sender: 'newbie_player',
          timestamp: new Date(Date.now() - 7200000),
          senderRole: 'user'
        }
      ]
    }
  ]);

  const [selectedTicket, setSelectedTicket] = useState<string | null>(
    user.role === 'user' ? '1' : null
  );
  const [newMessage, setNewMessage] = useState('');
  const [showUserPanel, setShowUserPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentTicket = tickets.find(t => t.id === selectedTicket);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentTicket?.messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedTicket) return;
    if (newMessage.length > 1000) {
      alert('Максимум 1000 символов!');
      return;
    }

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: user.username,
      timestamp: new Date(),
      senderRole: user.role
    };

    setTickets(prev => prev.map(ticket => 
      ticket.id === selectedTicket 
        ? { ...ticket, messages: [...ticket.messages, message] }
        : ticket
    ));

    setNewMessage('');
  };

  const createNewTicket = () => {
    const newTicket: ChatTicket = {
      id: Date.now().toString(),
      title: 'Новое обращение',
      user: user.username,
      email: `${user.username}@metro.zone`,
      created: new Date(),
      status: 'open',
      messages: []
    };

    setTickets(prev => [newTicket, ...prev]);
    setSelectedTicket(newTicket.id);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-coldfire-black via-coldfire-dark to-coldfire-gray">
      {/* Header */}
      <header className="bg-coldfire-dark/90 border-b border-coldfire-gray/30 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <Icon name="Shield" className="text-coldfire-orange w-6 h-6 glow-effect" />
            <h1 className="text-xl font-industrial font-bold text-gray-100">
              COLDFIRE PROJECT
            </h1>
            <Badge variant="outline" className="text-coldfire-orange border-coldfire-orange/50 font-mono">
              ПОДДЕРЖКА
            </Badge>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8 border border-coldfire-orange/50">
                <AvatarFallback className="bg-coldfire-orange text-coldfire-black font-bold text-sm">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm font-mono">
                <div className="text-gray-100">{user.username}</div>
                <div className="text-coldfire-orange text-xs">
                  {user.role === 'moderator' ? 'МОДЕРАТОР' : 'ПОЛЬЗОВАТЕЛЬ'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {user.role === 'moderator' && (
                <Button
                  onClick={() => setShowUserPanel(!showUserPanel)}
                  variant="outline"
                  size="sm"
                  className="border-coldfire-orange/50 text-coldfire-orange hover:bg-coldfire-orange/10 font-mono"
                >
                  <Icon name="Settings" className="w-4 h-4" />
                </Button>
              )}
              <Button
                onClick={onLogout}
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-mono"
              >
                <Icon name="LogOut" className="w-4 h-4 mr-2" />
                ВЫХОД
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar - Ticket List */}
        <div className="w-1/4 bg-coldfire-dark/80 border-r border-coldfire-gray/30 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 border-b border-coldfire-gray/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-industrial font-bold text-gray-100">
                {user.role === 'moderator' ? 'ЗАЯВКИ' : 'МОИ ЧАТЫ'}
              </h2>
              {user.role === 'user' && (
                <Button
                  onClick={createNewTicket}
                  size="sm"
                  className="coldfire-button text-xs"
                >
                  <Icon name="Plus" className="w-3 h-3 mr-1" />
                  НОВЫЙ
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2 p-2">
            {tickets.map((ticket) => (
              <Card
                key={ticket.id}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedTicket === ticket.id
                    ? 'bg-coldfire-orange/20 border-coldfire-orange/50'
                    : 'coldfire-card hover:bg-coldfire-gray/20'
                }`}
                onClick={() => setSelectedTicket(ticket.id)}
              >
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={ticket.status === 'open' ? 'default' : 'secondary'}
                        className="text-xs font-mono"
                      >
                        {ticket.status === 'open' ? 'ОТКРЫТ' : 'ЗАКРЫТ'}
                      </Badge>
                      <span className="text-xs text-gray-400 font-mono">
                        {formatTime(ticket.created)}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-100 truncate">
                      {ticket.title}
                    </h3>
                    <div className="text-xs text-gray-400 font-mono">
                      {user.role === 'moderator' ? (
                        <div>
                          <div>👤 {ticket.user}</div>
                          <div>✉️ {ticket.email}</div>
                        </div>
                      ) : (
                        <div>{ticket.messages.length} сообщений</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedTicket && currentTicket ? (
            <>
              {/* Chat Header */}
              <div className="bg-coldfire-dark/80 border-b border-coldfire-gray/30 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-industrial font-bold text-gray-100">
                      {currentTicket.title}
                    </h3>
                    <div className="text-sm text-gray-400 font-mono">
                      ID: {currentTicket.id} • Создано: {formatTime(currentTicket.created)}
                    </div>
                  </div>
                  {user.role === 'moderator' && (
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" className="font-mono text-xs">
                        <Icon name="Archive" className="w-3 h-3 mr-1" />
                        АРХИВ
                      </Button>
                      <Button size="sm" variant="outline" className="font-mono text-xs">
                        <Icon name="MoreVertical" className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentTicket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderRole === user.role ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.senderRole === 'moderator'
                          ? 'bg-coldfire-orange/20 border border-coldfire-orange/30'
                          : 'bg-coldfire-gray/20 border border-coldfire-gray/30'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge
                          variant={message.senderRole === 'moderator' ? 'default' : 'secondary'}
                          className="text-xs font-mono"
                        >
                          {message.senderRole === 'moderator' ? 'МОД' : 'USER'}
                        </Badge>
                        <span className="text-xs text-gray-400 font-mono">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-gray-100 font-mono text-sm">{message.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-coldfire-dark/80 border-t border-coldfire-gray/30 p-4 backdrop-blur-sm">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Введите сообщение..."
                      className="coldfire-input font-mono resize-none"
                      rows={2}
                      maxLength={1000}
                    />
                    <div className="text-xs text-gray-400 font-mono mt-1">
                      {newMessage.length}/1000 символов
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-coldfire-gray/50 text-gray-400 hover:bg-coldfire-gray/20"
                    >
                      <Icon name="Paperclip" className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="coldfire-button"
                    >
                      <Icon name="Send" className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400 font-mono">
                <Icon name="MessageSquare" className="w-16 h-16 mx-auto mb-4 text-coldfire-gray" />
                <h3 className="text-lg mb-2">Выберите чат</h3>
                <p className="text-sm">
                  {user.role === 'moderator' 
                    ? 'Выберите заявку из списка слева' 
                    : 'Выберите чат или создайте новый'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}