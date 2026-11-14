import React, { useState, useEffect } from "react";
import type { AppView, LegalDocType } from "./types/outflow";
import {
  useOutflowStore,
  type IncomingExtensionLead,
} from "./hooks/useOutflowStore";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { LandingPage } from "./components/landing/LandingPage";
import { Dashboard } from "./components/workspace/Dashboard";
import { LegalPage } from "./components/legal/LegalPage";
import { GetExtensionModal } from "./components/extension/GetExtensionModal";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "outflow-theme";

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return "dark";
}

export default function App() {
  const [view, setView] = useState<AppView>("landing");
  const [legalDoc, setLegalDoc] = useState<LegalDocType>("terms");
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);

  const store = useOutflowStore();
  const { importStructuredLeads } = store;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  // Listen for leads pushed from the Outflow Chrome Extension
  useEffect(() => {
    const handleImport = (leads: IncomingExtensionLead[]) => {
      if (!Array.isArray(leads) || leads.length === 0) return;
      importStructuredLeads(leads);
      setView("workspace");
    };

    const onWindowMessage = (event: MessageEvent) => {
      if (
        event.data &&
        event.data.type === "OUTFLOW_EXTENSION_IMPORT" &&
        Array.isArray(event.data.leads)
      ) {
        handleImport(event.data.leads);
      }
    };

    const onCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ leads?: IncomingExtensionLead[] }>)
        .detail;
      if (detail && Array.isArray(detail.leads)) {
        handleImport(detail.leads);
      }
    };

    window.addEventListener("message", onWindowMessage);
    window.addEventListener("outflow:extension-leads", onCustomEvent);

    return () => {
      window.removeEventListener("message", onWindowMessage);
      window.removeEventListener("outflow:extension-leads", onCustomEvent);
    };
  }, [importStructuredLeads]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleNavigate = (nextView: AppView, anchor?: string) => {
    setView(nextView);
    if (anchor) {
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleOpenLegal = (doc: LegalDocType) => {
    setLegalDoc(doc);
    setView("legal");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors duration-150">
      <Navbar
        currentView={view}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={handleNavigate}
        onOpenExtension={() => setIsExtensionModalOpen(true)}
      />

      <div className="flex-1">
        {view === "landing" && (
          <LandingPage
            onOpenWorkspace={() => handleNavigate("workspace")}
            onOpenExtension={() => setIsExtensionModalOpen(true)}
          />
        )}
        {view === "workspace" && (
          <Dashboard
            store={store}
            onOpenExtension={() => setIsExtensionModalOpen(true)}
          />
        )}
        {view === "legal" && (
          <LegalPage
            activeDoc={legalDoc}
            onSelectDoc={setLegalDoc}
            onBack={() => handleNavigate("landing")}
          />
        )}
      </div>

      <Footer onOpenLegal={handleOpenLegal} />

      <GetExtensionModal
        open={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
      />
    </div>
  );
}
