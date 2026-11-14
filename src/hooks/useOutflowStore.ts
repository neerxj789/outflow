import { useState, useEffect, useMemo, useCallback } from "react";
import {
  LEAD_STATUSES,
  type Business,
  type ContactFilter,
  type DerivedAnalytics,
  type LeadStatus,
  type TabData,
} from "../types/outflow";
import { extractBusinesses, isGoogleOrMapsUrl } from "../utils/parser";

const STORAGE_KEY = "business-tabs";

export interface IncomingExtensionLead {
  name?: string;
  number?: string;
  email?: string;
  sourceLink?: string;
  website?: string;
}

function loadInitialTabs(): TabData[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: TabData[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((tab) => ({
          ...tab,
          businesses: (tab.businesses || []).map((b) => ({
            ...b,
            website: isGoogleOrMapsUrl(b.website) ? "" : b.website,
          })),
        }));
      }
    }
  } catch (err) {
    console.error("Failed to read stored tabs", err);
  }
  return [{ id: crypto.randomUUID(), name: "General", businesses: [] }];
}

export function useOutflowStore() {
  const [tabs, setTabs] = useState<TabData[]>(loadInitialTabs);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id || "");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "All">("All");
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all");
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);

  const [storageError, setStorageError] = useState<string | null>(null);
  const [extensionNotice, setExtensionNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
      setStorageError(null);
    } catch {
      setStorageError(
        "Browser storage limit reached. Export your list to keep a backup."
      );
    }
  }, [tabs]);

  useEffect(() => {
    if (!tabs.find((t) => t.id === activeTabId) && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  const analytics: DerivedAnalytics = useMemo(() => {
    const list = activeTab?.businesses || [];
    const total = list.length;
    const withPhone = list.filter((b) => b.number && b.number.trim() !== "").length;
    const withWebsite = list.filter(
      (b) =>
        b.website && b.website.trim() !== "" && !isGoogleOrMapsUrl(b.website)
    ).length;
    const withEmail = list.filter((b) => b.email && b.email.trim() !== "").length;
    const activePipeline = list.filter(
      (b) =>
        b.status === "Contacted" ||
        b.status === "Follow Up" ||
        b.status === "Interested"
    ).length;

    const stages = LEAD_STATUSES.map((status) => {
      const count = list.filter((b) => (b.status || "New") === status).length;
      return {
        status,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    });

    return {
      total,
      withPhone,
      phoneRate: total > 0 ? Math.round((withPhone / total) * 100) : 0,
      withWebsite,
      websiteRate: total > 0 ? Math.round((withWebsite / total) * 100) : 0,
      withEmail,
      activePipeline,
      stages,
    };
  }, [activeTab]);

  const filteredBusinesses = useMemo(() => {
    const list = activeTab?.businesses || [];
    return list.filter((b) => {
      if (statusFilter !== "All" && (b.status || "New") !== statusFilter) {
        return false;
      }

      if (onlyWithPhone && (!b.number || b.number.trim() === "")) {
        return false;
      }

      if (contactFilter === "phone" && (!b.number || b.number.trim() === "")) {
        return false;
      }
      if (
        contactFilter === "website" &&
        (!b.website || b.website.trim() === "" || isGoogleOrMapsUrl(b.website))
      ) {
        return false;
      }
      if (contactFilter === "email" && (!b.email || b.email.trim() === "")) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          b.name.toLowerCase().includes(q) ||
          b.number.toLowerCase().includes(q) ||
          b.website.toLowerCase().includes(q) ||
          b.email.toLowerCase().includes(q) ||
          (b.status || "New").toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [activeTab, statusFilter, contactFilter, onlyWithPhone, searchQuery]);

  const parseAndAdd = useCallback(
    (rawText: string): { added: number; skippedDuplicates: number } => {
      const parsed = extractBusinesses(rawText);
      let addedCount = 0;
      let skippedCount = 0;

      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== activeTabId) return tab;
          const existingKeys = new Set(
            tab.businesses.map(
              (b) => `${b.name.toLowerCase()}-${b.number}-${b.website}`
            )
          );
          const newUnique = parsed.filter((b) => {
            const key = `${b.name.toLowerCase()}-${b.number}-${b.website}`;
            if (existingKeys.has(key)) {
              skippedCount += 1;
              return false;
            }
            existingKeys.add(key);
            return true;
          });
          addedCount = newUnique.length;
          return { ...tab, businesses: [...newUnique, ...tab.businesses] };
        })
      );

      return { added: addedCount, skippedDuplicates: skippedCount };
    },
    [activeTabId]
  );

  const importStructuredLeads = useCallback(
    (incoming: IncomingExtensionLead[]) => {
      if (!Array.isArray(incoming) || incoming.length === 0) return;

      let addedCount = 0;
      let skippedCount = 0;

      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== activeTabId) return tab;

          const existingKeys = new Set(
            tab.businesses.map(
              (b) =>
                `${b.name.toLowerCase()}-${b.number}-${b.email}-${b.website}`
            )
          );

          const mapped: Business[] = [];
          for (const item of incoming) {
            const name = (item.name || "").trim();
            const rawUrl = (item.sourceLink || item.website || "").trim();
            const website = isGoogleOrMapsUrl(rawUrl) ? "" : rawUrl;
            const number = (item.number || "").trim();
            const email = (item.email || "").trim();

            if (!name && !number && !email && !website) continue;

            const finalName = name || website || email || number;
            const key = `${finalName.toLowerCase()}-${number}-${email}-${website}`;
            if (existingKeys.has(key)) {
              skippedCount += 1;
              continue;
            }
            existingKeys.add(key);
            addedCount += 1;
            mapped.push({
              id: crypto.randomUUID(),
              name: finalName,
              status: "New",
              number,
              website,
              email,
            });
          }

          return { ...tab, businesses: [...mapped, ...tab.businesses] };
        })
      );

      if (addedCount > 0) {
        setExtensionNotice(
          skippedCount > 0
            ? `Imported ${addedCount} leads from Outflow Extension (${skippedCount} duplicates skipped).`
            : `Imported ${addedCount} leads from Outflow Extension.`
        );
      } else if (skippedCount > 0) {
        setExtensionNotice(
          `Skipped ${skippedCount} duplicate leads already in this list.`
        );
      }
    },
    [activeTabId]
  );

  const addManualLead = useCallback(
    (leadInput: Omit<Business, "id">) => {
      const cleanWebsite =
        leadInput.website && !isGoogleOrMapsUrl(leadInput.website)
          ? leadInput.website.trim()
          : "";
      const lead: Business = {
        id: crypto.randomUUID(),
        name: leadInput.name.trim(),
        number: leadInput.number.trim(),
        website: cleanWebsite,
        email: leadInput.email.trim(),
        status: leadInput.status || "New",
        followUpDate: leadInput.followUpDate || "",
      };

      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? { ...tab, businesses: [lead, ...tab.businesses] }
            : tab
        )
      );
    },
    [activeTabId]
  );

  const updateLead = useCallback(
    (businessId: string, patch: Partial<Business>) => {
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== activeTabId) return tab;
          return {
            ...tab,
            businesses: tab.businesses.map((b) =>
              b.id === businessId ? { ...b, ...patch } : b
            ),
          };
        })
      );
    },
    [activeTabId]
  );

  const removeLead = useCallback(
    (businessId: string) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? {
                ...tab,
                businesses: tab.businesses.filter((b) => b.id !== businessId),
              }
            : tab
        )
      );
    },
    [activeTabId]
  );

  const addTab = useCallback(() => {
    const newTab: TabData = {
      id: crypto.randomUUID(),
      name: `List ${tabs.length + 1}`,
      businesses: [],
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setStatusFilter("All");
    setContactFilter("all");
    setSearchQuery("");
  }, [tabs.length]);

  const renameTab = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: trimmed } : t))
    );
  }, []);

  const deleteTab = useCallback(
    (id: string) => {
      if (tabs.length <= 1) return;
      const remaining = tabs.filter((t) => t.id !== id);
      setTabs(remaining);
      if (activeTabId === id) {
        setActiveTabId(remaining[0].id);
      }
    },
    [tabs, activeTabId]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("All");
    setContactFilter("all");
    setOnlyWithPhone(false);
  }, []);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "All" ||
    contactFilter !== "all" ||
    onlyWithPhone;

  return {
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
    importStructuredLeads,
    addManualLead,
    updateLead,
    removeLead,
    addTab,
    renameTab,
    deleteTab,
  };
}
