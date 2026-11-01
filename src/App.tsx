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
import AuditLog from "./pages/AuditLog";
import NotFound from "./pages/NotFound";
import { logoutAndGo } from "./utils/auditClient";
import { ConfirmProvider } from "./components/ConfirmDialog";

const queryClient = new QueryClient();

const ClientRoute = () => {
  let user: any = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}') || {};
  } catch {
    user = {};
  }
  const viewClientLogin = user.admin ? sessionStorage.getItem('viewClientLogin') : null;
  const clientLogin = viewClientLogin || (user.admin ? '' : user.login) || '';

  if (!user.login || !clientLogin) {
    return <Navigate to="/" replace />;
  }

  return <ClientDashboard clientLogin={clientLogin} onLogout={() => logoutAndGo('/')} />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OperationsProvider>
          <ConfirmProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Login onLogin={() => {}} />} />
              <Route path="/client" element={<ClientRoute />} />
              <Route path="/card-operations" element={<CardOperations />} />
              <Route path="/admin" element={<AdminDashboard onLogout={() => logoutAndGo('/')} />} />
              <Route path="/operator" element={<OperatorPanel />} />
              <Route path="/chat-admin" element={<ChatAdmin />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <div className="footer-copyright">
            ЦКТ "СпецСистемы" © 2025
          </div>
          </ConfirmProvider>
        </OperationsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;