/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Download, Plus, Trash2, FileJson, Building2, AlertCircle, Users, PhoneCall, Clock, CheckCircle, XCircle, ArrowRight, Zap, Target, ChevronRight, Check, MapPin, Database } from "lucide-react";
import { motion } from "motion/react";

interface Business {
  id: string;
  name: string;
  status: string;
  number: string;
  website: string;
  email: string;
}

interface TabData {
  id: string;
  name: string;
  businesses: Business[];
}

function extractBusinesses(input: string): Business[] {
  let results: Business[] = [];
  
  // Try parsing as JSON first
  try {
    const data = JSON.parse(input);
    const findValue = (obj: any, keywords: string[]): string => {
      for (const key of Object.keys(obj)) {
        const lowerKey = key.toLowerCase();
        if (keywords.some(k => lowerKey.includes(k))) {
          if (typeof obj[key] === 'string' || typeof obj[key] === 'number') {
            return String(obj[key]).trim();
          }
        }
      }
      return "";
    };

    const traverse = (obj: any) => {
      if (Array.isArray(obj)) {
        obj.forEach(traverse);
      } else if (obj !== null && typeof obj === 'object') {
        const name = findValue(obj, ['name', 'title', 'company', 'business', 'organization']);
        const email = findValue(obj, ['email', 'mail']);
        const website = findValue(obj, ['website', 'url', 'site', 'domain']);
        const number = findValue(obj, ['phone', 'number', 'tel', 'mobile']);
        
        if (name && (email || website || number)) {
          results.push({ id: crypto.randomUUID(), name, status: 'New', email, website, number });
        }
        Object.values(obj).forEach(traverse);
      }
    };
    traverse(data);
  } catch (e) {
    // If JSON parsing fails, assume it's raw text (TSV, CSV, etc.)
    const lines = input.split('\n');
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/;

    for (let line of lines) {
      if (!line.trim()) continue;
      
      const separator = line.includes('\t') ? '\t' : (line.includes(',') ? ',' : '  ');
      const cells = line.split(separator).map(c => c.trim()).filter(c => c);
      
      let name = '';
      let email = '';
      let website = '';
      let phone = '';

      for (const cell of cells) {
        // Find Email
        if (!email && emailRegex.test(cell)) {
          email = cell.match(emailRegex)![0];
          continue;
        }
        
        // Find Website (ignore google maps & gstatic links typically found in scrapers)
        if (urlRegex.test(cell)) {
          const url = cell.match(urlRegex)![0];
          if (url.includes('google.com/maps') || url.includes('gstatic.com') || url.includes('googleusercontent.com')) {
             continue; 
          }
          if (!website) {
            website = url;
            continue;
          }
        }
        
        // Find Phone Number
        const digitCount = (cell.match(/\d/g) || []).length;
        if (!phone && digitCount >= 8 && digitCount <= 15 && !/[a-zA-Z]{4,}/.test(cell) && !cell.includes('http')) {
           phone = cell;
           continue;
        }
        
        // Find Name (first string that looks like a name)
        if (!name && cell.length > 2 && cell.length < 100 && /[a-zA-Z]/.test(cell) && !cell.includes('http') && digitCount < 5) {
           name = cell;
        }
      }
      
      if (name && (email || website || phone)) {
        results.push({
          id: crypto.randomUUID(),
          name,
          status: 'New',
          email,
          website,
          number: phone
        });
      }
    }
  }
  
  if (results.length === 0) {
    throw new Error("No valid business data with contact info found in the text.");
  }
  
  // Deduplicate
  const unique = new Map<string, Business>();
  results.forEach(b => {
    const key = `${b.name.toLowerCase()}-${b.email}-${b.number}-${b.website}`;
    if (!unique.has(key)) {
      unique.set(key, b);
    }
  });
  
  return Array.from(unique.values());
}

