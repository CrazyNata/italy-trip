import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

// Locks background scrolling while an overlay is open and compensates for the
// disappearing scrollbar so the page underneath doesn't jump.
export function useScrollLock() {
  useLayoutEffect(() => {
    const { body, documentElement } = document;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, []);
}

export const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
export const field =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--ac)]";
export const button =
  "rounded-xl bg-[var(--ac)] px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-px hover:opacity-90";
export const subtleButton =
  "rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ac)] hover:text-[var(--ac)]";

export function useTransientState<T>(setValue: (value: T) => void) {
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  return (value: T, reset: T, delay = 1600) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setValue(value);
    timer.current = window.setTimeout(() => {
      setValue(reset);
      timer.current = null;
    }, delay);
  };
}

export function useDialogKeyboard({
  open,
  onClose,
  onPrevious,
  onNext,
  initialFocus,
}: {
  open: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  initialFocus?: RefObject<HTMLElement | null>;
}) {
  const restoreFocus = useRef<HTMLElement | null>(null);
  const handlers = useRef({ onClose, onPrevious, onNext });
  handlers.current = { onClose, onPrevious, onNext };
  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    initialFocus?.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handlers.current.onClose();
      if (event.key === "ArrowLeft") handlers.current.onPrevious?.();
      if (event.key === "ArrowRight") handlers.current.onNext?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      restoreFocus.current?.focus();
    };
  }, [open, initialFocus]);
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement("textarea");
    input.value = text;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}

export function PanelTitle({ eyebrow, children, action }: { eyebrow: string; children: ReactNode; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--ac)]">{eyebrow}</p><h2 className="mt-1 font-display text-3xl font-semibold">{children}</h2></div>{action}</div>;
}
export function Empty({ children }: { children: ReactNode }) { return <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-[var(--muted)]">{children}</div>; }
