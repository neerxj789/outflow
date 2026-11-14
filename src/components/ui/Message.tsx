import React from "react";
import {
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";

export type MessageTone = "neutral" | "success" | "error";

interface MessageProps {
  tone?: MessageTone;
  text: string;
  className?: string;
}

export function Message({
  tone = "neutral",
  text,
  className = "",
}: MessageProps) {
  if (!text) return null;

  const icon =
    tone === "success"
      ? CheckmarkCircle02Icon
      : tone === "error"
      ? AlertCircleIcon
      : InformationCircleIcon;

  const colorClass =
    tone === "success"
      ? "text-[var(--accent-ink)]"
      : tone === "error"
      ? "text-[var(--status-error)]"
      : "text-[var(--text-muted)]";

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`inline-flex items-center gap-2 text-xs font-medium ${colorClass} ${className}`}
    >
      <Icon icon={icon} size={14} />
      <span>{text}</span>
    </div>
  );
}
