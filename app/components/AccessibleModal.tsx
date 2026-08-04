"use client";

import { type ReactNode, useEffect, useRef } from "react";

const FOCUSABLE =
  "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export default function AccessibleModal({
  labelledBy,
  onClose,
  closeOnEscape = true,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  closeOnEscape?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => { closeOnEscapeRef.current = closeOnEscape; }, [closeOnEscape]);
  useEffect(() => {
    const prior =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const frame = requestAnimationFrame(() =>
      ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus(),
    );
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscapeRef.current) {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !ref.current) return;
      const controls = [
        ...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ];
      if (!controls.length) return;
      const first = controls[0];
      const last = controls.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keydown);
      prior?.focus();
    };
  }, []);
  return (
    <div
      ref={ref}
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      {children}
    </div>
  );
}
