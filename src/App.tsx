
import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthForm from "./components/AuthForm";
import ChatInterface from "./components/ChatInterface";

const queryClient = new QueryClient();

interface User {
  username: string;
  role: 'user' | 'moderator';
}

const App = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (username: string, password: string, role: 'user' | 'moderator') => {
    setUser({ username, role });
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {user ? (
          <ChatInterface user={user} onLogout={handleLogout} />
        ) : (
          <AuthForm onLogin={handleLogin} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;