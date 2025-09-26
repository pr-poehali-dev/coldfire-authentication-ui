
import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthForm from "./components/AuthForm";
import EnhancedChatInterface from "./components/EnhancedChatInterface";

const queryClient = new QueryClient();

interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'moderator';
  station: string;
  avatar_url: string;
  warning_count: number;
}

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>('');

  const handleLogin = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {user ? (
          <EnhancedChatInterface user={user} token={token} onLogout={handleLogout} />
        ) : (
          <AuthForm onLogin={handleLogin} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;