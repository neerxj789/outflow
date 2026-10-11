/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Download, Plus, Trash2, FileJson, Building2, AlertCircle, Users, 
  PhoneCall, Clock, CheckCircle, XCircle, ArrowRight, Zap, Target, 
  ChevronRight, Check, MapPin, Database, Upload, Copy, ExternalLink, 
  Mail, Phone, Search, Edit3, X, Sparkles, FileText,
  Github, Star, Terminal, ShieldCheck, CheckCircle2, Coffee
} from "lucide-react";
import { motion } from "motion/react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
 * Detects whether a string is a Google Maps or search/scraper artifact URL,
 * rather than an actual business website.
 */
export function isGoogleOrMapsUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const u = url.toLowerCase().trim();
  return (
    u === "website" ||
    u === "directions" ||
    u.includes("google.") ||
    u.includes("goo.gl") ||
    u.includes("gstatic.com") ||
    u.includes("googleusercontent.com") ||
    u.includes("schema.org") ||
    u.includes("w3.org") ||
    u.includes("/maps") ||
    u.includes("maps.") ||
    u.includes("directions") ||
    u.includes("openstreetmap.org") ||
    u.includes("bing.com/maps") ||
    u.includes("apple.com/maps")
  );
}

/**
 * Extracts a legitimate website URL, filtering out scraper artifact links
 * like Google Maps directions, gstatic images, Google links, etc.
 * Never uses or returns a Google Maps link as a placeholder.
 */
