import React, { useState } from "react";
import {
  Menu01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  Sun01Icon,
  Moon01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import type { AppView } from "../../types/outflow";
import type { ThemeMode } from "../../App";

interface NavbarProps {
  currentView: AppView;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onNavigate: (view: AppView, anchor?: string) => void;
  onOpenExtension: () => void;
}

export function Navbar({
  currentView,
  theme,
  onToggleTheme,
  onNavigate,
  onOpenExtension,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLinkClick = (view: AppView, anchor?: string) => {
    setMobileOpen(false);
    onNavigate(view, anchor);
  };

  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-canvas)]/95 backdrop-blur-md border-b border-[var(--border-hairline)] transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => handleLinkClick("landing")}
          className="font-serif text-2xl tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer"
        >
          Outflow
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--text-secondary)]"
        >
          <button
            type="button"
            onClick={() => handleLinkClick("landing", "capabilities")}
            className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Capabilities
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick("landing", "workflow")}
            className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Workflow
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenExtension();
            }}
            className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Get Extension
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick("legal")}
            className={`hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentView === "legal" ? "text-[var(--accent-ink)] font-semibold" : ""
            }`}
          >
            Legal
          </button>
        </nav>

        {/* Zone 3: Theme toggle + primary action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-hairline)] text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
          >
            <Icon icon={isDark ? Sun01Icon : Moon01Icon} size={17} />
          </button>

          {currentView === "workspace" ? (
            <Button
              variant="secondary"
              size="md"
              onClick={() => handleLinkClick("landing")}
              className="hidden md:inline-flex"
            >
              Overview
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              trailingIcon={ArrowRight01Icon}
              onClick={() => handleLinkClick("workspace")}
              className="hidden md:inline-flex"
            >
              Open Workspace
            </Button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)] cursor-pointer"
          >
            <Icon icon={mobileOpen ? Cancel01Icon : Menu01Icon} size={18} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-6 py-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleLinkClick("landing", "capabilities")}
            className="text-left py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Capabilities
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick("landing", "workflow")}
            className="text-left py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Workflow
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenExtension();
            }}
            className="text-left py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Get Extension
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick("legal")}
            className="text-left py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Legal
          </button>
          <Button
            variant="primary"
            size="md"
            trailingIcon={ArrowRight01Icon}
            onClick={() =>
              handleLinkClick(
                currentView === "workspace" ? "landing" : "workspace"
              )
            }
          >
            {currentView === "workspace" ? "Overview" : "Open Workspace"}
          </Button>
        </div>
      )}
    </header>
  );
}
