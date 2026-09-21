import { useEffect, useRef } from 'react';
import type { MouseEvent, ReactNode, SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons';
import { IconButton } from './IconButton';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** `sheet` (default) slides up from the bottom on phones; `center` is always centered. */
  presentation?: 'sheet' | 'center';
}

/**
 * Native `<dialog>`: bottom sheet on phones (drag-handle bar, safe-area padding), centered
 * 480 px card on `md+`. Escape and backdrop click close it; body scroll is locked while open.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  presentation = 'sheet',
}: DialogProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useRef(`dialog-${Math.random().toString(36).slice(2, 9)}`).current;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const first = dialog.querySelector<HTMLElement>(
        'input, select, textarea, button:not([data-dialog-close])',
      );
      first?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onClose();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  const sheet = presentation === 'sheet';

  return (
    <dialog
      ref={ref}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-modal="true"
      aria-labelledby={titleId}
      className={cn(
        'fixed h-auto max-w-none bg-transparent p-0 text-ink backdrop:bg-black/40 backdrop:backdrop-blur-sm open:flex open:flex-col',
        // Width and margin are set once per presentation: stacking `m-0 w-full` with
        // `m-auto w-[...]` lets the stylesheet order decide, which broke the centered card.
        // The centered card fills the viewport with a transparent dialog and centres the
        // panel inside it, so it sits mid-screen whatever its height.
        sheet
          ? 'inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full md:inset-0 md:m-auto md:max-h-[85dvh] md:w-[min(30rem,calc(100%-2rem))]'
          : 'inset-0 m-0 h-full w-full p-4 open:items-center open:justify-center',
        className,
      )}
    >
      <div
        className={cn(
          'flex max-h-[inherit] flex-col overflow-hidden bg-surface shadow-panel',
          sheet
            ? 'animate-sheet-up rounded-t-[var(--r-lg)] md:animate-dialog-in md:rounded-[var(--r-md)]'
            : 'animate-dialog-in w-full max-w-[30rem] rounded-[var(--r-md)] max-h-[85dvh]',
        )}
      >
        {sheet ? (
          <div className="flex justify-center pt-3 md:hidden" aria-hidden="true">
            <span className="h-1.5 w-10 rounded-full bg-line" />
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-2 md:px-6 md:pt-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-h1">
              {title}
            </h2>
            {description ? <p className="text-caption mt-1 text-ink-2">{description}</p> : null}
          </div>
          <IconButton
            aria-label={t('common.close')}
            onClick={onClose}
            data-dialog-close
            className="-me-2 -mt-2"
          >
            <Icon.X />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 md:px-6">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:flex-row md:justify-end md:px-6 md:pb-6 [&>*]:w-full md:[&>*]:w-auto">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
