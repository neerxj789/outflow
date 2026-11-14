import React from "react";
import type { IconSvgElement } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leadingIcon?: IconSvgElement;
  error?: string | null;
  onClear?: () => void;
}

export function Input({
  label,
  leadingIcon,
  error,
  onClear,
  value,
  disabled,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || React.useId();
  const hasValue = typeof value === "string" ? value.length > 0 : Boolean(value);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className="absolute left-3 text-[var(--text-muted)] pointer-events-none flex items-center">
            <Icon icon={leadingIcon} size={15} />
          </span>
        )}
        <input
          id={inputId}
          value={value}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={`w-full min-h-[40px] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] text-sm transition-colors duration-150 outline-none border ${
            error
              ? "border-[var(--status-error)] focus:border-[var(--status-error)]"
              : hasValue
              ? "border-[var(--border-strong)] focus:border-[var(--accent-ink)]"
              : "border-[var(--border-hairline)] focus:border-[var(--accent-ink)]"
          } ${leadingIcon ? "pl-9" : "pl-3"} ${
            onClear && hasValue ? "pr-9" : "pr-3"
          } disabled:opacity-45 disabled:cursor-not-allowed`}
          {...props}
        />
        {onClear && hasValue && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear input"
            className="absolute right-2.5 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors cursor-pointer"
          >
            <Icon icon={Cancel01Icon} size={14} />
          </button>
        )}
      </div>
      {error && (
        <span className="text-xs text-[var(--status-error)] font-medium" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
