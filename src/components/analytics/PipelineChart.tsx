import React from "react";
import { BarChartIcon } from "@hugeicons/core-free-icons";
import type { DerivedAnalytics, LeadStatus } from "../../types/outflow";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";

interface PipelineChartProps {
  analytics: DerivedAnalytics;
  statusFilter: LeadStatus | "All";
  onSelectStatus: (status: LeadStatus | "All") => void;
}

function getStageColors(status: LeadStatus, active: boolean) {
  switch (status) {
    case "Interested":
      return {
        bar: "bg-[var(--accent-lime)]",
        text: active ? "text-[var(--accent-ink)]" : "text-[var(--text-primary)]",
      };
    case "Follow Up":
      return {
        bar: "bg-[var(--status-warning)]",
        text: active
          ? "text-[var(--status-warning)]"
          : "text-[var(--text-primary)]",
      };
    case "Contacted":
      return {
        bar: "bg-[var(--text-secondary)]",
        text: active
          ? "text-[var(--text-primary)]"
          : "text-[var(--text-secondary)]",
      };
    case "Not Interested":
      return {
        bar: "bg-[var(--status-error)]",
        text: active
          ? "text-[var(--status-error)]"
          : "text-[var(--text-secondary)]",
      };
    default:
      return {
        bar: "bg-[var(--text-muted)]",
        text: active
          ? "text-[var(--accent-ink)]"
          : "text-[var(--text-secondary)]",
      };
  }
}

export function PipelineChart({
  analytics,
  statusFilter,
  onSelectStatus,
}: PipelineChartProps) {
  const isEmpty = analytics.total === 0;
  const allRejected =
    analytics.total > 0 &&
    analytics.stages.find((s) => s.status === "Not Interested")?.count ===
      analytics.total;

  return (
    <Card
      state={isEmpty ? "empty" : allRejected ? "error" : "default"}
      padding="md"
      aria-label="Pipeline distribution"
    >
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <Icon
            icon={BarChartIcon}
            size={18}
            className={
              isEmpty ? "text-[var(--text-faint)]" : "text-[var(--accent-ink)]"
            }
          />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Pipeline Breakdown
          </h2>
        </div>

        {statusFilter !== "All" && (
          <button
            type="button"
            onClick={() => onSelectStatus("All")}
            className="text-xs font-medium text-[var(--accent-ink)] hover:underline transition-colors cursor-pointer whitespace-nowrap"
          >
            Clear stage filter
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="space-y-3">
          <div className="h-3 w-full rounded-full bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)]" />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {analytics.stages.map((stage) => (
              <div
                key={stage.status}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] text-xs text-[var(--text-faint)]"
              >
                <span>{stage.status}</span>
                <span className="tabular-nums">0</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className="h-3.5 w-full rounded-full bg-[var(--bg-surface-alt)] overflow-hidden flex gap-0.5 p-0.5 border border-[var(--border-hairline)]"
            role="img"
            aria-label="Proportional pipeline stage bar"
          >
            {analytics.stages.map((stage) => {
              if (stage.count === 0) return null;
              const colors = getStageColors(
                stage.status,
                statusFilter === stage.status
              );
              const dimmed =
                statusFilter !== "All" && statusFilter !== stage.status;
              return (
                <button
                  key={stage.status}
                  type="button"
                  title={`${stage.status}: ${stage.count}`}
                  onClick={() =>
                    onSelectStatus(
                      statusFilter === stage.status ? "All" : stage.status
                    )
                  }
                  style={{ width: `${Math.max(stage.percentage, 2)}%` }}
                  className={`h-full rounded-full transition-opacity duration-150 cursor-pointer ${colors.bar} ${
                    dimmed ? "opacity-30" : "opacity-100"
                  }`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {analytics.stages.map((stage) => {
              const isSelected = statusFilter === stage.status;
              const colors = getStageColors(stage.status, isSelected);
              return (
                <button
                  key={stage.status}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    onSelectStatus(isSelected ? "All" : stage.status)
                  }
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-[var(--bg-surface-alt)] border-[var(--accent-ink)]"
                      : "bg-[var(--bg-surface-alt)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.bar}`}
                    />
                    <span
                      className={`text-xs font-medium truncate ${colors.text}`}
                    >
                      {stage.status}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums shrink-0">
                    {stage.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
