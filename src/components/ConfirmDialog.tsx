import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useDialogKeyboard, useScrollLock } from "../features/shared";

type ConfirmOptions = {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

// Ask before an irreversible action. Returns true if the user confirms.
export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  );

  const settle = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <ConfirmModal
          options={pending.options}
          onCancel={() => settle(false)}
          onConfirm={() => settle(true)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmModal({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Focus the cancel button by default so a stray Enter never deletes anything.
  const cancelButton = useRef<HTMLButtonElement>(null);
  const danger = options.tone !== "default";

  useScrollLock();
  useDialogKeyboard({ open: true, onClose: onCancel, initialFocus: cancelButton });

  return createPortal(
    <div
      className="confirm-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
    >
      <div className="confirm-card">
        {options.title && <h2 className="confirm-title">{options.title}</h2>}
        <div className="confirm-message">{options.message}</div>
        <div className="confirm-actions">
          <button ref={cancelButton} className="confirm-cancel" onClick={onCancel}>
            {options.cancelLabel || "Отмена"}
          </button>
          <button
            className={danger ? "confirm-ok confirm-ok--danger" : "confirm-ok"}
            onClick={onConfirm}
          >
            {options.confirmLabel || "Удалить"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
