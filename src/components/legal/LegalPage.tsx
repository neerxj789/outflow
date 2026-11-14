import React from "react";
import { ArrowLeft01Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import type { LegalDocType } from "../../types/outflow";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

interface LegalPageProps {
  activeDoc: LegalDocType;
  onSelectDoc: (doc: LegalDocType) => void;
  onBack: () => void;
}

const LEGAL_TABS: { id: LegalDocType; label: string }[] = [
  { id: "terms", label: "Terms of Service" },
  { id: "privacy", label: "Privacy Policy" },
  { id: "cookies", label: "Cookie Policy" },
];

export function LegalPage({ activeDoc, onSelectDoc, onBack }: LegalPageProps) {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon icon={Shield01Icon} size={22} className="text-[var(--accent-ink)]" />
          <h1 className="font-serif text-3xl sm:text-4xl text-[var(--text-primary)] tracking-tight">
            Legal & Data Governance
          </h1>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={ArrowLeft01Icon}
          onClick={onBack}
        >
          Back
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {LEGAL_TABS.map((tab) => {
          const isActive = activeDoc === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectDoc(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-[var(--accent-lime)] border-[var(--accent-lime)] text-[#000000]"
                  : "bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card
        padding="lg"
        className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed"
      >
        {activeDoc === "terms" && (
          <>
            <h2 className="font-serif text-2xl text-[var(--text-primary)]">
              Terms of Service
            </h2>
            <p>
              Outflow is provided free of charge under the MIT License as a client-side data formatting and outreach management utility.
            </p>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Acceptable Use
              </h3>
              <p>
                You are solely responsible for ensuring that any business contact lists you import, organize, or export comply with applicable local privacy, anti-spam, and telemarketing regulations in your jurisdiction.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                No Warranty
              </h3>
              <p>
                The software is provided on an "as is" basis without warranties of any kind. Always export regular CSV or PDF backups of important outreach lists.
              </p>
            </div>
          </>
        )}

        {activeDoc === "privacy" && (
          <>
            <h2 className="font-serif text-2xl text-[var(--text-primary)]">
              Privacy Policy
            </h2>
            <p>
              Outflow processes 100% of pasted scraper rows, uploaded CSV/JSON files, and CRM updates strictly inside your web browser.
            </p>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Zero Server Collection
              </h3>
              <p>
                Outflow does not transmit, log, sell, or store your imported business leads on any remote server. Clearing your browser site data permanently removes your local workspace lists.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                External Links
              </h3>
              <p>
                Optional outbound links to GitHub or developer support pages are governed by the respective privacy policies of those third-party services.
              </p>
            </div>
          </>
        )}

        {activeDoc === "cookies" && (
          <>
            <h2 className="font-serif text-2xl text-[var(--text-primary)]">
              Cookie & Browser Storage Policy
            </h2>
            <p>
              Outflow does not use advertising cookies, analytics trackers, or cross-site tracking pixels.
            </p>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Local Storage Usage
              </h3>
              <p>
                Your workspace tabs, parsed business leads, outreach statuses, and follow-up dates are saved in browser localStorage under the key "business-tabs" solely so your lists remain intact when you refresh the page.
              </p>
            </div>
          </>
        )}
      </Card>
    </main>
  );
}
