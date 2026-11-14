import React from "react";
import {
  ArrowRight01Icon,
  Coffee01Icon,
  Download01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";

interface LandingPageProps {
  onOpenWorkspace: () => void;
  onOpenExtension: () => void;
}

export function LandingPage({
  onOpenWorkspace,
  onOpenExtension,
}: LandingPageProps) {
  return (
    <main className="bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors duration-150">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-4xl mx-auto text-center space-y-7">
          <h1 className="font-serif text-[44px] sm:text-[60px] lg:text-[72px] leading-[1.04] tracking-tight text-[var(--text-primary)] text-balance">
            Turn messy map exports and open web pages into ready-to-call client lists.
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
            Scrape names, emails, mobile numbers, and source links directly from any webpage using the Outflow Chrome Extension—or paste raw map tables right into your workspace for instant CSV and PDF export.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              trailingIcon={ArrowRight01Icon}
              onClick={onOpenWorkspace}
              className="w-full sm:w-auto"
            >
              Open Workspace
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={Download01Icon}
              onClick={onOpenExtension}
              className="w-full sm:w-auto"
            >
              Get Extension
            </Button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-4 flex-wrap text-xs text-[var(--text-muted)]">
            <span>Free forever</span>
            <span aria-hidden="true">·</span>
            <span>Runs locally in your browser</span>
            <span aria-hidden="true">·</span>
            <span>Extension + CSV, TSV, JSON</span>
          </div>
        </div>
      </section>

      {/* Capabilities Asymmetric Bento Section */}
      <section
        id="capabilities"
        className="max-w-7xl mx-auto px-6 py-20 border-t border-[var(--border-hairline)] scroll-mt-20"
      >
        <div className="mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl text-[var(--text-primary)] tracking-tight">
            Built for clean, fast lead capture
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card padding="lg" className="md:col-span-2 space-y-3">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">
              01. Universal webpage scraping with auto-pagination
            </h3>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Run the Outflow Chrome Side Panel on Google Search, Google Maps, or any directory page with links. It scrolls feeds, switches pages automatically up to 200 leads, and extracts only Name, Email, Mobile Number, and Source Link.
            </p>
          </Card>

          <Card padding="lg" className="space-y-3">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">
              02. Strict URL filtering
            </h3>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Google redirect wrappers and map direction links are stripped automatically, keeping only real websites or source profile links.
            </p>
          </Card>

          <Card padding="lg" className="space-y-3">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">
              03. Smart phone &amp; email extraction
            </h3>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Mobile and landline numbers embedded inside address lines are separated cleanly, with optional background link scanning that skips protected sites politely.
            </p>
          </Card>

          <Card padding="lg" className="md:col-span-2 space-y-3">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">
              04. One-click Send to Outflow and CRM pipeline tracking
            </h3>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Push scraped batches straight from the extension into your workspace tab, organize niches into lists, track follow-up dates, and export filtered tables to CSV or PDF without sending data to any server.
            </p>
          </Card>
        </div>
      </section>

      {/* Workflow Section */}
      <section
        id="workflow"
        className="max-w-7xl mx-auto px-6 py-20 border-t border-[var(--border-hairline)] scroll-mt-20"
      >
        <div className="mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl text-[var(--text-primary)] tracking-tight">
            Three steps from open tab to outreach
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card padding="lg" className="space-y-3">
            <div className="text-sm font-semibold text-[var(--accent-ink)] tabular-nums">
              01
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Install the Outflow Extension
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Download the free Chrome extension package, load it in Developer Mode, and open the Side Panel on any search results or business directory tab.
            </p>
          </Card>

          <Card padding="lg" className="space-y-3">
            <div className="text-sm font-semibold text-[var(--accent-ink)] tabular-nums">
              02
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Auto-scrape up to 200 leads
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Click Start Scrape to gather names, phones, emails, and source links across pages automatically, and click Stop whenever you have enough.
            </p>
          </Card>

          <Card padding="lg" className="space-y-3">
            <div className="text-sm font-semibold text-[var(--accent-ink)] tabular-nums">
              03
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Send to Outflow &amp; export
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Send leads directly into your Outflow CRM workspace or copy/download as CSV and PDF with zero manual spreadsheet cleanup.
            </p>
          </Card>
        </div>
      </section>

      {/* Support Developer Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-[var(--border-hairline)]">
        <Card
          padding="lg"
          className="max-w-2xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        >
          <div className="space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl text-[var(--text-primary)]">
              Keep Outflow free and open source
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Built and maintained independently with zero tracking or paywalls.
            </p>
          </div>

          <a
            href="https://rzp.io/rzp/spill-the-chai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] text-[#000000] text-sm font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            <Icon icon={Coffee01Icon} size={16} />
            <span>Buy Me a Chai</span>
          </a>
        </Card>
      </section>
    </main>
  );
}
