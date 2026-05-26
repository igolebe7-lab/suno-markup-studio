import { useEffect, useRef, type ReactNode } from 'react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

type AppModalProps = {
  children: ReactNode;
  onClose: () => void;
  ariaLabel: string;
  className: string;
  backdropClassName?: string;
  testId?: string;
  as?: 'section' | 'aside';
  returnFocusSelector?: string;
};

export function AppModal({
  children,
  onClose,
  ariaLabel,
  className,
  backdropClassName = 'tag-settings-backdrop',
  testId,
  as = 'section',
  returnFocusSelector
}: AppModalProps) {
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusable = getFocusable(panel);
    window.setTimeout(() => (focusable[0] ?? panel)?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = getFocusable(panelRef.current);
      if (!items.length) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus?.isConnected) {
        previousFocus.focus();
        return;
      }
      if (returnFocusSelector) {
        document.querySelector<HTMLElement>(returnFocusSelector)?.focus();
      }
    };
  }, [onClose, returnFocusSelector]);

  const Panel = as;
  return (
    <div
      className={backdropClassName}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Panel
        ref={panelRef as never}
        className={className}
        data-testid={testId}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        {children}
      </Panel>
    </div>
  );
}

function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
}
