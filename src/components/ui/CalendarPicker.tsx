import React, { useState, useRef, useEffect } from "react";
import {
  Calendar01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";

interface CalendarPickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string | null;
  className?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatDisplayDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return iso;
  const d = new Date(year, month, day);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function CalendarPicker({
  value = "",
  onChange,
  placeholder = "Set date",
  disabled = false,
  error = null,
  className = "",
}: CalendarPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialDate = value ? new Date(`${value}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(
    Number.isNaN(initialDate.getTime())
      ? new Date().getFullYear()
      : initialDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    Number.isNaN(initialDate.getTime())
      ? new Date().getMonth()
      : initialDate.getMonth()
  );

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  const todayIso = new Date().toISOString().slice(0, 10);
  const isOverdue = Boolean(value && value < todayIso);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[34px] rounded-lg border text-xs font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed tabular-nums ${
            error || isOverdue
              ? "bg-[var(--status-error-bg)] border-[var(--status-error)] text-[var(--status-error)]"
              : value
              ? "bg-[var(--accent-surface)] border-[var(--accent-ink)]/50 text-[var(--accent-ink)]"
              : "bg-[var(--bg-input)] border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
          }`}
        >
          <Icon icon={Calendar01Icon} size={13} />
          <span>{value ? formatDisplayDate(value) : placeholder}</span>
        </button>

        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear date"
            className="p-1 text-[var(--text-faint)] hover:text-[var(--text-primary)] rounded transition-colors cursor-pointer"
          >
            <Icon icon={Cancel01Icon} size={12} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute right-0 mt-1.5 z-50 w-64 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-3 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-lg bg-[var(--bg-surface-alt)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Icon icon={ArrowLeft01Icon} size={14} />
            </button>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-lg bg-[var(--bg-surface-alt)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Icon icon={ArrowRight01Icon} size={14} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS.map((d) => (
              <span
                key={d}
                className="text-[11px] font-medium text-[var(--text-muted)] py-1"
              >
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, idx) => (
              <span key={`empty-${idx}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const iso = `${viewYear}-${String(viewMonth + 1).padStart(
                2,
                "0"
              )}-${String(day).padStart(2, "0")}`;
              const isSelected = value === iso;
              const isToday = todayIso === iso;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`h-7 w-7 rounded-md text-xs tabular-nums flex items-center justify-center transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[var(--accent-lime)] text-[#000000] font-semibold"
                      : isToday
                      ? "border border-[var(--accent-ink)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <span className="block mt-1 text-xs text-[var(--status-error)]" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
