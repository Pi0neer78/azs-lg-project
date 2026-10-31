import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  hideCancel?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export const useConfirm = () => useContext(ConfirmContext);

export const useAlert = () => {
  const confirm = useContext(ConfirmContext);
  return useCallback(
    (message: string, title = 'Внимание') =>
      confirm({ title, message, confirmText: 'Понятно', hideCancel: true, danger: false }).then(() => undefined),
    [confirm]
  );
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ message: '' });
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    const o = typeof options === 'string' ? { message: options } : options;
    setOpts(o);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (value: boolean) => {
    setOpen(false);
    resolver.current?.(value);
    resolver.current = null;
  };

  const danger = opts.danger !== false;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialogPrimitive.Root open={open}>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialogPrimitive.Content
            onEscapeKeyDown={(e) => e.preventDefault()}
            className="fixed left-1/2 top-1/2 z-[101] w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-accent bg-card p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          >
            <button
              type="button"
              onClick={() => finish(false)}
              aria-label="Закрыть"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon name="X" size={18} />
            </button>
            <div className="flex flex-col items-center text-center">
              <img src="/confirm.webp" alt="" className="mb-4 h-32 w-32 rounded-2xl object-cover" />
              <AlertDialogPrimitive.Title className="text-xl font-bold text-foreground">
                {opts.title || 'Подтверждение'}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
                {opts.message}
              </AlertDialogPrimitive.Description>
              <div className={`mt-6 grid w-full gap-3 ${opts.hideCancel ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {!opts.hideCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => finish(false)}
                    className="border-2 border-accent text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    {opts.cancelText || 'Нет'}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => finish(true)}
                  className={danger ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-accent text-accent-foreground hover:bg-accent/90'}
                >
                  {opts.confirmText || 'Да'}
                </Button>
              </div>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </ConfirmContext.Provider>
  );
}
