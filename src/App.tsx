import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { OperationsProvider } from "./contexts/OperationsContext";
import Login from "./pages/Login";
import ClientDashboard from "./pages/ClientDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CardOperations from "./pages/CardOperations";
import OperatorPanel from "./pages/OperatorPanel";
import ChatAdmin from "./pages/ChatAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ClientRoute = () => {
  const viewClientLogin = sessionStorage.getItem('viewClientLogin');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const clientLogin = viewClientLogin || user.login || '';
  
  if (!clientLogin) {
    return <Navigate to="/" replace />;
  }
  
  return <ClientDashboard clientLogin={clientLogin} onLogout={() => window.location.href = '/'} />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OperationsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Login onLogin={() => {}} />} />
              <Route path="/client" element={<ClientRoute />} />
              <Route path="/card-operations" element={<CardOperations />} />
              <Route path="/admin" element={<AdminDashboard onLogout={() => window.location.href = '/'} />} />
              <Route path="/operator" element={<OperatorPanel />} />
              <Route path="/chat-admin" element={<ChatAdmin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <div className="footer-copyright">
            ЦКТ "СпецСистемы" © 2025
          </div>
        </OperationsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;