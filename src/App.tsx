/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Download, Plus, Trash2, FileJson, Building2, AlertCircle, Users, PhoneCall, Clock, CheckCircle, XCircle, ArrowRight, Zap, Target, ChevronRight, Check, MapPin, Database } from "lucide-react";
import { motion } from "motion/react";
import { auth, db, signInWithPopup, signOut, googleProvider, onAuthStateChanged, User } from "./firebase";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { LogIn, LogOut, Share2, Link as LinkIcon, User as UserIcon, Sparkles, X, Coffee } from "lucide-react";

interface Business {
  painPoints?: string[];
  isAnalyzing?: boolean;
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

function LandingPage({ onGetStarted, onSignIn }: { onGetStarted: () => void, onSignIn: () => void }) {
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
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="text-sm font-medium text-gray-300 hover:text-white hidden md:block transition-colors">How It Works</a>
            <a href="https://rzp.io/rzp/spill-the-chai" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-300 hover:text-white hidden md:flex items-center gap-1.5 transition-colors">
              <Coffee className="w-4 h-4 text-orange-400" /> Support the Dev
            </a>
            <button onClick={onSignIn} className="text-sm font-medium text-gray-300 hover:text-white flex items-center gap-2 transition-colors"><LogIn className="w-4 h-4"/> Sign In</button>
            <button 
              onClick={onGetStarted}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-500/25"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-32">
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-gray-300 text-sm font-medium tracking-wide mb-4"
          >
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            Stop wasting hours on manual scraping.
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-semibold tracking-tight text-white leading-[1.1]"
          >
            Transform Messy Map Data Into Actionable Outreach Lists.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 font-medium leading-relaxed max-w-3xl mx-auto"
          >
            Paste raw exports from your scraper. We instantly extract the data and organize it into a built-in CRM so you can start reaching out in seconds.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="pt-6 flex flex-col items-center justify-center gap-3"
          >
            <button 
              onClick={onGetStarted}
              className="px-10 py-4 bg-blue-600 text-white hover:bg-blue-500 rounded-xl font-semibold transition-all flex items-center gap-2 text-lg shadow-lg shadow-blue-500/25"
            >
              Start Scraping Now
            </button>
            <div className="text-gray-500 font-medium text-sm">
              No credit card required.
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
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded">NEW</span>
              </div>
              <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between border border-white/5">
                <div>
                  <p className="text-white text-sm font-medium">City Clinic</p>
                  <p className="text-gray-400 text-xs">info@clinic.com</p>
                </div>
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded">NEW</span>
              </div>
              <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between border border-white/5 relative overflow-hidden">
                <div>
                  <p className="text-white text-sm font-medium">Smile Care</p>
                  <p className="text-gray-400 text-xs">+91 1234567890</p>
                </div>
                <div className="flex gap-1.5">
                    <span className="bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] font-medium px-2 py-0.5 rounded backdrop-blur-md">Outdated Site</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Bento Grid Features */}
        <section className="grid md:grid-cols-3 gap-6 mb-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl space-y-6 hover:bg-black/60 transition-colors"
          >
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Skip the Manual Grind</h3>
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
            className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl space-y-6 hover:bg-black/60 transition-colors"
          >
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Instant Extraction</h3>
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
            className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl space-y-6 hover:bg-black/60 transition-colors"
          >
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Outreach-Ready CRM</h3>
              <p className="text-gray-400 font-medium leading-relaxed text-sm">
                Don't just clean the data—use it. Track contacted leads, follow-ups, and progress from a simple, built-in dashboard.
              </p>
            </div>
          </motion.div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="max-w-4xl mx-auto space-y-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-semibold text-center text-white"
          >
            How It Works
          </motion.h2>

