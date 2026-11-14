import React, { useState } from "react";
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import type { TabData } from "../../types/outflow";
import { Icon } from "../ui/Icon";

interface TabBarProps {
  tabs: TabData[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onAddTab: () => void;
  onRenameTab: (id: string, name: string) => void;
  onDeleteTab: (id: string) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onRenameTab,
  onDeleteTab,
}: TabBarProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const commitRename = (id: string) => {
    if (editingName.trim()) {
      onRenameTab(id, editingName.trim());
    }
    setEditingTabId(null);
  };

  return (
    <div
      role="tablist"
      aria-label="Lead lists"
      className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--border-hairline)]"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isEditing = editingTabId === tab.id;

        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectTab(tab.id)}
            className={`group flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer ${
              isActive
                ? "bg-[var(--bg-surface)] border-[var(--accent-ink)] text-[var(--text-primary)]"
                : "bg-transparent border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
            }`}
          >
            {isEditing ? (
              <input
                autoFocus
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => commitRename(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(tab.id);
                  if (e.key === "Escape") setEditingTabId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--accent-ink)] rounded px-2 py-0.5 text-xs w-28 outline-none"
              />
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingTabId(tab.id);
                  setEditingName(tab.name);
                }}
                title="Double-click to rename"
                className="select-none"
              >
                {tab.name}{" "}
                <span className="text-xs text-[var(--text-muted)] tabular-nums ml-1">
                  ({tab.businesses.length})
                </span>
              </span>
            )}

            {tabs.length > 1 && (
              <button
                type="button"
                aria-label={`Delete ${tab.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTab(tab.id);
                }}
                className={`p-1 rounded text-[var(--text-faint)] hover:text-[var(--status-error)] transition-opacity cursor-pointer ${
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <Icon icon={Delete02Icon} size={13} />
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddTab}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent-ink)] hover:bg-[var(--bg-surface)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Icon icon={Add01Icon} size={14} />
        <span>New List</span>
      </button>
    </div>
  );
}
