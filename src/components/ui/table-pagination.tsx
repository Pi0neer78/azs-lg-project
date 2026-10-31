import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZES = [10, 15, 20, 50, 100];

export default function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card flex-shrink-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Строк на странице:</span>
        <Select value={String(pageSize)} onValueChange={(v) => { onPageSizeChange(Number(v)); onPageChange(1); }}>
          <SelectTrigger className="h-7 w-20 text-sm border-border bg-input text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <span className="text-sm text-muted-foreground">
        {from}–{to} из {totalItems}
      </span>

      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="outline"
          className="h-7 w-7 border-border"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="В начало"
        >
          <Icon name="ChevronsLeft" size={14} />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-7 w-7 border-border"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Назад"
        >
          <Icon name="ChevronLeft" size={14} />
        </Button>
        <span className="text-sm text-foreground px-2 min-w-[80px] text-center">
          стр. {currentPage} из {totalPages || 1}
        </span>
        <Button
          size="icon"
          variant="outline"
          className="h-7 w-7 border-border"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Вперёд"
        >
          <Icon name="ChevronRight" size={14} />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-7 w-7 border-border"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="В конец"
        >
          <Icon name="ChevronsRight" size={14} />
        </Button>
      </div>
    </div>
  );
}
