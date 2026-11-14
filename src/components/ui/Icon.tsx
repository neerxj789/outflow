import React from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

interface IconProps {
  icon: IconSvgElement;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function Icon({
  icon,
  size = 16,
  strokeWidth = 1.75,
  className = "",
}: IconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
}
