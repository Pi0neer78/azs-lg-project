import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export default function AdminHeader({ onLogout }: { onLogout: () => void }) {
  return (
      <header className="bg-card border-b-4 border-accent shadow-lg no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Icon name="Shield" className="w-8 h-8 text-accent" />
              <div>
                <h1 className="text-2xl font-bold text-accent">Панель администратора</h1>
                <p className="text-sm text-muted-foreground">Управление системой</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.open('/admin-manual.html', '_blank')} 
                variant="outline" 
                className="flex items-center gap-2 border-2 border-primary text-foreground hover:bg-primary hover:text-primary-foreground"
              >
                <Icon name="BookOpen" className="w-4 h-4" />
                Инструкция
              </Button>
              <Button onClick={onLogout} variant="outline" className="flex items-center gap-2 border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground">
                <Icon name="LogOut" className="w-4 h-4" />
                Выход
              </Button>
            </div>
          </div>
        </div>
      </header>
  );
}
