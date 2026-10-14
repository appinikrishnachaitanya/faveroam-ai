"use client";
import { useEffect, useRef } from "react";
import { Icon } from "./passport";
export default function ConciergeDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = dialog.current;
    if (open) {
      opener.current = document.activeElement as HTMLElement;
      if (!element?.open) element?.showModal();
    } else if (element?.open) {
      element.close();
      opener.current?.focus();
    }
    return () => {
      if (element?.open) element.close();
    };
  }, [open]);
  return (
    <dialog
      id="taste-concierge"
      ref={dialog}
      className="concierge-drawer"
      aria-labelledby="concierge-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) {
          const rect = dialog.current.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="concierge-heading">
        <span className="agent-avatar">
          <Icon name="star" />
        </span>
        <div>
          <h2 id="concierge-title">Taste Concierge</h2>
          <p>A little guidance. Your kind of discovery.</p>
        </div>
        <button
          className="icon-button"
          aria-label="Close Taste Concierge"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
