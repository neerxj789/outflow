import React from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  label?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string | null;
  tone?: "neutral" | "lime" | "warning" | "error";
  className?: string;
  ariaLabel?: string;
}

export function Dropdown({
  label,
  value,
  options,
  onChange,
  disabled = false,
  error = null,
  tone = "neutral",
  className = "",
  ariaLabel,
}: DropdownProps) {
  const selectId = React.useId();

  const toneStyle = error
    ? "border-[var(--status-error)] bg-[var(--bg-input)] text-[var(--status-error)]"
    : tone === "lime"
    ? "border-[var(--accent-ink)]/50 bg-[var(--accent-surface)] text-[var(--accent-ink)]"
    : tone === "warning"
    ? "border-[var(--status-warning)]/50 bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
    : tone === "error"
    ? "border-[var(--status-error)]/50 bg-[var(--status-error-bg)] text-[var(--status-error)]"
    : "border-[var(--border-hairline)] bg-[var(--bg-input)] text-[var(--text-primary)]";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          id={selectId}
          aria-label={ariaLabel || label}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none min-h-[38px] pl-3 pr-8 rounded-lg border text-xs font-medium outline-none transition-colors duration-150 cursor-pointer focus:border-[var(--accent-ink)] disabled:opacity-45 disabled:cursor-not-allowed ${toneStyle}`}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 text-[var(--text-muted)] flex items-center">
          <Icon icon={ArrowDown01Icon} size={14} />
        </span>
      </div>
      {error && (
        <span className="text-xs text-[var(--status-error)] font-medium" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
