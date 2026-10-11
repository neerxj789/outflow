/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Download, Plus, Trash2, FileJson, Building2, AlertCircle, Users, 
  PhoneCall, Clock, CheckCircle, XCircle, ArrowRight, Zap, Target, 
  ChevronRight, Check, MapPin, Database, Upload, Copy, ExternalLink, 
  Mail, Phone, Search, Edit3, X, Sparkles
} from "lucide-react";
import { motion } from "motion/react";
import Papa from "papaparse";

export interface Business {
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

/**
 * Robust phone number extractor tailored for messy scraper data,
 * especially Google Maps / Instant Data Scraper exports where phone numbers
 * are embedded inside detail strings (e.g. "7+ years in business · 4th Floor · 098985 88807").
 */
export function extractPhone(text: string): string {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();

  // Avoid URLs or Google Maps direction/place identifiers
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.includes("google.com/maps") ||
    trimmed.includes("gstatic.com") ||
    trimmed.includes("googleusercontent.com") ||
    trimmed.includes("schema.org")
  ) {
    return "";
  }

  // 1. Google Maps detail strings often delimit parts with middle dot (· / \u00b7), bullet (• / \u2022), pipe (|), or newline
  // Example: "7+ years in business · 4th Floor – 410, Bansal Mall · 098985 88807"
  const segments = trimmed.split(/[\u00b7\u2022|\n\r]/).map(s => s.trim()).filter(Boolean);
  for (const seg of segments) {
    // A phone segment won't contain long English words (>= 5 letters), which would indicate an address or description
    if (!/[a-zA-Z]{5,}/.test(seg)) {
      const digitsOnly = seg.replace(/\D/g, "");
      if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
        return seg.trim();
      }
    }
  }

  // 2. Indian Mobile Numbers (with optional +91, 91, or 0 prefix, 10 digits starting with 6, 7, 8, or 9)
  // Matches: 098985 88807, +91 98985 88807, +91-98985-88807, 09898588807, 98985 88807
  const indianMobileMatch = trimmed.match(/(?:(?:\+91|91|0)[-.\s]?)?[6-9]\d{4}[-.\s]?\d{5}\b/);
  if (indianMobileMatch) {
    const digitsOnly = indianMobileMatch[0].replace(/\D/g, "");
    if (digitsOnly.length >= 10 && digitsOnly.length <= 12) {
      return indianMobileMatch[0].trim();
    }
  }

  // 3. Indian Landline / STD code numbers (e.g. 0265 2345678, 022-26789012)
  const landlineMatch = trimmed.match(/\b0\d{2,4}[-.\s]?\d{6,8}\b/);
  if (landlineMatch) {
    const digitsOnly = landlineMatch[0].replace(/\D/g, "");
    if (digitsOnly.length >= 8 && digitsOnly.length <= 12) {
      return landlineMatch[0].trim();
    }
  }

  // 4. International numbers with leading '+' (e.g. +1 555-123-4567, +44 20 7946 0958)
  const intlPlusMatch = trimmed.match(/\+\d{1,4}[-.\s]?\(?\d{1,5}\)?[-.\s]?\d{2,5}[-.\s]?\d{2,5}\b/);
  if (intlPlusMatch) {
    const digitsOnly = intlPlusMatch[0].replace(/\D/g, "");
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      return intlPlusMatch[0].trim();
    }
  }

  // 5. Standard US / NA formats: (123) 456-7890, 123-456-7890, 123.456.7890
  const stdMatch = trimmed.match(/(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/);
  if (stdMatch) {
    const digitsOnly = stdMatch[0].replace(/\D/g, "");
    if (digitsOnly.length === 10) {
      return stdMatch[0].trim();
    }
  }

  return "";
}

/**
 * Extracts a legitimate website URL, filtering out scraper artifact links
 * like Google Maps directions, gstatic images, etc.
 */
