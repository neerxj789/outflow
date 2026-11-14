import React from "react";
import { Coffee01Icon, GithubIcon } from "@hugeicons/core-free-icons";
import type { LegalDocType } from "../../types/outflow";
import { Icon } from "../ui/Icon";

interface FooterProps {
  onOpenLegal: (doc: LegalDocType) => void;
}

export function Footer({ onOpenLegal }: FooterProps) {
  return (
    <footer className="border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] py-10 px-6 text-sm text-[var(--text-muted)] transition-colors duration-150">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-serif text-xl text-[var(--text-primary)]">
            Outflow
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-xs text-[var(--text-muted)]">MIT License</span>
          <span aria-hidden="true">·</span>
          <span className="text-xs text-[var(--text-muted)]">
            Local Browser CRM
          </span>
        </div>

        <div className="flex items-center gap-6 flex-wrap text-xs font-medium">
          <button
            type="button"
            onClick={() => onOpenLegal("terms")}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap"
          >
            Terms of Service
          </button>
          <button
            type="button"
            onClick={() => onOpenLegal("privacy")}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => onOpenLegal("cookies")}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap"
          >
            Cookie Policy
          </button>
          <a
            href="https://github.com/neerxj789/outflow"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-ink)] transition-colors whitespace-nowrap"
          >
            <Icon icon={GithubIcon} size={14} />
            <span>GitHub</span>
          </a>
          <a
            href="https://rzp.io/rzp/spill-the-chai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-ink)] transition-colors whitespace-nowrap"
          >
            <Icon icon={Coffee01Icon} size={14} />
            <span>Support Developer</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