          <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            {/* Step 1 */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-blue-500 bg-[#0A0A0A] text-blue-500 font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10">
                1
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 hover:border-blue-500/30 transition-colors">
                <h3 className="text-xl font-semibold text-white mb-3">Step 1: Scrape the Map</h3>
                <p className="text-gray-400 font-medium text-sm leading-relaxed">
                  Install the <a href="https://chromewebstore.google.com/detail/instant-data-scraper/ofaokhiedipichpaobibbnahnkdoiiah?hl=en" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Instant Data Scraper</a> Chrome extension (desktop only). Search Google Maps for your target—like "real estate in Florida"—and activate the extension with infinite scrolling. It automatically grabs all the listings on the screen.
                </p>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-blue-500 bg-[#0A0A0A] text-blue-500 font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10">
                2
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 hover:border-blue-500/30 transition-colors">
                <h3 className="text-xl font-semibold text-white mb-3">Step 2: Paste the Mess</h3>
                <p className="text-gray-400 font-medium text-sm leading-relaxed">
                  Bring that chaotic, unformatted raw data directly into Outflow. No formatting, no fixing columns, and no spreadsheet headaches required—just copy and paste.
                </p>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-blue-500 bg-[#0A0A0A] text-blue-500 font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10">
                3
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 hover:border-blue-500/30 transition-colors">
                <h3 className="text-xl font-semibold text-white mb-3">Step 3: Voila—Your CRM is Ready</h3>
                <p className="text-gray-400 font-medium text-sm leading-relaxed">
                  Our parser instantly cleans the noise, extracts the exact names, emails, and phone numbers, and organizes everything into your outreach dashboard. You are ready to start selling.
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      
      <footer className="border-t border-white/5 py-16 mt-32 text-center text-sm font-medium text-gray-500">
        <div className="flex flex-col items-center justify-center gap-8">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl flex flex-col items-center gap-3 hover:border-orange-500/30 transition-colors">
            <div className="w-12 h-12 bg-orange-500/10 text-orange-400 rounded-full flex items-center justify-center mb-2">
              <Coffee className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">Cutting Chai for Me</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              You can't buy happiness, but you can buy tea, and that's kind of the same thing!
            </p>
            <a href="https://rzp.io/rzp/spill-the-chai" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-orange-600 hover:bg-orange-500 rounded-xl text-white font-medium transition-all shadow-lg shadow-orange-600/20 w-full sm:w-auto">
              Buy Me a Cup of Chai ☕
            </a>
          </div>
          <div>Created with love by <a href="https://framesbyneer.in" target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-400 transition-colors">Neer</a></div>
        </div>
      </footer>
    </div>
  );
}

function Dashboard({ user, sharedListId, onSignOut, onSignIn }: { user: User | null | undefined, sharedListId: string | null, onSignOut: () => void, onSignIn: () => void }) {
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shareLink, setShareLink] = useState("");
  
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");
  
  const [selectedTopic, setSelectedTopic] = useState("Branding & Web Design");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      if (sharedListId) {
        try {
          const docRef = doc(db, "lists", sharedListId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const loadedTab = { id: docSnap.id, name: data.name, businesses: data.businesses || [] };
            setTabs([loadedTab]);
            setActiveTabId(docSnap.id);
          } else {
            setError("Shared list not found or you do not have permission to view it.");
          }
        } catch (e) {
          setError("Failed to load shared list.");
        }
      } else if (user) {
        try {
          const q = query(collection(db, "lists"), where("ownerId", "==", user.uid));
          const querySnapshot = await getDocs(q);
          const userTabs: TabData[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            userTabs.push({ id: doc.id, name: data.name, businesses: data.businesses || [] });
          });
          if (userTabs.length === 0) {
            const newId = crypto.randomUUID();
            userTabs.push({ id: newId, name: "General", businesses: [] });
            await setDoc(doc(db, "lists", newId), {
              ownerId: user.uid,
              name: "General",
              businesses: [],
              isShared: false,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
          setTabs(userTabs);
          setActiveTabId(userTabs[0].id);
        } catch (e) {
          setError("Failed to load your lists.");
        }
      } else {
        try {
          const saved = localStorage.getItem('business-tabs');
          if (saved) {
            const parsed = JSON.parse(saved);
            setTabs(parsed);
            if (parsed.length > 0) setActiveTabId(parsed[0].id);
          } else {
            const defaultTab = { id: crypto.randomUUID(), name: "General", businesses: [] };
            setTabs([defaultTab]);
            setActiveTabId(defaultTab.id);
          }
        } catch (e) {
          console.error(e);
          const defaultTab = { id: crypto.randomUUID(), name: "General", businesses: [] };
          setTabs([defaultTab]);
          setActiveTabId(defaultTab.id);
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, [user, sharedListId]);

  useEffect(() => {
    if (!tabs.find(t => t.id === activeTabId) && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    if (sharedListId || isLoading) return;
    if (!user) {
      if (tabs.length > 0) {
         localStorage.setItem('business-tabs', JSON.stringify(tabs));
      }
    } else if (tabs.length > 0) {
      const timeout = setTimeout(() => {
        const active = tabs.find(t => t.id === activeTabId);
        if (active) {
          setDoc(doc(db, "lists", active.id), {
            ownerId: user.uid,
            name: active.name,
            businesses: active.businesses,
            updatedAt: new Date()
          }, { merge: true }).catch(console.error);
        }
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [tabs, activeTabId, user, sharedListId, isLoading]);

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

  const addTab = async () => {
    const newTab = { id: crypto.randomUUID(), name: `Category ${tabs.length + 1}`, businesses: [] };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setJsonInput("");
    setError(null);
    if (user && !sharedListId) {
      await setDoc(doc(db, "lists", newTab.id), {
        ownerId: user.uid,
        name: newTab.name,
        businesses: [],
        isShared: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  };

  const deleteTab = async (id: string) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[0].id);
    }
    if (user && !sharedListId) {
      await deleteDoc(doc(db, "lists", id)).catch(console.error);
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

  const handleBulkAnalyze = async () => {
    if (selectedRows.size === 0) return;

    const businessesToAnalyze = activeTab?.businesses.filter(b => selectedRows.has(b.id)) || [];

    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        return {
          ...tab,
          businesses: tab.businesses.map(b => selectedRows.has(b.id) ? { ...b, isAnalyzing: true } : b)
        };
      }
      return tab;
    }));

    await Promise.allSettled(businessesToAnalyze.map(async (business) => {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            websiteUrl: business.website?.startsWith('http') ? business.website : (business.website ? `https://${business.website}` : ''),
            topic: selectedTopic,
            businessName: business.name
          })
        });

        const data = await response.json();
        const painPoints = data.pain_points || ["Could not analyze business."];

        setTabs(prev => prev.map(tab => {
          if (tab.id === activeTabId) {
            return {
              ...tab,
              businesses: tab.businesses.map(b => b.id === business.id ? { ...b, isAnalyzing: false, painPoints } : b)
            };
          }
          return tab;
        }));
      } catch (err) {
        console.error(err);
        setTabs(prev => prev.map(tab => {
          if (tab.id === activeTabId) {
            return {
              ...tab,
              businesses: tab.businesses.map(b => b.id === business.id ? { ...b, isAnalyzing: false, painPoints: ["Failed to run analysis."] } : b)
            };
          }
          return tab;
        }));
      }
    }));
  };

  const toggleRowSelection = (businessId: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(businessId)) next.delete(businessId);
      else next.add(businessId);
      return next;
    });
  };

