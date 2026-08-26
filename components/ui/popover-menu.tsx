"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

export function PopoverMenu({
  open,
  onClose,
  anchorRef,
  children,
  className,
  align = "end",
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  align?: "start" | "end";
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setCoords(null);
      return;
    }

    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth ?? 168;
      const menuHeight = menuRef.current?.offsetHeight ?? 140;
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight + gap && rect.top > spaceBelow;
      const top = openUp ? rect.top - menuHeight - gap : rect.bottom + gap;
      const left =
        align === "end"
          ? Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8)
          : Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8);
      setCoords({ top, left });
    };

    update();
    // Re-measure once after mount so height/width are accurate
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, align]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClickAway = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickAway);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickAway);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      id={menuId}
      ref={menuRef}
      role="menu"
      className={cn(
        "fixed z-[100] min-w-[168px] overflow-hidden rounded-xl border py-1.5 text-sm shadow-xl",
        className,
      )}
      style={{
        top: coords?.top ?? -9999,
        left: coords?.left ?? -9999,
        visibility: coords ? "visible" : "hidden",
        borderColor: "var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-lift, var(--shadow-soft))",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function PopoverMenuItem({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition hover:bg-[var(--hover)] disabled:opacity-40",
        danger && "text-[var(--danger)]",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
