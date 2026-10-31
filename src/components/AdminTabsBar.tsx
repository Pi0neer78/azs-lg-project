import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Icon from '@/components/ui/icon';

interface AdminTab {
  value: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const TABS: AdminTab[] = [
  { value: 'clients', label: 'Клиенты', icon: 'Users', color: 'text-sky-400', description: 'Список клиентов и сотрудников: логины, пароли, права, памятки для печати.' },
  { value: 'cards', label: 'Карты', icon: 'CreditCard', color: 'text-emerald-400', description: 'Топливные карты клиентов: остатки, лимиты, блокировка и PIN-коды.' },
  { value: 'operations', label: 'Операции', icon: 'History', color: 'text-orange-400', description: 'История заправок, списаний и оприходований с фильтрами, печатью и выгрузкой в Excel.' },
  { value: 'stations', label: 'АЗС', icon: 'Fuel', color: 'text-rose-400', description: 'Справочник заправочных станций и их кодов в 1С.' },
  { value: 'fuel-types', label: 'Виды топлива', icon: 'Droplets', color: 'text-cyan-400', description: 'Справочник видов топлива и единиц измерения (литры, рубли).' },
  { value: 'database', label: 'База данных', icon: 'Database', color: 'text-violet-400', description: 'Архивы данных под паролем: создание, скачивание и удаление старых копий.' },
];

export default function AdminTabsBar() {
  return (
    <TabsList className="no-print h-auto flex-wrap gap-1 bg-card/50 border-2 border-primary p-1">
      {TABS.map((t) => (
        <Tooltip key={t.value} delayDuration={250}>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <TabsTrigger
                value={t.value}
                className="group gap-1.5 rounded-md border-b-[3px] border-transparent px-3 py-1 text-sm font-semibold text-foreground/80 transition-all hover:bg-primary/20 hover:text-foreground data-[state=active]:border-yellow-700 data-[state=active]:bg-gradient-to-b data-[state=active]:from-yellow-200 data-[state=active]:to-yellow-400 data-[state=active]:text-emerald-950 data-[state=active]:shadow-[0_3px_0_0_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.7)] data-[state=active]:-translate-y-px"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-background/70 shadow-inner group-data-[state=active]:bg-white">
                  <Icon name={t.icon} size={14} className={t.color} />
                </span>
                {t.label}
              </TabsTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs whitespace-normal bg-card text-foreground border-2 border-accent shadow-xl">
            {t.description}
          </TooltipContent>
        </Tooltip>
      ))}
    </TabsList>
  );
}
