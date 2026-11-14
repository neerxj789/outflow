import React, { useState } from "react";
import {
  Cancel01Icon,
  Download01Icon,
  Copy01Icon,
  Tick02Icon,
  Globe02Icon,
} from "@hugeicons/core-free-icons";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { Icon } from "../ui/Icon";

interface GetExtensionModalProps {
  open: boolean;
  onClose: () => void;
}

export function GetExtensionModal({ open, onClose }: GetExtensionModalProps) {
  const [downloadStatus, setDownloadStatus] = useState<
    "idle" | "working" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!open) return null;

  const appOrigin =
    typeof window !== "undefined" ? window.location.origin : "";

  const handleDownload = async () => {
    setErrorMsg(null);
    setDownloadStatus("working");
    try {
      const response = await fetch("/api/extension.zip");
      if (!response.ok) {
        throw new Error("Could not download the extension archive.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "outflow-extension.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadStatus("idle");
    } catch (err) {
      setDownloadStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to download extension."
      );
    }
  };

  const handleCopyOrigin = async () => {
    try {
      await navigator.clipboard.writeText(appOrigin);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Ignore clipboard restrictions
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="extension-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        padding="lg"
        className="w-full max-w-xl space-y-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
          <div className="flex items-center gap-2.5">
            <Icon
              icon={Globe02Icon}
              size={20}
              className="text-[var(--accent-ink)]"
            />
            <h2
              id="extension-modal-title"
              className="font-serif text-2xl text-[var(--text-primary)]"
            >
              Outflow Chrome Extension
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
          >
            <Icon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Extract Name, Mobile Number, Email, and Source Link from any open webpage or search results list—automatically scrolling through pages up to 200 leads and sending them straight into Outflow.
        </p>

        <div className="space-y-3">
          <div className="text-xs font-semibold text-[var(--text-primary)]">
            Install in Chrome (Developer Mode)
          </div>
          <ol className="space-y-2 text-sm text-[var(--text-secondary)] list-decimal list-inside">
            <li>Download and unzip the extension archive below.</li>
            <li>Open <span className="font-mono text-xs text-[var(--text-primary)]">chrome://extensions</span> in Chrome.</li>
            <li>Enable Developer mode in the top-right corner.</li>
            <li>Click Load unpacked and select the extracted folder.</li>
          </ol>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-[var(--text-secondary)]">
            Your Outflow App URL (paste into extension settings)
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={appOrigin}
              className="flex-1 min-h-[38px] px-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] text-xs font-mono text-[var(--text-primary)] outline-none"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={copiedUrl ? Tick02Icon : Copy01Icon}
              onClick={handleCopyOrigin}
            >
              {copiedUrl ? "Copied" : "Copy URL"}
            </Button>
          </div>
        </div>

        {errorMsg && (
          <Alert
            variant="error"
            message={errorMsg}
            onDismiss={() => {
              setErrorMsg(null);
              setDownloadStatus("idle");
            }}
          />
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-hairline)]">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            status={downloadStatus}
            icon={Download01Icon}
            onClick={handleDownload}
          >
            Download Extension (.zip)
          </Button>
        </div>
      </Card>
    </div>
  );
}
