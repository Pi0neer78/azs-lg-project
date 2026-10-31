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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background">
      <ChatLauncher />
      <AdminHeader onLogout={onLogout} />
      <AdminTabs dash={dash} />
      <AdminDialogs dash={dash} />
      <AdminCardDialogs dash={dash} />
    </div>
  );
}