export function extractWebsite(text: string): string {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();
  const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/i;
  const match = trimmed.match(urlRegex);
  if (match) {
    const url = match[0];
    if (
      !url.includes("google.com/maps") &&
      !url.includes("gstatic.com") &&
      !url.includes("googleusercontent.com") &&
      !url.includes("schema.org") &&
      !url.includes("w3.org")
    ) {
      return url;
    }
  }

  // Check if cell is a bare domain with www.
  const domainRegex = /\b(?:www\.)[a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.[a-zA-Z]{2,10}(?:\/[^\s]*)?/i;
  const domainMatch = trimmed.match(domainRegex);
  if (domainMatch) {
    return `https://${domainMatch[0]}`;
  }

  return "";
}

/**
 * Extracts email address from text
 */
export function extractEmail(text: string): string {
  if (!text || typeof text !== "string") return "";
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : "";
}

/**
 * Checks whether a row looks like a scraper or CSV header
 */
function isHeaderRow(cells: string[]): boolean {
  if (!cells || cells.length === 0) return false;
  const joined = cells.join(" ").toLowerCase();
  if (
    joined.includes("osrxxb") ||
    joined.includes("rllt__details") ||
    joined.includes("yyljef") ||
    joined.includes("qbf1pd")
  ) {
    return true;
  }
  const first = cells[0].toLowerCase().trim();
  if (
    first === "name" ||
    first === "business name" ||
    first === "company" ||
    first === "title" ||
    first === "osrxxb"
  ) {
    return true;
  }
  return false;
}

export function extractBusinesses(input: string): Business[] {
  let results: Business[] = [];
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Please enter or paste data to parse.");
  }

  // 1. Try parsing as JSON first (e.g. Instant Data Scraper JSON export)
  let isJson = false;
  try {
    const data = JSON.parse(trimmed);
    isJson = true;

    const traverse = (obj: any) => {
      if (Array.isArray(obj)) {
        obj.forEach(traverse);
      } else if (obj !== null && typeof obj === "object") {
        let name = "";
        let email = "";
        let website = "";
        let number = "";

        // Check keys directly
        for (const [key, val] of Object.entries(obj)) {
          if (typeof val === "string" || typeof val === "number") {
            const strVal = String(val).trim();
            const lowerKey = key.toLowerCase();

            // Name by key
            if (!name && ["name", "title", "company", "business", "organization", "osrxxb", "qbf1pd"].some(k => lowerKey.includes(k))) {
              if (strVal.length >= 2 && !strVal.startsWith("http") && !strVal.startsWith("·")) {
                name = strVal;
              }
            }

            // Email
            if (!email) {
              email = extractEmail(strVal);
            }

            // Website
            if (!website) {
              website = extractWebsite(strVal);
            }

            // Phone number (scans all values including rllt__details columns)
            if (!number) {
              number = extractPhone(strVal);
            }
          }
        }

        // If name wasn't detected by key, inspect first string that looks like a business name
        if (!name) {
          for (const [key, val] of Object.entries(obj)) {
            if (typeof val === "string") {
              const strVal = val.trim();
              if (
                strVal.length >= 2 &&
                strVal.length <= 120 &&
                !strVal.startsWith("http") &&
                !strVal.includes("@") &&
                strVal !== number &&
                !strVal.startsWith("·") &&
                !/^[\d.]+(\s*\(\d+\))?$/.test(strVal) &&
                /[a-zA-Z]/.test(strVal)
              ) {
                name = strVal;
                break;
              }
            }
          }
        }

        if (name) {
          name = name.replace(/^[\u00b7\u2022\-–\s]+/, "").trim();
          if (name && (email || website || number || Object.keys(obj).length >= 2)) {
            results.push({
              id: crypto.randomUUID(),
              name,
              status: "New",
              email: email || "",
              website: website || "",
              number: number || "",
            });
          }
        }
      }
    };
    traverse(data);
  } catch (e) {
    // Not JSON, continue to tabular parsing
  }

  // 2. If not JSON or no results found, parse using PapaParse (TSV, CSV, spreadsheet clipboard)
  if (!isJson || results.length === 0) {
    const parsed = Papa.parse(trimmed, {
      skipEmptyLines: true,
    });

    const rows = parsed.data as string[][];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length === 0) continue;
      const cleanCells = row.map(c => String(c ?? "").trim()).filter(Boolean);
      if (cleanCells.length === 0) continue;
      if (isHeaderRow(cleanCells)) continue;

      let name = "";
      let email = "";
      let website = "";
      let phone = "";

      // 1. Scan all cells for Email, Website, and Phone
      for (const cell of cleanCells) {
        if (!email) email = extractEmail(cell);
        if (!website) website = extractWebsite(cell);
        if (!phone) phone = extractPhone(cell);
      }

      // 2. Determine Name (cell[0] is typically business name in scrapers)
      const firstCell = cleanCells[0];
      const isFirstCellPhone = !!extractPhone(firstCell);
      const isFirstCellUrl = firstCell.startsWith("http") || !!extractWebsite(firstCell);
      const isFirstCellEmail = firstCell.includes("@");
      const isFirstCellRating = /^[\d.]+(\s*\(\d+\))?$/.test(firstCell);
      const isFirstCellHours = firstCell.toLowerCase().includes("open") || firstCell.toLowerCase().includes("close");
      const isFirstCellBadge = firstCell.startsWith("·") || firstCell.toLowerCase() === "website" || firstCell.toLowerCase() === "directions";

      if (!isFirstCellPhone && !isFirstCellUrl && !isFirstCellEmail && !isFirstCellRating && !isFirstCellHours && !isFirstCellBadge && firstCell.length >= 2) {
        name = firstCell;
      } else {
        // Search other cells
        for (const cell of cleanCells) {
          if (
            cell !== phone &&
            !cell.startsWith("http") &&
            !cell.includes("@") &&
            !cell.startsWith("·") &&
            cell.toLowerCase() !== "website" &&
            cell.toLowerCase() !== "directions" &&
            cell.toLowerCase() !== "open" &&
            cell.toLowerCase() !== "closed" &&
            !/^[\d.]+(\s*\(\d+\))?$/.test(cell) &&
            cell.length >= 2 &&
            cell.length <= 120 &&
            /[a-zA-Z]/.test(cell)
          ) {
            name = cell;
            break;
          }
        }
      }

      if (name) {
        name = name.replace(/^[\u00b7\u2022\-–\s]+/, "").trim();
      }

      if (name && (phone || website || email || cleanCells.length >= 2)) {
        results.push({
          id: crypto.randomUUID(),
          name,
          status: "New",
          email: email || "",
          website: website || "",
          number: phone || "",
        });
      }
    }
  }

  if (results.length === 0) {
    throw new Error("No valid business data found. Please paste raw scraper rows (TSV, CSV) or JSON.");
  }

  // Deduplicate by name & phone / website
  const unique = new Map<string, Business>();
  results.forEach(b => {
    const key = `${b.name.toLowerCase()}-${b.number}-${b.website}-${b.email}`;
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

const SAMPLE_SCRAPER_DATA = `OSrXXb\trllt__details\tyi40Hd\tRDApEe\trllt__details 2\trllt__details 3\trllt__details 4\tncRHuf\tr3PLsf\tncRHuf 2\tyYlJEf href\tQuU3Wb\tyYlJEf href 2\tQuU3Wb 2
Dipeshpreneur\t· Internet marketing service\t4.9\t(210)\t7+ years in business · 4th Floor – 410, Bansal Mall, Baroda Commerce, near Nilamber Circle · 098985 88807\t· Closes 11 pm\tOpen\tOn-site services\t·\tOnline appointments\thttp://dipeshpreneur.com/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
Barodian Advertising - Digital Marketing Agency In Vadodara\t· Internet marketing service\t4.8\t(87)\t10+ years in business · 299/A/9, Vijay Street G.I.D.C Estate · 086904 36874\t· Opens 9:30 am Mon\tClosed\tOn-site services\t·\tOnline appointments\thttp://barodianadvertising.in/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
Brand Buzzar\t· Internet marketing service\t4.7\t(87)\t7+ years in business · 063546 17414\t\t\tOnline appointments\t\t\thttps://brandbuzzar.com/\tWebsite\t\t
Digital Ratna\t· Internet marketing service\t4.9\t(80)\t3+ years in business · Malhar Point, 202 Shilp Apartment, 14/15, Old Padra Rd · 094286 46207\t\tOpen 24 hours\tOn-site services\t·\tOnline appointments\thttps://digitalratna.com/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
Snad Media\t· Internet marketing service\t4.8\t(135)\t15+ years in business · 23, Nandanvan Society, 24, Faramji Rd · 070431 89991\t· Opens 9 am Mon\tClosed\tOn-site services\t·\tOnline appointments\thttps://www.snadmedia.com/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
Digibird.in\t· Marketing agency\t4.8\t(70)\t5+ years in business · 1st, 91A, 91A · 094087 27957\t· Closes 10 pm\tOpen\tOnline appointments\t·\tOn-site services not available\t\t\thttps://www.google.com/maps/dir/\tDirections
Hello Marketing\t· Internet marketing service\t5.0\t(75)\t7+ years in business · 404 B, Sunrise Point Complex · 095582 59066\t\tOpen 24 hours\tOn-site services\t·\tOnline appointments\thttps://hellomarketing.in/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
WELTEC Institute\t· Training center\t4.7\t(762)\t15+ years in business · Third Floor, Commerce Center, beside Hotel Limra · 097145 14957\t· Opens 9 am Mon\tClosed\tOn-site services\t·\tOnline classes\thttps://www.weltec.in/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
UNTITLED ADVERTISING\t· Advertising agency\t4.6\t(93)\t10+ years in business · 203, Sidcup Tower, Race Course Rd · 094091 52255\t\tOpen 24 hours\t\t\t\thttp://untitledad.in/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
SEOWebPlanet Solutions\t· Internet marketing service\t4.9\t(132)\t10+ years in business · 6, Citypark Society, 3rd Floor, Saral Prakash Complex, New Sama Rd · 075678 68483\t· Opens 10 am Mon\tClosed\tOn-site services\t·\tOnline appointments\thttps://www.seowebplanet.com/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
Ideatick\t· Internet marketing service\t4.9\t(37)\t7+ years in business · 301, Ocean Complex, Sarabhai Rd · 099797 38578\t· Opens 9:30 am Mon\tClosed\tOn-site services\t·\tOnline appointments\thttps://www.ideatick.com/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
Ovibits Digital\t· Internet marketing service\t5.0\t(44)\tOvibits Digital, Char Rasta, Dabhoi - Waghodia Ring Rd · 094282 75373\t· Closes 6 pm\tOpen\tOn-site services\t·\tOnline appointments\thttps://www.ovibits.com/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
Digital Marketing Course in Vadodara\t· Training center\t4.9\t(80)\t7+ years in business · FF - 15, Nautillus Building · 099250 37863\t· Opens 10 am Mon\tClosed\tOnline classes\t·\tOn-site services not available\thttps://digitalitproducts.com/digital-marketing-courses-in-vadodara/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
Vivid Digisolution\t· Internet marketing service\t4.9\t(123)\t5+ years in business · Felix Complex, 402, nr. Shaheed Chandra Shekhar Azad Road · 095103 22143\t· Opens 9 am Mon\tClosed\tOn-site services\t\t\thttps://vividdigisolution.com/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
Digiigrow\t· Internet marketing service\t4.9\t(48)\t25+ years in business · Pushpam Homes, 02/06, Bill Kalai Rd · 083694 59586\t\tOpen 24 hours\tOn-site services\t·\tOnline appointments\thttps://digiigrow.com/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
Tatvamasi Digital\t· Internet marketing service\t5.0\t(43)\t5+ years in business · 307, rajshree centre, opp. Effotel Sayaji Hotel · 075675 51557\t· Opens 10 am Mon\tClosed\tOn-site services\t·\tOnline appointments\thttps://tatvamasidigital.com/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
Eyelash Technologies | Website Design & SEO Company\t· Internet marketing service\t5.0\t(135)\t10+ years in business · Maruti Apartment, A-302 · 078781 08282\t· Opens 9:30 am Mon\tClosed\tOn-site services\t·\tOnline appointments\thttps://eyelashtechnologies.com/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
S R MARKET PLACE\t· Internet marketing service\t5.0\t(101)\t35+ years in business · 2nd Floor 31, SHREE SHIDDESHWAR PLAZA · 081284 73637\t· Opens 10 am Mon\tClosed\tOn-site services\t·\tOnline appointments\thttp://www.srmarketplace.in/\tWebsite\thttps://www.google.com/maps/dir/\tDirections
Livebrain Technologies\t· Internet marketing service\t5.0\t(58)\t15+ years in business · 4th Floor - 16, Samanvay Status 2, Padra Road · 097123 29966\t· Opens 9 am Mon\tClosed\tOn-site services\t·\tOnline appointments\thttps://lbtmarketing.in/\tWebsite\thttps://www.google.com/maps/dir/\tDirections`;

function Dashboard() {
  const [tabs, setTabs] = useState<TabData[]>(() => {
    try {
      const saved = localStorage.getItem("business-tabs");
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
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Tab editing state
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");

  // Business inline editing state
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Business>>({});

  // Manual Add state
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", number: "", website: "", email: "", status: "New" });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("business-tabs", JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    if (!tabs.find(t => t.id === activeTabId) && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const stats = {
    total: activeTab?.businesses.length || 0,
    withPhone: activeTab?.businesses.filter(b => b.number && b.number.trim() !== "").length || 0,
    withWebsite: activeTab?.businesses.filter(b => b.website && b.website.trim() !== "").length || 0,
    withEmail: activeTab?.businesses.filter(b => b.email && b.email.trim() !== "").length || 0,
    new: activeTab?.businesses.filter(b => b.status === "New").length || 0,
    contacted: activeTab?.businesses.filter(b => b.status === "Contacted").length || 0,
    interested: activeTab?.businesses.filter(b => b.status === "Interested").length || 0,
    notInterested: activeTab?.businesses.filter(b => b.status === "Not Interested").length || 0,
    followUp: activeTab?.businesses.filter(b => b.status === "Follow Up").length || 0,
  };

  const handleParse = (rawText?: string) => {
    try {
      setError(null);
      const textToParse = typeof rawText === "string" ? rawText : jsonInput;
      if (!textToParse.trim()) {
        setError("Please paste or upload data first.");
        return;
      }
      const parsed = extractBusinesses(textToParse);
      if (parsed.length === 0) {
        setError("No valid business data found.");
        return;
      }

      setTabs(prev => prev.map(tab => {
        if (tab.id === activeTabId) {
          // Deduplicate with existing items in this tab
          const existingKeys = new Set(tab.businesses.map(b => `${b.name.toLowerCase()}-${b.number}-${b.website}`));
          const newUnique = parsed.filter(b => !existingKeys.has(`${b.name.toLowerCase()}-${b.number}-${b.website}`));
          return { ...tab, businesses: [...tab.businesses, ...newUnique] };
        }
        return tab;
      }));
      setJsonInput("");
    } catch (err: any) {
      setError(err.message || "Failed to parse data");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonInput(content);
        handleParse(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const loadSampleData = () => {
    setJsonInput(SAMPLE_SCRAPER_DATA);
    handleParse(SAMPLE_SCRAPER_DATA);
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

  const clearCurrentTab = () => {
    if (!activeTab || activeTab.businesses.length === 0) return;
    if (window.confirm("Are you sure you want to clear all leads in this tab?")) {
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, businesses: [] } : t));
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

  const startEditBusiness = (b: Business) => {
    setEditingBusinessId(b.id);
    setEditForm({ ...b });
  };

  const saveEditBusiness = () => {
    if (!editingBusinessId) return;
    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        return {
          ...tab,
          businesses: tab.businesses.map(b => b.id === editingBusinessId ? { ...b, ...editForm } as Business : b)
        };
      }
      return tab;
    }));
    setEditingBusinessId(null);
    setEditForm({});
  };

  const cancelEditBusiness = () => {
    setEditingBusinessId(null);
    setEditForm({});
  };

  const handleAddManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name.trim()) return;

    const lead: Business = {
      id: crypto.randomUUID(),
      name: newLead.name.trim(),
      number: newLead.number.trim(),
      website: newLead.website.trim(),
      email: newLead.email.trim(),
      status: newLead.status || "New"
    };

    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        return { ...tab, businesses: [lead, ...tab.businesses] };
      }
      return tab;
    }));

    setNewLead({ name: "", number: "", website: "", email: "", status: "New" });
    setIsAddingLead(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCSV = (tab: TabData) => {
    if (tab.businesses.length === 0) return;

    const headers = ["Name", "Status", "Mobile Number", "Website", "Email"];
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
    link.setAttribute("download", `${tab.name.replace(/\s+/g, "_")}_outreach_contacts.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter businesses by search query
  const filteredBusinesses = (activeTab?.businesses || []).filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.number.toLowerCase().includes(q) ||
      b.website.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans p-4 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-500" />
              Outflow Contact Parser & CRM
            </h1>
            <p className="text-gray-400 mt-1 font-medium text-sm">
              Extract business names, phone/mobile numbers, websites, and emails from Google Maps scrapers, TSV, CSV, or JSON.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadSampleData}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium transition-colors"
              title="Load Google Maps scraper data from Vadodara agencies"
            >
              <Sparkles className="w-4 h-4" /> Load Scraper Sample
            </button>
            <a 
              href="https://rzp.io/rzp/spill-the-chai" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-700"
            >
              Buy me a Chai ☕
            </a>
          </div>
        </header>

        {/* Tabs Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-800 scrollbar-hide">
          {tabs.map(tab => (
            <div 
              key={tab.id} 
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-colors cursor-pointer group ${
                activeTabId === tab.id 
                  ? "border-blue-500 bg-gray-900 text-white" 
                  : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900/50"
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
                    if (e.key === "Enter") saveTabName(tab.id);
                    if (e.key === "Escape") setEditingTabId(null);
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
                  <span className="ml-2 text-xs text-gray-500">({tab.businesses.length})</span>
                </span>
              )}
              {tabs.length > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteTab(tab.id); }} 
                  className={`text-gray-500 hover:text-red-400 p-1 rounded-md transition-opacity ${activeTabId === tab.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  title="Delete tab"
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
          {/* Key Metrics Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-blue-900/30 text-blue-400 rounded-lg mb-1.5">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-gray-100">{stats.total}</div>
              <div className="text-xs text-gray-400">Total Leads</div>
            </div>
            
            <div className="bg-gray-900 border border-blue-500/30 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-emerald-900/30 text-emerald-400 rounded-lg mb-1.5">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-emerald-300">
                {stats.withPhone}
                <span className="text-xs font-normal text-gray-500 ml-1">
                  ({stats.total > 0 ? Math.round((stats.withPhone / stats.total) * 100) : 0}%)
                </span>
              </div>
              <div className="text-xs text-gray-400 font-medium">Mobile Phones</div>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-indigo-900/30 text-indigo-400 rounded-lg mb-1.5">
                <ExternalLink className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-indigo-300">{stats.withWebsite}</div>
              <div className="text-xs text-gray-400">Websites</div>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-gray-800 text-gray-400 rounded-lg mb-1.5">
                <Plus className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-gray-200">{stats.new}</div>
              <div className="text-xs text-gray-400">New</div>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-blue-900/30 text-blue-400 rounded-lg mb-1.5">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-gray-200">{stats.contacted}</div>
              <div className="text-xs text-gray-400">Contacted</div>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-yellow-900/30 text-yellow-400 rounded-lg mb-1.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-gray-200">{stats.followUp}</div>
              <div className="text-xs text-gray-400">Follow Up</div>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-green-900/30 text-green-400 rounded-lg mb-1.5">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-green-300">{stats.interested}</div>
              <div className="text-xs text-gray-400">Interested</div>
            </div>
          </div>

          {/* Input Section */}
          <div className="bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-medium text-gray-200">
                  Import Scraper Data
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/40 font-mono">
                  Instant Data Scraper / Google Maps
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv,.tsv,.txt,.json" 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium border border-gray-700 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload File (.csv, .tsv, .json)
                </button>
                {jsonInput && (
                  <button
                    type="button"
                    onClick={() => setJsonInput("")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              placeholder="Paste raw Google Maps exports, Instant Data Scraper tables (TSV), CSV rows, or JSON here... Phone numbers embedded in detail text or addresses are automatically extracted!"
              className="w-full h-32 p-4 bg-gray-950 border border-gray-800 rounded-xl text-gray-300 font-mono text-xs placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                {error ? (
                  <div className="flex items-center gap-2 text-red-400 text-sm font-medium bg-red-900/20 px-4 py-2 rounded-lg border border-red-900/50">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    💡 Tip: If you copied from Instant Data Scraper using "Copy All", simply press paste above and click Parse.
                  </p>
                )}
              </div>
              <button
                onClick={() => handleParse()}
                disabled={!jsonInput.trim()}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm"
              >
                Parse & Extract Contacts
              </button>
            </div>
          </div>

          {/* Table Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, phone, website, email..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsAddingLead(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors"
              >
                <Plus className="w-4 h-4 text-blue-400" /> Add Lead
              </button>
              {activeTab && activeTab.businesses.length > 0 && (
                <button
                  onClick={clearCurrentTab}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-gray-500 hover:text-red-400 border border-transparent hover:border-red-900/40 rounded-lg text-sm transition-colors"
                  title="Clear all leads in tab"
                >
                  <Trash2 className="w-4 h-4" /> Clear All
                </button>
              )}
              <button
                onClick={() => activeTab && exportCSV(activeTab)}
                disabled={!activeTab || activeTab.businesses.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 border border-blue-500 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white shadow-sm"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>

          {/* Add Manual Lead Form */}
          {isAddingLead && (
            <form onSubmit={handleAddManualLead} className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" /> Add New Lead Manually
                </h4>
                <button 
                  type="button" 
                  onClick={() => setIsAddingLead(false)} 
                  className="text-gray-500 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <input
                  type="text"
                  placeholder="Business Name *"
                  required
                  value={newLead.name}
                  onChange={e => setNewLead({ ...newLead, name: e.target.value })}
                  className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Mobile / Phone"
                  value={newLead.number}
                  onChange={e => setNewLead({ ...newLead, number: e.target.value })}
                  className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Website URL"
                  value={newLead.website}
                  onChange={e => setNewLead({ ...newLead, website: e.target.value })}
                  className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={newLead.email}
                  onChange={e => setNewLead({ ...newLead, email: e.target.value })}
                  className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <select
                    value={newLead.status}
                    onChange={e => setNewLead({ ...newLead, status: e.target.value })}
                    className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Interested">Interested</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Not Interested">Not Interested</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Table Section */}
          <div className="bg-gray-900 rounded-2xl shadow-sm border border-gray-800 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
              <h3 className="font-medium text-gray-400 text-sm">
                Showing {filteredBusinesses.length} of {activeTab?.businesses.length || 0} Contacts
                {stats.withPhone > 0 && (
                  <span className="ml-2 text-emerald-400 font-mono text-xs">
                    • {stats.withPhone} with mobile numbers
                  </span>
                )}
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-gray-800/50 border-b border-gray-800">
                    <th className="px-5 py-3.5 font-medium text-gray-400 text-xs uppercase tracking-wider w-[26%]">Business Name</th>
                    <th className="px-4 py-3.5 font-medium text-gray-400 text-xs uppercase tracking-wider w-[14%]">Status</th>
                    <th className="px-4 py-3.5 font-medium text-gray-400 text-xs uppercase tracking-wider w-[18%]">Mobile Number</th>
                    <th className="px-4 py-3.5 font-medium text-gray-400 text-xs uppercase tracking-wider w-[18%]">Website</th>
                    <th className="px-4 py-3.5 font-medium text-gray-400 text-xs uppercase tracking-wider w-[16%]">Email</th>
                    <th className="px-4 py-3.5 font-medium text-gray-400 text-xs uppercase tracking-wider w-[8%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/70">
                  {filteredBusinesses.map((b) => {
                    const isEditing = editingBusinessId === b.id;

                    if (isEditing) {
                      return (
                        <tr key={b.id} className="bg-gray-800/40">
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              value={editForm.name ?? b.name} 
                              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                              className="bg-gray-950 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white w-full outline-none focus:ring-1 focus:ring-blue-500" 
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={editForm.status ?? b.status}
                              onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                              className="bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-xs text-white w-full outline-none"
                            >
                              <option value="New">New</option>
                              <option value="Contacted">Contacted</option>
                              <option value="Interested">Interested</option>
                              <option value="Not Interested">Not Interested</option>
                              <option value="Follow Up">Follow Up</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              value={editForm.number ?? b.number} 
                              onChange={e => setEditForm({ ...editForm, number: e.target.value })}
                              placeholder="Mobile number"
                              className="bg-gray-950 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white w-full outline-none focus:ring-1 focus:ring-blue-500 font-mono" 
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              value={editForm.website ?? b.website} 
                              onChange={e => setEditForm({ ...editForm, website: e.target.value })}
                              placeholder="Website"
                              className="bg-gray-950 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white w-full outline-none focus:ring-1 focus:ring-blue-500" 
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              value={editForm.email ?? b.email} 
                              onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                              placeholder="Email"
                              className="bg-gray-950 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white w-full outline-none focus:ring-1 focus:ring-blue-500" 
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={saveEditBusiness} 
                                className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={cancelEditBusiness} 
                                className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={b.id} className="hover:bg-gray-800/40 transition-colors group">
                        {/* Name */}
                        <td className="px-5 py-4">
                          <div className="font-medium text-sm text-gray-100 group-hover:text-blue-400 transition-colors">
                            {b.name}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 text-sm">
                          <select
                            value={b.status || "New"}
                            onChange={(e) => updateStatus(b.id, e.target.value)}
                            className={`border text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full px-2.5 py-1.5 outline-none font-medium transition-colors ${
                              b.status === "Contacted" ? "bg-blue-900/30 text-blue-300 border-blue-800/50" :
                              b.status === "Interested" ? "bg-green-900/30 text-green-300 border-green-800/50" :
                              b.status === "Not Interested" ? "bg-red-900/30 text-red-300 border-red-800/50" :
                              b.status === "Follow Up" ? "bg-yellow-900/30 text-yellow-300 border-yellow-800/50" :
                              "bg-gray-800 text-gray-200 border-gray-700"
                            }`}
                          >
                            <option value="New" className="bg-gray-900 text-gray-200">New</option>
                            <option value="Contacted" className="bg-gray-900 text-gray-200">Contacted</option>
                            <option value="Interested" className="bg-gray-900 text-gray-200">Interested</option>
                            <option value="Not Interested" className="bg-gray-900 text-gray-200">Not Interested</option>
                            <option value="Follow Up" className="bg-gray-900 text-gray-200">Follow Up</option>
                          </select>
                        </td>

                        {/* Number */}
                        <td className="px-4 py-4 text-sm font-medium">
                          {b.number ? (
                            <div className="flex items-center gap-1.5 font-mono text-gray-200">
                              <span className="text-emerald-400 font-semibold">{b.number}</span>
                              <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(b.number, b.id)}
                                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors"
                                  title="Copy phone number"
                                >
                                  {copiedId === b.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <a
                                  href={`tel:${b.number.replace(/[^\d+]/g, "")}`}
                                  className="p-1 text-gray-400 hover:text-emerald-400 rounded hover:bg-gray-800 transition-colors"
                                  title="Call number"
                                >
                                  <PhoneCall className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-600 italic text-xs">No number</span>
                          )}
                        </td>

                        {/* Website */}
                        <td className="px-4 py-4 text-sm font-medium">
                          {b.website ? (
                            <a 
                              href={b.website.startsWith("http") ? b.website : `https://${b.website}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 max-w-[200px] truncate"
                              title={b.website}
                            >
                              <span className="truncate">{b.website.replace(/^https?:\/\/(?:www\.)?/, "")}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-gray-600 text-xs">-</span>
                          )}
                        </td>

                        {/* Email */}
                        <td className="px-4 py-4 text-sm font-medium">
                          {b.email ? (
                            <a 
                              href={`mailto:${b.email}`} 
                              className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 max-w-[180px] truncate"
                              title={b.email}
                            >
                              <span className="truncate">{b.email}</span>
                              <Mail className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-gray-600 text-xs">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditBusiness(b)}
                              className="text-gray-400 hover:text-blue-400 p-1.5 rounded hover:bg-gray-800 transition-colors"
                              title="Edit contact"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => removeBusiness(b.id)}
                              className="text-gray-400 hover:text-red-400 p-1.5 rounded hover:bg-gray-800 transition-colors"
                              title="Remove contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBusinesses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-gray-500 font-medium text-sm">
                        {activeTab?.businesses.length === 0 ? (
                          <div className="space-y-3">
                            <p>No contacts in this tab yet.</p>
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={loadSampleData}
                                className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors"
                              >
                                Try with Sample Scraper Data
                              </button>
                              <button
                                onClick={() => setIsAddingLead(true)}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors"
                              >
                                Add Lead Manually
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p>No contacts matching "{searchQuery}".</p>
                        )}
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
