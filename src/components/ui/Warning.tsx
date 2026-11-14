import React from "react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";

interface WarningProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function Warning({
  message,
  actionLabel,
  onAction,
  className = "",
}: WarningProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[var(--status-warning)]/50 bg-[var(--status-warning-bg)] text-[var(--status-warning)] text-sm font-medium ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon icon={Alert02Icon} size={16} />
        <span className="truncate">{message}</span>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-3 py-1 rounded-md bg-[var(--status-warning)] text-[#000000] text-xs font-semibold whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
