import React from "react";

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
  error = false,
  className = "",
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2.5 px-3 py-2 min-h-[40px] rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
        error
          ? "bg-[var(--bg-surface)] border-[var(--status-error)] text-[var(--status-error)]"
          : checked
          ? "bg-[var(--bg-surface)] border-[var(--accent-ink)] text-[var(--text-primary)]"
          : "bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
      } ${className}`}
    >
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-150 ${
          error
            ? "bg-[var(--status-error)]/40"
            : checked
            ? "bg-[var(--accent-lime)]"
            : "bg-[var(--border-strong)]"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 rounded-full transition-transform duration-150 ${
            checked
              ? "translate-x-3.5 bg-[#000000]"
              : "translate-x-0.5 bg-[#ffffff]"
          }`}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}