export function extractWebsite(text: string): string {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();

  // If the cell content is itself a Google or maps artifact, skip it completely
  if (isGoogleOrMapsUrl(trimmed)) {
    return "";
  }

  const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/i;
  const match = trimmed.match(urlRegex);
  if (match) {
    const url = match[0];
    if (!isGoogleOrMapsUrl(url)) {
      return url;
    }
  }

  // Check if cell is a bare domain with www.
  const domainRegex = /\b(?:www\.)[a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.[a-zA-Z]{2,10}(?:\/[^\s]*)?/i;
  const domainMatch = trimmed.match(domainRegex);
  if (domainMatch) {
    const domainUrl = `https://${domainMatch[0]}`;
    if (!isGoogleOrMapsUrl(domainUrl)) {
      return domainUrl;
    }
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
            const cleanWebsite = (website && !isGoogleOrMapsUrl(website)) ? website : "";
            results.push({
              id: crypto.randomUUID(),
              name,
              status: "New",
              email: email || "",
              website: cleanWebsite,
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
        const cleanWebsite = (website && !isGoogleOrMapsUrl(website)) ? website : "";
        results.push({
          id: crypto.randomUUID(),
          name,
          status: "New",
          email: email || "",
          website: cleanWebsite,
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

function LandingPage({ onGetStarted }: { onGetStarted: (autoLoadSample?: boolean) => void }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden">
      {/* Top GitHub Notification Bar */}
      <div className="bg-zinc-950 border-b border-zinc-800/80 py-2 px-4 text-center text-xs font-medium text-zinc-300 relative z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-zinc-200">Open Source on GitHub</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">Free forever</span>
          </span>
          <span className="text-zinc-600 hidden sm:inline">·</span>
          <a 
            href="https://github.com/neerxj789/outflow" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 transition-colors decoration-emerald-500/40 hover:decoration-emerald-400"
          >
            Star on GitHub ⭐
          </a>
        </div>
      </div>

      {/* Subtle Radial Glow & Grid Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-emerald-600/10 opacity-70 blur-[130px] rounded-full"></div>
        <div className="absolute top-[600px] left-1/3 w-[600px] h-[400px] bg-teal-600/5 opacity-50 blur-[120px] rounded-full"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-40 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
              <Terminal className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xl tracking-tight text-white">Outflow</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.2 · MIT
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 md:gap-7">
            <a href="#features" className="hidden sm:block text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hidden sm:block text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
              How it works
            </a>
            <a 
              href="https://github.com/neerxj789/outflow" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Github className="w-4 h-4 text-zinc-400" />
              <span>GitHub (Star ⭐)</span>
            </a>
            <button 
              onClick={() => onGetStarted(false)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-lg transition-colors text-sm shadow-sm shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              Launch App
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* Hero Section */}
        <section className="text-center max-w-5xl mx-auto space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono font-medium"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            MIT Licensed · 100% Client-Side Lead Parser
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.02em] text-white leading-[1.08] text-balance"
          >
            Turn raw map scrapes into{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
              clean outreach leads
            </span>{" "}
            in seconds.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-zinc-400 font-normal leading-relaxed max-w-2xl mx-auto"
          >
            Drop chaotic exports from Instant Data Scraper. Outflow isolates unformatted phone numbers, strips map junk, and delivers structured CRM-ready CSV and PDF lists. Zero signup, zero tracking.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={() => onGetStarted(false)}
              className="w-full sm:w-auto px-7 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-emerald-500/20 group cursor-pointer"
            >
              Start Parsing Now — Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a 
              href="https://github.com/neerxj789/outflow"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-base"
            >
              <Github className="w-4 h-4 text-zinc-400" />
              <span>Star on GitHub ⭐</span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="text-zinc-500 font-mono text-xs flex items-center justify-center gap-3 pt-2 flex-wrap"
          >
            <span>✓ No login required</span>
            <span>·</span>
            <span>✓ Runs locally in your browser</span>
            <span>·</span>
            <span>✓ Works with CSV, TSV & JSON</span>
          </motion.div>
        </section>

        {/* Interactive Hero / Preview Area */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-16 mb-28 relative mx-auto max-w-5xl"
        >
          {/* Subtle glow backdrop */}
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-emerald-500/20 rounded-[2.5rem] blur-xl opacity-40"></div>
          
          <div className="relative bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 md:p-7 shadow-2xl space-y-5 backdrop-blur-md">
            
            {/* Window bar with button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/40 border border-red-500/60"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/40 border border-yellow-500/60"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-500/60"></div>
                </div>
                <span className="font-mono text-xs text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800">
                  outflow-parser-engine.ts
                </span>
              </div>

              {/* Interactive Try sample scraper data button */}
              <button
                type="button"
                onClick={() => onGetStarted(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg text-xs font-mono font-bold transition-all shadow-md shadow-emerald-500/20 hover:scale-[1.02] cursor-pointer"
                title="Loads 20 real Google Maps scraper records directly into the CRM"
              >
                <Sparkles className="w-3.5 h-3.5 text-zinc-950" />
                <span>Try sample scraper data</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Split Comparison Demonstration */}
            <div className="grid md:grid-cols-2 gap-4 items-stretch">
              {/* Left: Raw Scraper Mess */}
              <div className="bg-zinc-950 rounded-xl border border-zinc-800/80 p-4 font-mono text-xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-zinc-500 pb-2 border-b border-zinc-900 mb-2">
                    <span className="text-red-400/90 flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-red-500/60"></span>
                      RAW SCRAPER ROW (TSV / IDS)
                    </span>
                    <span className="text-[11px] text-zinc-600">Unfiltered DOM dump</span>
                  </div>
                  <div className="space-y-2 text-zinc-400 leading-relaxed overflow-x-auto pb-1 text-[11px]">
                    <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-900 space-y-1">
                      <div className="text-zinc-200 font-semibold">Dipeshpreneur · Internet marketing</div>
                      <div className="text-zinc-500">
                        7+ years in business · 4th Floor – 410, Bansal Mall · <span className="text-red-400 font-semibold bg-red-500/10 px-1 rounded">098985 88807</span>
                      </div>
                      <div className="text-zinc-600 text-[10px] truncate">
                        http://dipeshpreneur.com/ · <span className="line-through text-red-500/70">https://www.google.com/maps/dir/...</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-900 space-y-1 opacity-70">
                      <div className="text-zinc-200 font-semibold">Digibird.in · Marketing agency</div>
                      <div className="text-zinc-500">
                        5+ years in business · Sampatrao Colony · <span className="text-red-400 font-semibold bg-red-500/10 px-1 rounded">094087 27957</span>
                      </div>
                      <div className="text-zinc-600 text-[10px] truncate">
                        [No Website] · <span className="line-through text-red-500/70">https://www.google.com/maps/dir/...</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-2 text-[11px] text-zinc-500 flex items-center justify-between border-t border-zinc-900">
                  <span className="text-red-400/80">❌ Phones buried in address lines</span>
                  <span className="text-red-400/80">❌ Directions link breaks website field</span>
                </div>
              </div>

              {/* Right: Clean CRM Structure */}
              <div className="bg-zinc-950 rounded-xl border border-emerald-500/40 p-4 font-mono text-xs space-y-3 flex flex-col justify-between relative shadow-sm shadow-emerald-500/5">
                <div>
                  <div className="flex items-center justify-between text-zinc-500 pb-2 border-b border-zinc-900 mb-2">
                    <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      ISOLATED & CRM-READY
                    </span>
                    <span className="text-[11px] text-emerald-400/70 font-sans">0ms client-side</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-2">
                      <div className="space-y-0.5 truncate">
                        <div className="text-white font-medium font-sans">Dipeshpreneur</div>
                        <div className="text-emerald-400 truncate">http://dipeshpreneur.com/</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-white font-mono font-semibold bg-zinc-800 px-2.5 py-0.5 rounded border border-zinc-700">
                          098985 88807
                        </div>
                        <div className="text-[10px] text-emerald-400 mt-0.5">Mobile Isolated ✓</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-2">
                      <div className="space-y-0.5 truncate">
                        <div className="text-white font-medium font-sans">Digibird.in</div>
                        <div className="text-zinc-500 italic">- (Maps link stripped)</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-white font-mono font-semibold bg-zinc-800 px-2.5 py-0.5 rounded border border-zinc-700">
                          094087 27957
                        </div>
                        <div className="text-[10px] text-emerald-400 mt-0.5">Mobile Isolated ✓</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-zinc-400 flex items-center justify-between border-t border-zinc-900">
                  <span className="text-emerald-400">✓ Numbers formatted in pure white</span>
                  <span className="text-emerald-400">✓ 0 Maps junk placeholders</span>
                </div>
              </div>
            </div>

            {/* Bottom Bar inside Hero preview */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-zinc-400">
              <span className="font-mono text-zinc-500">
                Engine: RFC-4180 PapaParse + Multi-pattern Telecom RegEx + Strict Sanitizer
              </span>
              <button
                type="button"
                onClick={() => onGetStarted(true)}
                className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                Click to load 20 Vadodara scraper rows into Outflow →
              </button>
            </div>
          </div>
        </motion.section>

        {/* Feature Comparison Section (2x2 Grid) */}
        <section id="features" className="mt-28 scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
              ENGINE ARCHITECTURE COMPARISON
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              The Scraper Nightmare vs. The Outflow Fix
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base">
              Why raw Google Maps scraper dumps break workflows, and how Outflow fixes them deterministically in your browser.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            
            {/* Card 1: Phone Numbers in Address */}
            <div className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-6 space-y-4 transition-colors">
              <div className="space-y-2">
                <span className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                  The Scraper Nightmare
                </span>
                <h3 className="text-base font-semibold text-zinc-200">
                  Google Maps bunches phone numbers into address strings
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Scrapers dump raw unstructured DOM text where phone numbers, floor numbers, and pin codes sit in one unparsed line, breaking outreach tools.
                </p>
              </div>
              <div className="pt-3 border-t border-zinc-800/80 bg-zinc-950/70 -mx-6 -mb-6 p-4 rounded-b-2xl border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>The Outflow Fix: Smart Regex isolates mobile & landline numbers</span>
                </div>
                <p className="text-xs text-zinc-400 pl-6">
                  Intelligent pattern matchers detect 10-digit Indian mobiles (+91/0), STD code landlines, and international formats while ignoring street digits and pin codes.
                </p>
              </div>
            </div>

            {/* Card 2: Directions URLs */}
            <div className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-6 space-y-4 transition-colors">
              <div className="space-y-2">
                <span className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                  The Scraper Nightmare
                </span>
                <h3 className="text-base font-semibold text-zinc-200">
                  Directions URLs pollute website fields
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  When a listing has no website, scraper tools fall back to maps links (<code className="text-zinc-400 bg-zinc-950 px-1 py-0.5 rounded">google.com/maps/dir/</code>), ruining automated email and outreach sequences.
                </p>
              </div>
              <div className="pt-3 border-t border-zinc-800/80 bg-zinc-950/70 -mx-6 -mb-6 p-4 rounded-b-2xl border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>The Outflow Fix: Zero false positives, strips google.com/maps placeholders</span>
                </div>
                <p className="text-xs text-zinc-400 pl-6">
                  Strict domain validation discards Google Maps, directions, gstatic, and schema artifacts. If there's no website, it remains clean without bogus map URLs.
                </p>
              </div>
            </div>

            {/* Card 3: Address Commas Breaking CSV */}
            <div className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-6 space-y-4 transition-colors">
              <div className="space-y-2">
                <span className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                  The Scraper Nightmare
                </span>
                <h3 className="text-base font-semibold text-zinc-200">
                  Commas in addresses break CSV rows
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Basic CSV splitters break addresses on every comma, destroying column alignment and corrupting entire lists in Google Sheets and Excel.
                </p>
              </div>
              <div className="pt-3 border-t border-zinc-800/80 bg-zinc-950/70 -mx-6 -mb-6 p-4 rounded-b-2xl border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>The Outflow Fix: Full PapaParse support with zero delimiter bleeding</span>
                </div>
                <p className="text-xs text-zinc-400 pl-6">
                  RFC-4180 compliant parser auto-detects tabs (TSV), quotes, commas, and line breaks to preserve complex nested addresses with 100% column fidelity.
                </p>
              </div>
            </div>

            {/* Card 4: Expensive Scraper Credits */}
            <div className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-6 space-y-4 transition-colors">
              <div className="space-y-2">
                <span className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                  The Scraper Nightmare
                </span>
                <h3 className="text-base font-semibold text-zinc-200">
                  Expensive scraper credits & complex setups
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Online list clean-up tools demand subscriptions, charge per-row credits, or harvest your target prospect database on remote servers.
                </p>
              </div>
              <div className="pt-3 border-t border-zinc-800/80 bg-zinc-950/70 -mx-6 -mb-6 p-4 rounded-b-2xl border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>The Outflow Fix: 100% free, client-side, export to clean CSV/PDF</span>
                </div>
                <p className="text-xs text-zinc-400 pl-6">
                  Completely local and open source. Zero network transfer for parsed leads. Instant one-click exports directly to formatted CSV files and high-resolution PDF documents.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="mt-32 scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
              WORKFLOW GUIDE
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">How It Works</h2>
            <p className="text-zinc-400 text-sm sm:text-base">Three effortless steps from raw browser export to high-converting outreach pipeline.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="p-7 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 relative overflow-hidden">
              <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">STEP 01</span>
              <h3 className="text-lg font-semibold text-white">Scrape the Map</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Use the free <a href="https://chromewebstore.google.com/detail/instant-data-scraper/ofaokhiedipichpaobibbnahnkdoiiah?hl=en" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Instant Data Scraper</a> extension on Google Maps. Search any niche and city, run infinite scroll, and copy all results.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 relative overflow-hidden">
              <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">STEP 02</span>
              <h3 className="text-lg font-semibold text-white">Paste the Raw Dump</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Paste the chaotic clipboard rows directly into Outflow. No spreadsheet cleanup, no deleting broken columns. Our browser engine parses TSV, CSV, or JSON instantly.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 relative overflow-hidden">
              <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">STEP 03</span>
              <h3 className="text-lg font-semibold text-white">Export & Outreach</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Track status across New, Contacted, and Follow-Up. Export pristine CSVs for your CRM or generate beautifully formatted PDF lead sheets with a single click.
              </p>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="mt-28 mb-16 text-center">
          <div className="max-w-2xl mx-auto bg-zinc-900/70 border border-zinc-800 p-9 rounded-2xl space-y-4">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mx-auto text-xl border border-amber-500/20">
              ☕
            </div>
            <h2 className="text-xl font-semibold text-white">Support the Developer</h2>
            <p className="text-zinc-400 text-xs italic max-w-md mx-auto">
              "You can't buy happiness, but you can buy tea, and that's kind of the same thing!"
            </p>
            <div className="pt-2">
              <a 
                href="https://rzp.io/rzp/spill-the-chai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-white rounded-xl font-medium transition-all text-sm shadow-lg shadow-[#FF8A00]/20"
              >
                <Coffee className="w-4 h-4" />
                Buy Me a Cup of Chai ☕
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Open Source Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-10 px-6 text-xs text-zinc-500 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="font-semibold text-sm text-zinc-200">Outflow</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                MIT License
              </span>
            </div>
            <p className="text-zinc-400 max-w-md leading-relaxed">
              Outflow is free, client-side, and open source under the MIT License. No backend logging, no contact harvesting.
            </p>
          </div>

          <div className="flex items-center gap-6 flex-wrap justify-center">
            <a 
              href="https://github.com/neerxj789/outflow" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 font-medium"
            >
              <Github className="w-4 h-4 text-emerald-400" />
              <span>neerxj789/outflow</span>
            </a>
            <a 
              href="https://rzp.io/rzp/spill-the-chai" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 font-medium"
            >
              <Coffee className="w-4 h-4 text-amber-400" />
              <span>Buy Me a Chai ☕</span>
            </a>
            <a 
              href="https://framesbyneer.in" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Developed with <span className="text-red-500">♥</span> by <span className="text-zinc-200 font-medium">neer</span>
            </a>
          </div>
        </div>
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

function Dashboard({
  initialLoadSample,
  onBackToLanding,
}: {
  initialLoadSample?: boolean;
  onBackToLanding?: () => void;
}) {
  const [tabs, setTabs] = useState<TabData[]>(() => {
    try {
      const saved = localStorage.getItem("business-tabs");
      if (saved) {
        const loaded: TabData[] = JSON.parse(saved);
        return loaded.map(tab => ({
          ...tab,
          businesses: (tab.businesses || []).map(b => ({
            ...b,
            website: isGoogleOrMapsUrl(b.website) ? "" : b.website,
          }))
        }));
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

  // Auto-load sample if requested
  useEffect(() => {
    if (initialLoadSample) {
      handleParse(SAMPLE_SCRAPER_DATA);
    }
  }, [initialLoadSample]);

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
    withWebsite: activeTab?.businesses.filter(b => b.website && b.website.trim() !== "" && !isGoogleOrMapsUrl(b.website)).length || 0,
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
      ...tab.businesses.map(b => {
        const cleanWebsite = (b.website && !isGoogleOrMapsUrl(b.website)) ? b.website : "";
        return [
          `"${(b.name || "").replace(/"/g, '""')}"`,
          `"${(b.status || "New").replace(/"/g, '""')}"`,
          `"${(b.number || "").replace(/"/g, '""')}"`,
          `"${cleanWebsite.replace(/"/g, '""')}"`,
          `"${(b.email || "").replace(/"/g, '""')}"`
        ].join(",");
      })
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

  const exportPDF = (tab: TabData) => {
    if (tab.businesses.length === 0) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    // Title & Header info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(`Outflow - ${tab.name} Outreach Leads`, 40, 42);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const dateStr = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const withPhoneCount = tab.businesses.filter(b => b.number && b.number.trim()).length;
    doc.text(`Generated: ${dateStr} • Total Leads: ${tab.businesses.length} • Mobile Numbers Found: ${withPhoneCount}`, 40, 58);

    const tableData = tab.businesses.map((b, i) => [
      i + 1,
      b.name || "",
      b.status || "New",
      b.number || "-",
      (b.website && !isGoogleOrMapsUrl(b.website)) ? b.website : "-",
      b.email || "-",
    ]);

    autoTable(doc, {
      startY: 72,
      head: [["#", "Business Name", "Status", "Mobile Number", "Website", "Email"]],
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 5,
        textColor: [30, 41, 59],
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [37, 99, 235], // Blue-600
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 25, halign: "center" },
        1: { cellWidth: 180, fontStyle: "bold" },
        2: { cellWidth: 75, halign: "center" },
        3: { cellWidth: 120 },
        4: { cellWidth: 180 },
        5: { cellWidth: 180 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 40, right: 40, bottom: 40 },
    });

    doc.save(`${tab.name.replace(/\s+/g, "_")}_outreach_leads.pdf`);
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 md:p-8 selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="max-w-7xl mx-auto space-y-7">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              {onBackToLanding && (
                <button
                  onClick={onBackToLanding}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title="Return to Landing Page"
                >
                  ← Overview
                </button>
              )}
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <Terminal className="w-6 h-6 text-emerald-400" />
                Outflow Parser & CRM
              </h1>
            </div>
            <p className="text-zinc-400 font-medium text-xs md:text-sm">
              Extract business names, mobile numbers, websites, and emails from Google Maps scrapers, TSV, CSV, or JSON.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={loadSampleData}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
              title="Load Google Maps scraper data from Vadodara agencies"
            >
              <Sparkles className="w-3.5 h-3.5" /> Load Scraper Sample
            </button>
            <a 
              href="https://github.com/neerxj789/outflow" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800"
            >
              <Github className="w-3.5 h-3.5 text-zinc-400" />
              <span>Star ⭐</span>
            </a>
            <a 
              href="https://rzp.io/rzp/spill-the-chai" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800"
            >
              <Coffee className="w-3.5 h-3.5 text-amber-400" />
              <span>Chai ☕</span>
            </a>
          </div>
        </header>

        {/* Tabs Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800 scrollbar-hide">
          {tabs.map(tab => (
            <div 
              key={tab.id} 
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-colors cursor-pointer group ${
                activeTabId === tab.id 
                  ? "border-emerald-500 bg-zinc-900 text-white" 
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
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
                  className="bg-zinc-800 text-white px-2 py-1 rounded text-sm outline-none focus:ring-1 focus:ring-emerald-500 w-32 font-mono"
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
                  <span className="ml-2 text-xs text-white font-mono">({tab.businesses.length})</span>
                </span>
              )}
              {tabs.length > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteTab(tab.id); }} 
                  className={`text-zinc-500 hover:text-red-400 p-1 rounded-md transition-opacity ${activeTabId === tab.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  title="Delete tab"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button 
            onClick={addTab} 
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Tab
          </button>
        </div>

        {/* Active Tab Content */}
        <div className="space-y-6">
          {/* Key Metrics Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg mb-1.5">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-white font-mono">{stats.total}</div>
              <div className="text-xs text-zinc-400">Total Leads</div>
            </div>
            
            <div className="bg-zinc-900 border border-emerald-500/40 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-lg mb-1.5">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-white font-mono">
                {stats.withPhone}
                <span className="text-xs font-normal text-white/90 ml-1">
                  ({stats.total > 0 ? Math.round((stats.withPhone / stats.total) * 100) : 0}%)
                </span>
              </div>
              <div className="text-xs text-emerald-400 font-medium">Mobile Phones</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg mb-1.5">
                <ExternalLink className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-white font-mono">{stats.withWebsite}</div>
              <div className="text-xs text-zinc-400">Websites</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-zinc-800 text-zinc-400 rounded-lg mb-1.5">
                <Plus className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-white font-mono">{stats.new}</div>
              <div className="text-xs text-zinc-400">New</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-blue-500/15 text-blue-400 rounded-lg mb-1.5">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-white font-mono">{stats.contacted}</div>
              <div className="text-xs text-zinc-400">Contacted</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-yellow-500/15 text-yellow-400 rounded-lg mb-1.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-white font-mono">{stats.followUp}</div>
              <div className="text-xs text-zinc-400">Follow Up</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-lg mb-1.5">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-white font-mono">{stats.interested}</div>
              <div className="text-xs text-zinc-400">Interested</div>
            </div>
          </div>

          {/* Input Section */}
          <div className="bg-zinc-900/90 p-6 rounded-2xl shadow-sm border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-medium text-zinc-200">
                  Import Scraper Data
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono font-medium border border-zinc-700 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload File (.csv, .tsv, .json)
                </button>
              </div>
            </div>

            <textarea
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              placeholder="Paste raw Google Maps exports, Instant Data Scraper tables (TSV), CSV rows, or JSON here... Phone numbers embedded in detail text or addresses are automatically extracted!"
              className="w-full h-32 p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 font-mono text-xs placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all resize-none"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                {error ? (
                  <div className="flex items-center gap-2 text-red-400 text-sm font-medium bg-red-900/20 px-4 py-2 rounded-lg border border-red-900/50">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 font-mono">
                    💡 Tip: If you clicked "Copy All" in Instant Data Scraper, just press Paste above and click Parse.
                  </p>
                )}
              </div>
              <button
                onClick={() => handleParse()}
                disabled={!jsonInput.trim()}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-md shadow-emerald-500/20 cursor-pointer text-sm"
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" /> Add Lead
              </button>
              <button
                onClick={() => activeTab && exportPDF(activeTab)}
                disabled={!activeTab || activeTab.businesses.length === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white text-sm font-medium rounded-lg shadow-sm cursor-pointer"
                title="Export leads to PDF"
              >
                <FileText className="w-4 h-4" /> Export PDF
              </button>
              <button
                onClick={() => activeTab && exportCSV(activeTab)}
                disabled={!activeTab || activeTab.businesses.length === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-zinc-200 text-sm font-medium rounded-lg shadow-sm cursor-pointer"
                title="Export leads to CSV"
              >
                <Download className="w-4 h-4 text-emerald-400" /> Export CSV
              </button>
            </div>
          </div>

          {/* Add Manual Lead Form */}
          {isAddingLead && (
            <form onSubmit={handleAddManualLead} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" /> Add New Lead Manually
                </h4>
                <button 
                  type="button" 
                  onClick={() => setIsAddingLead(false)} 
                  className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
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
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Mobile / Phone"
                  value={newLead.number}
                  onChange={e => setNewLead({ ...newLead, number: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <input
                  type="text"
                  placeholder="Website URL"
                  value={newLead.website}
                  onChange={e => setNewLead({ ...newLead, website: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={newLead.email}
                  onChange={e => setNewLead({ ...newLead, email: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <div className="flex gap-2">
                  <select
                    value={newLead.status}
                    onChange={e => setNewLead({ ...newLead, status: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Interested">Interested</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Not Interested">Not Interested</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Table Section */}
          <div className="bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <h3 className="font-medium text-zinc-400 text-sm">
                Showing <span className="text-white font-semibold">{filteredBusinesses.length}</span> of <span className="text-white font-semibold">{activeTab?.businesses.length || 0}</span> Contacts
                {stats.withPhone > 0 && (
                  <span className="ml-2 text-white font-mono text-xs">
                    • <span className="text-white font-semibold">{stats.withPhone}</span> with mobile numbers
                  </span>
                )}
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-zinc-800/60 border-b border-zinc-800">
                    <th className="px-5 py-3.5 font-medium text-zinc-400 text-xs uppercase tracking-wider w-[26%] font-mono">Business Name</th>
                    <th className="px-4 py-3.5 font-medium text-zinc-400 text-xs uppercase tracking-wider w-[14%] font-mono">Status</th>
                    <th className="px-4 py-3.5 font-medium text-zinc-400 text-xs uppercase tracking-wider w-[18%] font-mono">Mobile Number</th>
                    <th className="px-4 py-3.5 font-medium text-zinc-400 text-xs uppercase tracking-wider w-[18%] font-mono">Website</th>
                    <th className="px-4 py-3.5 font-medium text-zinc-400 text-xs uppercase tracking-wider w-[16%] font-mono">Email</th>
                    <th className="px-4 py-3.5 font-medium text-zinc-400 text-xs uppercase tracking-wider w-[8%] text-right font-mono">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredBusinesses.map((b) => {
                    const isEditing = editingBusinessId === b.id;

                    if (isEditing) {
                      return (
                        <tr key={b.id} className="bg-zinc-800/40">
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              value={editForm.name ?? b.name} 
                              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                              className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-white w-full outline-none focus:ring-1 focus:ring-emerald-500" 
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={editForm.status ?? b.status}
                              onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                              className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white w-full outline-none"
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
                              className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-white w-full outline-none focus:ring-1 focus:ring-emerald-500 font-mono" 
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              value={editForm.website ?? b.website} 
                              onChange={e => setEditForm({ ...editForm, website: e.target.value })}
                              placeholder="Website"
                              className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-white w-full outline-none focus:ring-1 focus:ring-emerald-500" 
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              value={editForm.email ?? b.email} 
                              onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                              placeholder="Email"
                              className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-white w-full outline-none focus:ring-1 focus:ring-emerald-500" 
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={saveEditBusiness} 
                                className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded text-xs cursor-pointer"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={cancelEditBusiness} 
                                className="p-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-xs cursor-pointer"
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
                      <tr key={b.id} className="hover:bg-zinc-800/40 transition-colors group">
                        {/* Name */}
                        <td className="px-5 py-4">
                          <div className="font-medium text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors">
                            {b.name}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 text-sm">
                          <select
                            value={b.status || "New"}
                            onChange={(e) => updateStatus(b.id, e.target.value)}
                            className={`border text-xs rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full px-2.5 py-1.5 outline-none font-medium transition-colors ${
                              b.status === "Contacted" ? "bg-blue-900/30 text-blue-300 border-blue-800/50" :
                              b.status === "Interested" ? "bg-emerald-900/30 text-emerald-300 border-emerald-800/50" :
                              b.status === "Not Interested" ? "bg-red-900/30 text-red-300 border-red-800/50" :
                              b.status === "Follow Up" ? "bg-yellow-900/30 text-yellow-300 border-yellow-800/50" :
                              "bg-zinc-800 text-zinc-200 border-zinc-700"
                            }`}
                          >
                            <option value="New" className="bg-zinc-900 text-zinc-200">New</option>
                            <option value="Contacted" className="bg-zinc-900 text-zinc-200">Contacted</option>
                            <option value="Interested" className="bg-zinc-900 text-zinc-200">Interested</option>
                            <option value="Not Interested" className="bg-zinc-900 text-zinc-200">Not Interested</option>
                            <option value="Follow Up" className="bg-zinc-900 text-zinc-200">Follow Up</option>
                          </select>
                        </td>

                        {/* Number */}
                        <td className="px-4 py-4 text-sm font-medium">
                          {b.number ? (
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="text-white font-medium">{b.number}</span>
                              <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(b.number, b.id)}
                                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors"
                                  title="Copy phone number"
                                >
                                  {copiedId === b.id ? (
                                    <Check className="w-3.5 h-3.5 text-white" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <a
                                  href={`tel:${b.number.replace(/[^\d+]/g, "")}`}
                                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors"
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
                          {b.website && !isGoogleOrMapsUrl(b.website) ? (
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
  const [autoLoadSample, setAutoLoadSample] = useState(false);

  const handleGetStarted = (loadSample: boolean = false) => {
    if (loadSample) {
      setAutoLoadSample(true);
    }
    setShowApp(true);
  };

  if (!showApp) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  return (
    <Dashboard
      initialLoadSample={autoLoadSample}
      onBackToLanding={() => {
        setShowApp(false);
        setAutoLoadSample(false);
      }}
    />
  );
}