function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-100 font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 opacity-50 blur-[120px] rounded-full"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-50 border-b border-white/5 bg-[#0A0A0A]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-xl tracking-tight text-white">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            Outflow
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <a href="#how-it-works" className="hidden sm:block text-sm font-medium text-gray-300 hover:text-white transition-colors">How it works</a>
            <a href="https://rzp.io/rzp/spill-the-chai" target="_blank" rel="noopener noreferrer" className="hidden sm:flex text-sm font-medium text-gray-300 hover:text-white transition-colors items-center gap-1">Buy me a Chai ☕</a>
            <button 
              onClick={onGetStarted}
              className="px-5 py-2.5 bg-white text-black hover:bg-gray-100 rounded-lg font-medium transition-colors text-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-32">
        {/* Hero Section */}
        <section className="text-center max-w-6xl mx-auto space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4"
          >
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            Stop wasting hours on manual scraping.
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-white leading-[1.1] text-balance"
          >
            Transform Messy Map Data Into 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Actionable Outreach Lists.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 font-medium leading-relaxed max-w-2xl mx-auto"
          >
            Paste raw exports from your scraper. We instantly extract the data and organize it into a built-in CRM so you can start reaching out in seconds.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={onGetStarted}
              className="px-8 py-4 bg-white text-black hover:bg-gray-100 rounded-xl font-semibold transition-all flex items-center gap-2 text-lg group"
            >
              Start Scraping Now 
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="text-gray-500 font-medium text-sm flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> No credit card required.
            </div>
          </motion.div>
        </section>

        {/* Visual Mockup */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-24 mb-32 relative mx-auto max-w-5xl"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-[2rem] blur opacity-20"></div>
          <div className="relative bg-[#0F0F11] border border-white/10 rounded-[2rem] p-4 md:p-8 shadow-2xl flex flex-col md:flex-row gap-6 items-center">
            
            {/* Messy Data Box */}
            <div className="flex-1 w-full bg-[#1A1A1D] rounded-xl border border-white/5 p-6 font-mono text-xs md:text-sm text-gray-500 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-3 flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
              </div>
              <p className="text-gray-400 mb-2">raw_export.csv</p>
              <div className="opacity-50 space-y-2 select-none">
                <p>Dental Hospital,https://maps.google.com...,+91 9876543210,contact@dental.com</p>
                <p>City Clinic,https://gstatic.com...,missing,info@clinic.com</p>
                <p>Smile Care,https://smilecare.com,+91 1234567890,missing</p>
                <p>Tooth Fixers,missing,+91 9998887776,hello@tooth.in</p>
                <p>...",...",...",..."</p>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-center bg-[#1A1A1D] rounded-full p-4 border border-white/5 z-10 -my-6 md:my-0 md:-mx-6 shadow-xl">
              <ArrowRight className="w-6 h-6 text-blue-400 rotate-90 md:rotate-0" />
            </div>

            {/* Clean CRM Box */}
            <div className="flex-1 w-full bg-[#1A1A1D] rounded-xl border border-white/5 p-6 space-y-4 relative">
               <div className="absolute top-0 right-0 p-3 flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
              </div>
              <p className="text-white font-medium mb-4 flex items-center gap-2"><Database className="w-4 h-4 text-blue-400"/> Organized Leads</p>
              
              <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between border border-white/5">
                <div>
                  <p className="text-white text-sm font-medium">Dental Hospital</p>
                  <p className="text-gray-400 text-xs">contact@dental.com</p>
                </div>
                <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded">New</span>
              </div>
              <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between border border-white/5">
                <div>
                  <p className="text-white text-sm font-medium">City Clinic</p>
                  <p className="text-gray-400 text-xs">info@clinic.com</p>
                </div>
                <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded">New</span>
              </div>
              <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between border border-white/5">
                <div>
                  <p className="text-white text-sm font-medium">Smile Care</p>
                  <p className="text-gray-400 text-xs">+91 1234567890</p>
                </div>
                <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded">New</span>
              </div>
            </div>

          </div>
        </motion.section>

        {/* Bento Grid Features */}
        <section className="grid md:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6 hover:bg-white/10 transition-colors backdrop-blur-md"
          >
            <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center text-rose-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Skip the Manual Grind</h3>
              <p className="text-gray-400 font-medium leading-relaxed text-sm">
                Searching maps, opening listings, and copying details is slow. Outflow automates the organization so you can focus on outreach.
              </p>
            </div>
          </motion.div>
          
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6 hover:bg-white/10 transition-colors backdrop-blur-md"
          >
            <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Instant Extraction</h3>
              <p className="text-gray-400 font-medium leading-relaxed text-sm">
                Paste your raw, messy output. We automatically identify and extract names, emails, phones, and websites on the spot.
              </p>
            </div>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6 hover:bg-white/10 transition-colors backdrop-blur-md"
          >
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Outreach-Ready CRM</h3>
              <p className="text-gray-400 font-medium leading-relaxed text-sm">
                Don't just clean the data—use it. Track contacted leads, follow-ups, and progress from a simple, built-in dashboard.
              </p>
            </div>
          </motion.div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="mt-32 scroll-mt-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-white">How It Works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative p-8 rounded-3xl bg-black/40 backdrop-blur-md border border-white/10"
            >
              <div className="text-6xl font-semibold text-blue-500/20 absolute -top-4 -right-4 select-none">1</div>
              <h3 className="text-xl font-semibold text-white mb-4 relative z-10 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">1</span>
                Step 1: Scrape the Map
              </h3>
              <p className="text-gray-400 font-medium leading-relaxed text-sm relative z-10">
                Install the <a href="https://chromewebstore.google.com/detail/instant-data-scraper/ofaokhiedipichpaobibbnahnkdoiiah?hl=en" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Instant Data Scraper</a> Chrome extension (desktop only). Search Google Maps for your target—like "real estate in Florida"—and activate the extension with infinite scrolling. It automatically grabs all the listings on the screen.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative p-8 rounded-3xl bg-black/40 backdrop-blur-md border border-white/10"
            >
              <div className="text-6xl font-semibold text-indigo-500/20 absolute -top-4 -right-4 select-none">2</div>
              <h3 className="text-xl font-semibold text-white mb-4 relative z-10 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm">2</span>
                Step 2: Paste the Mess
              </h3>
              <p className="text-gray-400 font-medium leading-relaxed text-sm relative z-10">
                Bring that chaotic, unformatted raw data directly into Outflow. No formatting, no fixing columns, and no spreadsheet headaches required—just copy and paste.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="relative p-8 rounded-3xl bg-black/40 backdrop-blur-md border border-white/10"
            >
              <div className="text-6xl font-semibold text-emerald-500/20 absolute -top-4 -right-4 select-none">3</div>
              <h3 className="text-xl font-semibold text-white mb-4 relative z-10 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm">3</span>
                Step 3: Voila—Your CRM is Ready
              </h3>
              <p className="text-gray-400 font-medium leading-relaxed text-sm relative z-10">
                Our parser instantly cleans the noise, extracts the exact names, emails, and phone numbers, and organizes everything into your outreach dashboard. You are ready to start selling.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Support Section */}
        <section className="mt-32 mb-16 text-center">
          <div className="max-w-2xl mx-auto bg-gradient-to-b from-white/5 to-transparent border border-white/10 p-10 rounded-[2rem]">
            <div className="text-4xl mb-4">☕</div>
            <h2 className="text-2xl font-semibold text-white mb-4">Support the Developer</h2>
            <p className="text-gray-400 italic mb-8 max-w-md mx-auto">
              "You can't buy happiness, but you can buy tea, and that's kind of the same thing!"
            </p>
            <a 
              href="https://rzp.io/rzp/spill-the-chai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-white rounded-xl font-medium transition-all text-lg shadow-lg shadow-[#FF8A00]/20"
            >
              Buy Me a Cup of Chai ☕
            </a>
          </div>
        </section>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-white/5 py-8 flex flex-col items-center justify-center gap-2 text-sm text-gray-500 relative z-10">
        <p>© {new Date().getFullYear()} Outflow. All rights reserved.</p>
        <p>
          Developed with <span className="text-red-500">♥</span> by{' '}
          <a href="https://framesbyneer.in" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors font-medium">
            neer
          </a>
        </p>
      </footer>
    </div>
  );
}

