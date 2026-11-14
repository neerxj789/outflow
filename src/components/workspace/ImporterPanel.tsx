import React, { useState, useRef } from "react";
import { Upload01Icon, File01Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { Icon } from "../ui/Icon";

interface SeedButtonProps {
  onSeed: (rawScraperText: string) => void;
}

const devSeedModules = import.meta.glob<{
  default?: React.ComponentType<SeedButtonProps>;
}>("../../dev/SeedDataButton.tsx", { eager: true });

const DevSeedButton = Object.values(devSeedModules)[0]?.default;

interface ImporterPanelProps {
  onParseData: (rawText: string) => { added: number; skippedDuplicates: number };
}

export function ImporterPanel({ onParseData }: ImporterPanelProps) {
  const [rawInput, setRawInput] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runParse = (content: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setStatus("working");

    try {
      const { added, skippedDuplicates } = onParseData(content);
      setStatus("idle");
      setRawInput("");

      if (added === 0 && skippedDuplicates > 0) {
        setSuccessMessage(
          `Skipped ${skippedDuplicates} duplicate rows already in this list.`
        );
      } else if (skippedDuplicates > 0) {
        setSuccessMessage(
          `Imported ${added} leads (${skippedDuplicates} duplicates skipped).`
        );
      } else {
        setSuccessMessage(`Imported ${added} clean leads.`);
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to parse pasted data."
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawInput(content);
        runParse(content);
      }
    };
    reader.onerror = () => {
      setStatus("error");
      setErrorMessage("Could not read the selected file.");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const cardState =
    status === "error"
      ? "error"
      : rawInput.trim().length > 0
      ? "active"
      : "default";

  return (
    <Card state={cardState} padding="lg" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon icon={File01Icon} size={18} className="text-[var(--accent-ink)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Import Raw Scraper Data
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {DevSeedButton && (
            <DevSeedButton
              onSeed={(sample) => {
                runParse(sample);
              }}
            />
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.tsv,.txt,.json"
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={Upload01Icon}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload File
          </Button>
        </div>
      </div>

      <textarea
        value={rawInput}
        onChange={(e) => {
          setRawInput(e.target.value);
          if (status === "error") {
            setStatus("idle");
            setErrorMessage(null);
          }
        }}
        placeholder="Paste raw rows from Instant Data Scraper, TSV, CSV, or JSON..."
        aria-label="Raw scraper data input"
        className={`w-full h-28 p-4 rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] font-mono text-xs outline-none resize-none transition-colors border ${
          status === "error"
            ? "border-[var(--status-error)]"
            : "border-[var(--border-hairline)] focus:border-[var(--accent-ink)]"
        }`}
      />

      {errorMessage && (
        <Alert
          variant="error"
          message={errorMessage}
          onDismiss={() => {
            setErrorMessage(null);
            setStatus("idle");
          }}
        />
      )}

      {successMessage && (
        <Alert
          variant="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="primary"
          size="md"
          status={status}
          icon={SparklesIcon}
          disabled={!rawInput.trim()}
          onClick={() => runParse(rawInput)}
        >
          Parse Leads
        </Button>
      </div>
    </Card>
  );
}