  const toggleAllRows = () => {
    if (!activeTab) return;
    if (selectedRows.size === activeTab.businesses.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(activeTab.businesses.map(b => b.id)));
    }
  };

  const handleShare = async () => {
    if (!user) {
      alert("Please sign in to share lists.");
      return;
    }
    const active = tabs.find(t => t.id === activeTabId);
    if (!active) return;
    
    try {
      await setDoc(doc(db, "lists", active.id), {
        isShared: true
      }, { merge: true });
      const link = `${window.location.origin}/?list=${active.id}`;
      setShareLink(link);
    } catch (e) {
      console.error(e);
      alert("Failed to generate share link.");
    }
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
              Outflow CRM
              {sharedListId && <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-1 rounded-full border border-blue-800 ml-2">Shared View</span>}
            </h1>
            <p className="text-gray-400 mt-1 font-medium">Clean and organize raw map data exports into actionable lists.</p>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-4 border border-gray-800 bg-gray-900/50 rounded-xl p-2 px-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-300 font-medium">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-full" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-gray-500" />
                  )}
                  {user.displayName || user.email}
                </div>
                <div className="w-px h-4 bg-gray-800"></div>
                <button onClick={onSignOut} className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"><LogOut className="w-4 h-4"/> Sign Out</button>
              </div>
            ) : (
              <button onClick={onSignIn} className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
                <LogIn className="w-4 h-4"/> Sign In to Save
              </button>
            )}
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
              <div className="flex items-center gap-3">
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="bg-black/40 border border-white/10 text-white text-sm rounded-lg backdrop-blur-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="Branding & Web Design">Branding & Web Design</option>
                  <option value="SEO & Content Marketing">SEO & Content Marketing</option>
                  <option value="Social Media Management">Social Media Management</option>
                  <option value="Operational Efficiency">Operational Efficiency</option>
                </select>
                <button
                  onClick={handleBulkAnalyze}
                  disabled={selectedRows.size === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-900/50 rounded-lg text-sm font-medium hover:bg-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Analyze Leads
                </button>
                {!sharedListId && (
                  <button
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-900/50 rounded-lg text-sm font-medium hover:bg-blue-600/30 transition-colors shadow-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    Share List
                  </button>
                )}
                <button
                  onClick={() => activeTab && exportCSV(activeTab)}
                  disabled={!activeTab || activeTab.businesses.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>
            
            {shareLink && (
              <div className="p-4 border-b border-gray-800 bg-blue-900/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-200">Anyone with the link can view this list</h4>
                    <p className="text-xs text-blue-400 break-all select-all">{shareLink}</p>
                  </div>
                </div>
                <button onClick={() => setShareLink("")} className="text-sm text-gray-500 hover:text-white">Close</button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gray-800/50 border-b border-gray-800">
                    <th className="px-6 py-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        checked={activeTab?.businesses.length > 0 && selectedRows.size === activeTab?.businesses.length}
                        onChange={toggleAllRows}
                        className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/50"
                      />
                    </th>
                    <th className="px-6 py-4 font-medium text-gray-400 text-sm w-[15%]">Name</th>
                    <th className="px-6 py-4 font-medium text-gray-400 text-sm w-[15%]">Status</th>
                    <th className="px-6 py-4 font-medium text-gray-400 text-sm w-[10%]">Number</th>
                    <th className="px-6 py-4 font-medium text-gray-400 text-sm w-[15%]">Website</th>
                    <th className="px-6 py-4 font-medium text-gray-400 text-sm w-[15%]">Email</th>
                    <th className="px-6 py-4 font-medium text-gray-400 text-sm w-[25%]">Key Weaknesses</th>
                    <th className="px-6 py-4 font-medium text-gray-400 text-sm w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {activeTab?.businesses.map((b) => (
                    <React.Fragment key={b.id}>
                      <tr className="hover:bg-gray-800/30 transition-colors group">
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedRows.has(b.id)}
                            onChange={() => toggleRowSelection(b.id)}
                            className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/50"
                          />
                        </td>
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
                        <td className="px-6 py-4 text-sm">
                          {b.isAnalyzing ? (
                            <div className="flex items-center gap-2 text-purple-400 text-xs font-medium">
                              <div className="w-3 h-3 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
                              Analyzing...
                            </div>
                          ) : b.painPoints && b.painPoints.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {b.painPoints.map((pt, i) => (
                                <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-blue-500/10 backdrop-blur-md border border-blue-500/20 text-[11px] font-medium text-blue-400">
                                  {pt}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          <button 
                            onClick={() => removeBusiness(b.id)}
                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-800"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
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
      
      <footer className="border-t border-white/5 py-16 mt-16 text-center text-sm font-medium text-gray-500">
        <div className="flex flex-col items-center justify-center gap-8">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl max-w-md w-full shadow-sm flex flex-col items-center gap-3 hover:border-orange-500/30 transition-colors">
            <div className="w-12 h-12 bg-orange-500/10 text-orange-400 rounded-full flex items-center justify-center mb-2">
              <Coffee className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">Cutting Chai for Me</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              You can't buy happiness, but you can buy tea, and that's kind of the same thing!
            </p>
            <a href="https://rzp.io/rzp/spill-the-chai" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-orange-600 hover:bg-orange-500 rounded-xl text-white font-medium transition-all shadow-lg shadow-orange-600/20 w-full sm:w-auto">
              Buy Me a Cup of Chai ☕
            </a>
          </div>
          <div>Created with love by <a href="https://framesbyneer.in" target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-400 transition-colors">Neer</a></div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [showApp, setShowApp] = useState(false);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [sharedListId, setSharedListId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const listId = urlParams.get('list');
    if (listId) {
      setSharedListId(listId);
      setShowApp(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowApp(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setSharedListId(null);
    window.history.replaceState({}, '', '/');
  };

  if (user === undefined) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div></div>;

  if (!showApp) {
    return <LandingPage onGetStarted={() => setShowApp(true)} onSignIn={handleSignIn} />;
  }

  return <Dashboard user={user} sharedListId={sharedListId} onSignOut={handleSignOut} onSignIn={handleSignIn} />;
}