function Dashboard() {
  const [tabs, setTabs] = useState<TabData[]>(() => {
    try {
      const saved = localStorage.getItem('business-tabs');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load tabs from local storage", e);
    }
    return [{ id: crypto.randomUUID(), name: "General", businesses: [] }];
  });
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id || "");
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");

  useEffect(() => {
    localStorage.setItem('business-tabs', JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    if (!tabs.find(t => t.id === activeTabId) && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const stats = {
    total: activeTab?.businesses.length || 0,
    new: activeTab?.businesses.filter(b => b.status === 'New').length || 0,
    contacted: activeTab?.businesses.filter(b => b.status === 'Contacted').length || 0,
    interested: activeTab?.businesses.filter(b => b.status === 'Interested').length || 0,
    notInterested: activeTab?.businesses.filter(b => b.status === 'Not Interested').length || 0,
    followUp: activeTab?.businesses.filter(b => b.status === 'Follow Up').length || 0,
  };

  const handleParse = () => {
    try {
      setError(null);
      const parsed = extractBusinesses(jsonInput);
      if (parsed.length === 0) {
        setError("No valid business data with contact info found in the JSON.");
        return;
      }
      
      setTabs(prev => prev.map(tab => {
        if (tab.id === activeTabId) {
          return { ...tab, businesses: [...tab.businesses, ...parsed] };
        }
        return tab;
      }));
      setJsonInput("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addTab = () => {
    const newTab = { id: crypto.randomUUID(), name: `Category ${tabs.length + 1}`, businesses: [] };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setJsonInput("");
    setError(null);
  };

  const deleteTab = (id: string) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const saveTabName = (id: string) => {
    if (editingTabName.trim()) {
      setTabs(prev => prev.map(t => t.id === id ? { ...t, name: editingTabName.trim() } : t));
    }
    setEditingTabId(null);
  };

  const updateStatus = (businessId: string, newStatus: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        return {
          ...tab,
          businesses: tab.businesses.map(b => b.id === businessId ? { ...b, status: newStatus } : b)
        };
      }
      return tab;
    }));
  };

  const removeBusiness = (businessId: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        return { ...tab, businesses: tab.businesses.filter(b => b.id !== businessId) };
      }
      return tab;
    }));
  };

  const exportCSV = (tab: TabData) => {
    if (tab.businesses.length === 0) return;

    const headers = ["Name", "Status", "Number", "Website", "Email"];
    const csvContent = [
      headers.join(","),
      ...tab.businesses.map(b => 
        [
          `"${(b.name || "").replace(/"/g, '""')}"`,
          `"${(b.status || "New").replace(/"/g, '""')}"`,
          `"${(b.number || "").replace(/"/g, '""')}"`,
          `"${(b.website || "").replace(/"/g, '""')}"`,
          `"${(b.email || "").replace(/"/g, '""')}"`
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${tab.name.replace(/\s+/g, "_")}_contacts.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-500" />
              Raw Data Contact Parser
            </h1>
            <p className="text-gray-400 mt-1 font-medium">Clean and organize raw text (TSV, CSV) or JSON data into categorized contact lists.</p>
          </div>
          <div className="flex items-center gap-4">
             <a href="https://rzp.io/rzp/spill-the-chai" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-300 hover:text-white transition-colors flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-700">Buy me a Chai ☕</a>
          </div>
        </header>

        {/* Tabs Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-800 scrollbar-hide">
          {tabs.map(tab => (
            <div 
              key={tab.id} 
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-colors cursor-pointer group ${
                activeTabId === tab.id 
                  ? 'border-blue-500 bg-gray-900 text-white' 
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'
              }`}
              onClick={() => setActiveTabId(tab.id)}
            >
              {editingTabId === tab.id ? (
                <input 
                  autoFocus
                  type="text"
                  value={editingTabName}
                  onChange={e => setEditingTabName(e.target.value)}
                  onBlur={() => saveTabName(tab.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveTabName(tab.id);
                    if (e.key === 'Escape') setEditingTabId(null);
                  }}
                  className="bg-gray-800 text-white px-2 py-1 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 w-32"
                />
              ) : (
                <span 
                  className="font-medium text-sm select-none"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingTabId(tab.id);
                    setEditingTabName(tab.name);
                  }}
                  title="Double-click to rename"
                >
                  {tab.name}
                </span>
              )}
              {tabs.length > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteTab(tab.id); }} 
                  className={`text-gray-500 hover:text-red-400 p-1 rounded-md transition-opacity ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button 
            onClick={addTab} 
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-500 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Tab
          </button>
        </div>

        {/* Active Tab Content */}
        <div className="space-y-6">
          {/* Dashboard Section */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-blue-900/30 text-blue-400 rounded-lg mb-2">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-2xl font-semibold text-gray-100">{stats.total}</div>
              <div className="text-xs font-medium text-gray-400 mt-1">Total Leads</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-gray-800 text-gray-400 rounded-lg mb-2">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-2xl font-semibold text-gray-100">{stats.new}</div>
              <div className="text-xs font-medium text-gray-400 mt-1">New</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-blue-900/30 text-blue-400 rounded-lg mb-2">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="text-2xl font-semibold text-gray-100">{stats.contacted}</div>
              <div className="text-xs font-medium text-gray-400 mt-1">Contacted</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-yellow-900/30 text-yellow-400 rounded-lg mb-2">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-2xl font-semibold text-gray-100">{stats.followUp}</div>
              <div className="text-xs font-medium text-gray-400 mt-1">Follow Up</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-green-900/30 text-green-400 rounded-lg mb-2">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="text-2xl font-semibold text-gray-100">{stats.interested}</div>
              <div className="text-xs font-medium text-gray-400 mt-1">Interested</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-red-900/30 text-red-400 rounded-lg mb-2">
                <XCircle className="w-5 h-5" />
              </div>
              <div className="text-2xl font-semibold text-gray-100">{stats.notInterested}</div>
              <div className="text-xs font-medium text-gray-400 mt-1">Not Interested</div>
            </div>
          </div>

          {/* Input Section */}
          <div className="bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium flex items-center gap-2 text-gray-200">
                <FileJson className="w-5 h-5 text-blue-500" />
                Paste Raw Data
              </h2>
            </div>
            <textarea
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              placeholder='Paste raw spreadsheet rows, TSV, CSV, or JSON here... (e.g. Acme Corp \t 123-456-7890 \t acme.com)'
              className="w-full h-32 p-4 bg-gray-950 border border-gray-800 rounded-xl text-gray-300 font-mono text-sm placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm font-medium bg-red-900/20 px-4 py-2 rounded-lg border border-red-900/50">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
              </div>
              <button
                onClick={handleParse}
                disabled={!jsonInput.trim()}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                Parse & Clean Data
              </button>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-gray-900 rounded-2xl shadow-sm border border-gray-800 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
              <h3 className="font-medium text-gray-400 text-sm">
                {activeTab?.businesses.length || 0} Contacts Extracted
              </h3>
              <button
                onClick={() => activeTab && exportCSV(activeTab)}
                disabled={!activeTab || activeTab.businesses.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gray-800/50 border-b border-gray-800">
                    <th className="px-6 py-4 font-medium text-gray-400 text-sm w-[25%]">Name</th>
                    <th className="px-6 py-4 font-medium text-gray-400 text-sm w-[15%]">Status</th>
                    <th className="px-6 py-4 font-medium text-gray-400 text-sm w-[15%]">Number</th>
                    <th className="px-6 py-4 font-medium text-gray-400 text-sm w-[20%]">Website</th>
                    <th className="px-6 py-4 font-medium text-gray-400 text-sm w-[20%]">Email</th>
                    <th className="px-6 py-4 font-medium text-gray-400 text-sm w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {activeTab?.businesses.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-800/30 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-gray-100">{b.name}</td>
                      <td className="px-6 py-4 text-sm">
                        <select
                          value={b.status || 'New'}
                          onChange={(e) => updateStatus(b.id, e.target.value)}
                          className={`border text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full min-w-[130px] px-3 py-2.5 outline-none font-medium transition-colors ${
                            b.status === 'Contacted' ? 'bg-blue-900/30 text-blue-300 border-blue-800/50' :
                            b.status === 'Interested' ? 'bg-green-900/30 text-green-300 border-green-800/50' :
                            b.status === 'Not Interested' ? 'bg-red-900/30 text-red-300 border-red-800/50' :
                            b.status === 'Follow Up' ? 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50' :
                            'bg-gray-800 text-gray-200 border-gray-700'
                          }`}
                        >
                          <option value="New" className="bg-gray-900 text-gray-200">New</option>
                          <option value="Contacted" className="bg-gray-900 text-gray-200">Contacted</option>
                          <option value="Interested" className="bg-gray-900 text-gray-200">Interested</option>
                          <option value="Not Interested" className="bg-gray-900 text-gray-200">Not Interested</option>
                          <option value="Follow Up" className="bg-gray-900 text-gray-200">Follow Up</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-400 whitespace-nowrap">{b.number || "-"}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-400">
                        {b.website ? (
                          <a href={b.website.startsWith('http') ? b.website : `https://${b.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline break-all">
                            {b.website}
                          </a>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-400">
                        {b.email ? (
                          <a href={`mailto:${b.email}`} className="text-blue-400 hover:text-blue-300 hover:underline break-all">
                            {b.email}
                          </a>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => removeBusiness(b.id)}
                          className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-800"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!activeTab || activeTab.businesses.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-gray-500 font-medium text-sm">
                        No data in this tab. Paste JSON above to extract contacts.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [showApp, setShowApp] = useState(false);

  if (!showApp) {
    return <LandingPage onGetStarted={() => setShowApp(true)} />;
  }

  return <Dashboard />;
}
