import ChatLauncher from '@/components/chat/ChatLauncher';
import { useAdminDashboard } from '@/components/admin/useAdminDashboard';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminTabs from '@/components/admin/AdminTabs';
import AdminDialogs from '@/components/admin/AdminDialogs';
import AdminCardDialogs from '@/components/admin/AdminCardDialogs';

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const dash = useAdminDashboard();

  return (
    <div
      className="h-[calc(100vh-40px)] overflow-hidden flex flex-col print:h-auto print:overflow-visible bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "linear-gradient(rgba(6,26,18,0.5), rgba(6,26,18,0.65)), url('/bg-admin.webp')" }}
    >
      <ChatLauncher />
      <AdminHeader onLogout={onLogout} />
      <AdminTabs dash={dash} />
      <AdminDialogs dash={dash} />
      <AdminCardDialogs dash={dash} />
    </div>
  );
}
