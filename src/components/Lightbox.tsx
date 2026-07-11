import { useRef } from "react";
import { createPortal } from "react-dom";

import { useDialogKeyboard, useScrollLock } from "../features/shared";

// Full-screen photo viewer. Rendered through a portal into document.body so no
// transformed / clipped ancestor can trap the fixed backdrop inside a tab, and
// with a scroll lock so closing it never makes the page jump.
export function Lightbox({
  images,
  index,
  alt,
  onClose,
  onIndex,
}: {
  images: string[];
  index: number;
  alt?: string;
  onClose: () => void;
  onIndex?: (next: number) => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const count = images.length;
  const many = count > 1;
  const go = (amount: number) => onIndex?.((index + amount + count) % count);

  useScrollLock();
  useDialogKeyboard({
    open: true,
    onClose,
    onPrevious: many ? () => go(-1) : undefined,
    onNext: many ? () => go(1) : undefined,
    initialFocus: closeButton,
  });

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <img src={images[index]} alt={alt || ""} />
      <button ref={closeButton} className="lightbox-close" onClick={onClose} aria-label="Закрыть">
        ×
      </button>
      {many && (
        <>
          <button className="lightbox-prev" onClick={() => go(-1)} aria-label="Предыдущее фото">
            ‹
          </button>
          <button className="lightbox-next" onClick={() => go(1)} aria-label="Следующее фото">
            ›
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
