import React from "react";

export type CardState = "empty" | "default" | "active" | "error";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  state?: CardState;
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  state = "default",
  interactive = false,
  padding = "md",
  className = "",
  children,
  ...props
}: CardProps) {
  const paddingClass =
    padding === "none"
      ? ""
      : padding === "sm"
      ? "p-4"
      : padding === "lg"
      ? "p-6 md:p-8"
      : "p-5";

  const stateClasses: Record<CardState, string> = {
    empty: "bg-[var(--bg-surface-alt)] border border-dashed border-[var(--border-hairline)]",
    default: "bg-[var(--bg-surface)] border border-[var(--border-hairline)]",
    active: "bg-[var(--bg-surface)] border border-[var(--accent-ink)]",
    error: "bg-[var(--bg-surface)] border border-[var(--status-error)]",
  };

  const interactiveClass = interactive
    ? "cursor-pointer transition-colors duration-150 hover:border-[var(--border-strong)]"
    : "transition-colors duration-150";

  return (
    <div
      className={`rounded-xl ${stateClasses[state]} ${interactiveClass} ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
