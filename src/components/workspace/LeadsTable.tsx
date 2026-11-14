import React, { useState } from "react";
import {
  Building03Icon,
  Copy01Icon,
  Tick02Icon,
  Link01Icon,
  Mail01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { LEAD_STATUSES, type Business } from "../../types/outflow";
import { isGoogleOrMapsUrl } from "../../utils/parser";
import { Card } from "../ui/Card";
import { Dropdown } from "../ui/Dropdown";
import { CalendarPicker } from "../ui/CalendarPicker";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Message } from "../ui/Message";

interface LeadsTableProps {
  totalInTab: number;
  businesses: Business[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onUpdateLead: (id: string, patch: Partial<Business>) => void;
  onRemoveLead: (id: string) => void;
  onOpenManualAdd: () => void;
}

function getStatusTone(
  status: string
): "neutral" | "lime" | "warning" | "error" {
  switch (status) {
    case "Interested":
      return "lime";
    case "Follow Up":
      return "warning";
    case "Not Interested":
      return "error";
    default:
      return "neutral";
  }
}

export function LeadsTable({
  totalInTab,
  businesses,
  hasActiveFilters,
  onResetFilters,
  onUpdateLead,
  onRemoveLead,
  onOpenManualAdd,
}: LeadsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Business>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setCopyFeedback(`Copied ${text}`);
      setTimeout(() => {
        setCopiedId(null);
        setCopyFeedback(null);
      }, 2000);
    } catch {
      setCopyFeedback("Clipboard permission blocked.");
    }
  };

  const startEdit = (b: Business) => {
    setEditingId(b.id);
    setEditForm({ ...b });
  };

  const saveEdit = () => {
    if (!editingId) return;
    if (!editForm.name?.trim()) return;
    onUpdateLead(editingId, {
      name: editForm.name.trim(),
      status: editForm.status || "New",
      number: (editForm.number || "").trim(),
      website: (editForm.website || "").trim(),
      email: (editForm.email || "").trim(),
      followUpDate: editForm.followUpDate || "",
    });
    setEditingId(null);
    setEditForm({});
  };

  const isEmpty = totalInTab === 0;
  const isFilteredEmpty = totalInTab > 0 && businesses.length === 0;

  return (
    <Card
      state={isEmpty ? "empty" : "default"}
      padding="none"
      className="overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--text-secondary)] tabular-nums">
          Showing{" "}
          <span className="text-[var(--text-primary)] font-semibold">
            {businesses.length}
          </span>{" "}
          of{" "}
          <span className="text-[var(--text-primary)] font-semibold">
            {totalInTab}
          </span>{" "}
          Leads
        </span>

        {copyFeedback && <Message tone="success" text={copyFeedback} />}
      </div>

      {isEmpty ? (
        <div className="py-16 px-6 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex items-center justify-center text-[var(--text-faint)]">
            <Icon icon={Building03Icon} size={22} />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            No leads in this list yet
          </h3>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Button variant="primary" size="md" onClick={onOpenManualAdd}>
              Add First Lead
            </Button>
          </div>
        </div>
      ) : isFilteredEmpty ? (
        <div className="py-14 px-6 text-center flex flex-col items-center gap-4">
          <h3 className="text-base font-medium text-[var(--text-primary)]">
            No leads match active filters
          </h3>
          {hasActiveFilters && (
            <Button variant="secondary" size="sm" onClick={onResetFilters}>
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-[var(--bg-surface-alt)] border-b border-[var(--border-hairline)] text-xs font-medium text-[var(--text-muted)]">
                <th className="px-5 py-3 w-[23%]">Business Name</th>
                <th className="px-4 py-3 w-[15%]">Status</th>
                <th className="px-4 py-3 w-[17%]">Mobile Number</th>
                <th className="px-4 py-3 w-[16%]">Source Link</th>
                <th className="px-4 py-3 w-[13%]">Email</th>
                <th className="px-4 py-3 w-[10%]">Follow Up</th>
                <th className="px-4 py-3 w-[6%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {businesses.map((b) => {
                const isEditing = editingId === b.id;

                if (isEditing) {
                  return (
                    <tr key={b.id} className="bg-[var(--bg-surface-alt)]">
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editForm.name ?? ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--accent-ink)] text-sm text-[var(--text-primary)] outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Dropdown
                          ariaLabel="Edit status"
                          value={editForm.status || "New"}
                          onChange={(val) =>
                            setEditForm({ ...editForm, status: val })
                          }
                          options={LEAD_STATUSES.map((s) => ({
                            value: s,
                            label: s,
                          }))}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editForm.number ?? ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, number: e.target.value })
                          }
                          placeholder="Mobile number"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] focus:border-[var(--accent-ink)] text-sm font-mono text-[var(--text-primary)] outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editForm.website ?? ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, website: e.target.value })
                          }
                          placeholder="Website"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] focus:border-[var(--accent-ink)] text-sm text-[var(--text-primary)] outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="email"
                          value={editForm.email ?? ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                          placeholder="Email"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-hairline)] focus:border-[var(--accent-ink)] text-sm text-[var(--text-primary)] outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CalendarPicker
                          value={editForm.followUpDate || ""}
                          onChange={(date) =>
                            setEditForm({ ...editForm, followUpDate: date })
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={saveEdit}
                            aria-label="Save lead"
                            className="p-1.5 rounded-lg bg-[var(--accent-lime)] text-[#000000] hover:bg-[var(--accent-lime-hover)] transition-colors cursor-pointer"
                          >
                            <Icon icon={Tick02Icon} size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            aria-label="Cancel edit"
                            className="p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                          >
                            <Icon icon={Cancel01Icon} size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const cleanWebsite =
                  b.website && !isGoogleOrMapsUrl(b.website) ? b.website : "";

                return (
                  <tr
                    key={b.id}
                    className="hover:bg-[var(--bg-surface-hover)] transition-colors duration-100 group"
                  >
                    <td className="px-5 py-3 text-sm font-medium text-[var(--text-primary)]">
                      {b.name}
                    </td>

                    <td className="px-4 py-3">
                      <Dropdown
                        ariaLabel={`Status for ${b.name}`}
                        value={b.status || "New"}
                        tone={getStatusTone(b.status || "New")}
                        onChange={(val) => onUpdateLead(b.id, { status: val })}
                        options={LEAD_STATUSES.map((s) => ({
                          value: s,
                          label: s,
                        }))}
                      />
                    </td>

                    <td className="px-4 py-3 text-sm tabular-nums font-mono">
                      {b.number ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-primary)]">
                            {b.number}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(b.number, b.id)}
                            aria-label={`Copy ${b.number}`}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-ink)] transition-colors cursor-pointer"
                          >
                            <Icon
                              icon={
                                copiedId === b.id ? Tick02Icon : Copy01Icon
                              }
                              size={14}
                            />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[var(--text-faint)]">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {cleanWebsite ? (
                        <a
                          href={
                            cleanWebsite.startsWith("http")
                              ? cleanWebsite
                              : `https://${cleanWebsite}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-ink)] transition-colors max-w-[180px] truncate"
                        >
                          <Icon icon={Link01Icon} size={13} />
                          <span className="truncate">
                            {cleanWebsite.replace(/^https?:\/\/(www\.)?/, "")}
                          </span>
                        </a>
                      ) : (
                        <span className="text-[var(--text-faint)]">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {b.email ? (
                        <a
                          href={`mailto:${b.email}`}
                          className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-ink)] transition-colors max-w-[160px] truncate"
                        >
                          <Icon icon={Mail01Icon} size={13} />
                          <span className="truncate">{b.email}</span>
                        </a>
                      ) : (
                        <span className="text-[var(--text-faint)]">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <CalendarPicker
                        value={b.followUpDate || ""}
                        onChange={(date) =>
                          onUpdateLead(b.id, { followUpDate: date })
                        }
                      />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(b)}
                          aria-label={`Edit ${b.name}`}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)] transition-colors cursor-pointer"
                        >
                          <Icon icon={PencilEdit01Icon} size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveLead(b.id)}
                          aria-label={`Delete ${b.name}`}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--status-error)] hover:bg-[var(--bg-surface-alt)] transition-colors cursor-pointer"
                        >
                          <Icon icon={Delete02Icon} size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
