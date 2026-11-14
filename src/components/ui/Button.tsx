import React from "react";
import type { IconSvgElement } from "@hugeicons/react";
import { Icon } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonStatus = "idle" | "working" | "error";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  status?: ButtonStatus;
  icon?: IconSvgElement;
  trailingIcon?: IconSvgElement;
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "secondary",
  status = "idle",
  icon,
  trailingIcon,
  size = "md",
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const isWorking = status === "working";
  const isError = status === "error";
  const isDisabled = disabled || isWorking;

  const sizeStyles =
    size === "sm"
      ? "px-3 py-1.5 text-xs min-h-[34px]"
      : size === "lg"
      ? "px-6 py-3 text-base min-h-[46px]"
      : "px-4 py-2 text-sm min-h-[40px]";

  const variantStyles: Record<ButtonVariant, string> = {
    primary: isError
      ? "bg-[var(--status-error)] text-[#ffffff] border border-[var(--status-error)]"
      : "bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] text-[#000000] border border-[var(--accent-lime)]",
    secondary: isError
      ? "bg-[var(--bg-surface)] text-[var(--status-error)] border border-[var(--status-error)]"
      : "bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-hairline)]",
    ghost: isError
      ? "bg-transparent text-[var(--status-error)] border border-[var(--status-error)]"
      : "bg-transparent hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent",
    danger:
      "bg-[var(--status-error-bg)] hover:opacity-90 text-[var(--status-error)] border border-[var(--status-error)]",
  };

  return (
    <button
      disabled={isDisabled}
      aria-busy={isWorking}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${sizeStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isWorking ? (
        <span
          className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0"
          aria-hidden="true"
        />
      ) : (
        icon && <Icon icon={icon} size={size === "lg" ? 18 : 15} />
      )}
      <span>{children}</span>
      {!isWorking && trailingIcon && (
        <Icon icon={trailingIcon} size={size === "lg" ? 18 : 15} />
      )}
    </button>
  );
}
