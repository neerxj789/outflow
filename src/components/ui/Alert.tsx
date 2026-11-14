import React from "react";
import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";

export type AlertVariant = "info" | "success" | "error";

interface AlertProps {
  variant?: AlertVariant;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({
  variant = "info",
  message,
  onDismiss,
  className = "",
}: AlertProps) {
  if (!message) return null;

  const icon =
    variant === "success"
      ? CheckmarkCircle02Icon
      : variant === "error"
      ? AlertCircleIcon
      : InformationCircleIcon;

  const styleMap: Record<AlertVariant, string> = {
    info: "bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--text-primary)]",
    success:
      "bg-[var(--accent-surface)] border-[var(--accent-ink)]/50 text-[var(--accent-ink)]",
    error:
      "bg-[var(--status-error-bg)] border-[var(--status-error)]/70 text-[var(--status-error)]",
  };

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${styleMap[variant]} ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon icon={icon} size={16} />
        <span className="truncate">{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="p-1 opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Icon icon={Cancel01Icon} size={14} />
        </button>
      )}
    </div>
  );
}
