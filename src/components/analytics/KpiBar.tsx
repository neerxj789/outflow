import React from "react";
import {
  UserMultipleIcon,
  Call02Icon,
  Globe02Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import type { ContactFilter, DerivedAnalytics, LeadStatus } from "../../types/outflow";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";

interface KpiBarProps {
  analytics: DerivedAnalytics;
  contactFilter: ContactFilter;
  statusFilter: LeadStatus | "All";
  onSelectContactFilter: (filter: ContactFilter) => void;
  onSelectActivePipeline: () => void;
  onResetFilters: () => void;
}

export function KpiBar({
  analytics,
  contactFilter,
  statusFilter,
  onSelectContactFilter,
  onSelectActivePipeline,
  onResetFilters,
}: KpiBarProps) {
  const isEmpty = analytics.total === 0;
  const zeroPhonesWarning = analytics.total > 0 && analytics.withPhone === 0;
  const isPipelineFiltered = statusFilter === "Interested";

  const cards = [
    {
      id: "total",
      label: "Total Leads",
      value: String(analytics.total),
      icon: UserMultipleIcon,
      active: contactFilter === "all" && statusFilter === "All" && !isEmpty,
      error: false,
      onClick: onResetFilters,
    },
    {
      id: "phone",
      label: "Mobile Numbers",
      value: `${analytics.withPhone} (${analytics.phoneRate}%)`,
      icon: Call02Icon,
      active: contactFilter === "phone",
      error: zeroPhonesWarning,
      onClick: () =>
        onSelectContactFilter(contactFilter === "phone" ? "all" : "phone"),
    },
    {
      id: "website",
      label: "Verified Websites",
      value: `${analytics.withWebsite} (${analytics.websiteRate}%)`,
      icon: Globe02Icon,
      active: contactFilter === "website",
      error: false,
      onClick: () =>
        onSelectContactFilter(contactFilter === "website" ? "all" : "website"),
    },
    {
      id: "pipeline",
      label: "Active Outreach",
      value: String(analytics.activePipeline),
      icon: CheckmarkCircle02Icon,
      active: isPipelineFiltered,
      error: false,
      onClick: onSelectActivePipeline,
    },
  ];

  return (
    <section aria-label="Lead metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((item) => {
        const cardState = isEmpty
          ? "empty"
          : item.error
          ? "error"
          : item.active
          ? "active"
          : "default";

        return (
          <Card
            key={item.id}
            state={cardState}
            interactive={!isEmpty}
            padding="md"
            role="button"
            tabIndex={isEmpty ? -1 : 0}
            aria-pressed={item.active}
            onClick={() => {
              if (!isEmpty) item.onClick();
            }}
            onKeyDown={(e) => {
              if (!isEmpty && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                item.onClick();
              }
            }}
            className="flex flex-col justify-between gap-4 select-none"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  item.error
                    ? "text-[var(--status-error)]"
                    : item.active
                    ? "text-[var(--accent-ink)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {item.label}
              </span>
              <span
                className={`p-2 rounded-lg ${
                  isEmpty
                    ? "bg-[var(--bg-surface-alt)] text-[var(--text-faint)]"
                    : item.error
                    ? "bg-[var(--status-error-bg)] text-[var(--status-error)]"
                    : item.active
                    ? "bg-[var(--accent-lime)] text-[#000000]"
                    : "bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]"
                }`}
              >
                <Icon icon={item.icon} size={16} />
              </span>
            </div>

            <div
              className={`text-2xl font-semibold tabular-nums tracking-tight ${
                isEmpty
                  ? "text-[var(--text-faint)]"
                  : item.error
                  ? "text-[var(--status-error)]"
                  : "text-[var(--text-primary)]"
              }`}
            >
              {isEmpty ? "0" : item.value}
            </div>
          </Card>
        );
      })}
    </section>
  );
}
