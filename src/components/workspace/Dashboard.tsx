import React, { useState } from "react";
import {
  Add01Icon,
  Download01Icon,
  File01Icon,
  Globe02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import type { useOutflowStore } from "../../hooks/useOutflowStore";
import {
  exportBusinessesToCSV,
  exportBusinessesToPDF,
} from "../../utils/parser";
import { TabBar } from "./TabBar";
import { KpiBar } from "../analytics/KpiBar";
import { PipelineChart } from "../analytics/PipelineChart";
import { ImporterPanel } from "./ImporterPanel";
import { ManualLeadPanel } from "./ManualLeadPanel";
import { LeadsTable } from "./LeadsTable";
import { Input } from "../ui/Input";
import { Toggle } from "../ui/Toggle";
import { Button } from "../ui/Button";
import { Warning } from "../ui/Warning";
import { Alert } from "../ui/Alert";

interface DashboardProps {
  store: ReturnType<typeof useOutflowStore>;
  onOpenExtension: () => void;
}

export function Dashboard({ store, onOpenExtension }: DashboardProps) {
  const {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    analytics,
    filteredBusinesses,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    contactFilter,
    setContactFilter,
    onlyWithPhone,
    setOnlyWithPhone,
    hasActiveFilters,
    clearFilters,
    storageError,
    extensionNotice,
    setExtensionNotice,
    parseAndAdd,
    addManualLead,
    updateLead,
    removeLead,
    addTab,
    renameTab,
    deleteTab,
  } = store;

  const [isAddingLead, setIsAddingLead] = useState(false);

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-serif text-3xl md:text-4xl text-[var(--text-primary)] tracking-tight">
          Lead Workspace
        </h1>
        <div className="flex items-center gap-2.5 flex-wrap">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All Filters
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={Globe02Icon}
            onClick={onOpenExtension}
          >
            Get Extension
          </Button>
        </div>
      </div>

      {extensionNotice && (
        <Alert
          variant="success"
          message={extensionNotice}
          onDismiss={() => setExtensionNotice(null)}
        />
      )}

      {storageError && (
        <Warning
          message={storageError}
          actionLabel="Export CSV"
          onAction={() =>
            activeTab && exportBusinessesToCSV(activeTab, activeTab.businesses)
          }
        />
      )}

      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onAddTab={addTab}
        onRenameTab={renameTab}
        onDeleteTab={deleteTab}
      />

      <KpiBar
        analytics={analytics}
        contactFilter={contactFilter}
        statusFilter={statusFilter}
        onSelectContactFilter={setContactFilter}
        onSelectActivePipeline={() =>
          setStatusFilter(statusFilter === "Interested" ? "All" : "Interested")
        }
        onResetFilters={clearFilters}
      />

      <PipelineChart
        analytics={analytics}
        statusFilter={statusFilter}
        onSelectStatus={setStatusFilter}
      />

      <ImporterPanel onParseData={parseAndAdd} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <Input
            leadingIcon={Search01Icon}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
            placeholder="Search name, phone, source link, email..."
            className="w-full sm:max-w-sm"
          />
          <Toggle
            label="Phone numbers only"
            checked={onlyWithPhone}
            onChange={setOnlyWithPhone}
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="secondary"
            size="md"
            icon={Add01Icon}
            onClick={() => setIsAddingLead((prev) => !prev)}
          >
            Add Lead
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={File01Icon}
            disabled={!activeTab || filteredBusinesses.length === 0}
            onClick={() =>
              activeTab && exportBusinessesToPDF(activeTab, filteredBusinesses)
            }
          >
            Export PDF
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={Download01Icon}
            disabled={!activeTab || filteredBusinesses.length === 0}
            onClick={() =>
              activeTab && exportBusinessesToCSV(activeTab, filteredBusinesses)
            }
          >
            Export CSV
          </Button>
        </div>
      </div>

      {isAddingLead && (
        <ManualLeadPanel
          onAddLead={addManualLead}
          onClose={() => setIsAddingLead(false)}
        />
      )}

      <LeadsTable
        totalInTab={activeTab?.businesses.length || 0}
        businesses={filteredBusinesses}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={clearFilters}
        onUpdateLead={updateLead}
        onRemoveLead={removeLead}
        onOpenManualAdd={() => setIsAddingLead(true)}
      />
    </main>
  );
}
