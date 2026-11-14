const MAX_LEADS = 200;

const state = {
  isRunning: false,
  tabId: null,
  pageCount: 1,
  leads: [],
  leadKeys: new Set(),
  skippedBlocked: 0,
  scanLinkedPages: false,
  outflowUrl: "http://localhost:3000",
  statusText: "Ready to extract leads from the open page.",
  errorText: "",
};

// Load saved preferences on worker startup
chrome.storage.local.get(["outflowUrl", "scanLinkedPages"], (data) => {
  if (data.outflowUrl) state.outflowUrl = data.outflowUrl;
  if (typeof data.scanLinkedPages === "boolean") {
    state.scanLinkedPages = data.scanLinkedPages;
  }
});

// Open Side Panel when clicking toolbar icon
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});
}

function broadcastState() {
  chrome.runtime
    .sendMessage({
      type: "SCRAPE_STATE",
      payload: {
        isRunning: state.isRunning,
        pageCount: state.pageCount,
        leads: state.leads,
        skippedBlocked: state.skippedBlocked,
        scanLinkedPages: state.scanLinkedPages,
        outflowUrl: state.outflowUrl,
        statusText: state.statusText,
        errorText: state.errorText,
        maxLeads: MAX_LEADS,
      },
    })
    .catch(() => {});
}

function makeLeadKey(lead) {
  const name = (lead.name || "").toLowerCase().trim();
  const link = (lead.sourceLink || "").toLowerCase().trim();
  const num = (lead.number || "").replace(/\D/g, "");
  const email = (lead.email || "").toLowerCase().trim();
  return `${name}|${num}|${email}|${link}`;
}

function mergeLeads(incoming) {
  let added = 0;
  for (const item of incoming || []) {
    if (state.leads.length >= MAX_LEADS) break;
    const key = makeLeadKey(item);
    if (!state.leadKeys.has(key)) {
      state.leadKeys.add(key);
      state.leads.push({
        id: crypto.randomUUID(),
        name: item.name || "",
        email: item.email || "",
        number: item.number || "",
        sourceLink: item.sourceLink || "",
      });
      added += 1;
    }
  }
  return added;
}

function isBotBlockedHtml(html) {
  const lower = html.toLowerCase();
  return (
    lower.includes("cf-browser-verification") ||
    lower.includes("attention required! | cloudflare") ||
    lower.includes("just a moment...") ||
    lower.includes("g-recaptcha") ||
    lower.includes("hcaptcha") ||
    lower.includes("access denied")
  );
}

function extractContactFromHtml(html) {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  let email = "";
  const mailtoMatch = stripped.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (mailtoMatch) {
    email = mailtoMatch[1];
  } else {
    const emailMatches =
      stripped.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    for (const candidate of emailMatches) {
      const lower = candidate.toLowerCase();
      if (
        !lower.endsWith(".png") &&
        !lower.endsWith(".jpg") &&
        !lower.endsWith(".webp") &&
        !lower.endsWith(".svg") &&
        !lower.includes("sentry.io")
      ) {
        email = candidate;
        break;
      }
    }
  }

  let number = "";
  const telMatch = stripped.match(/tel:([+\d().\-\s]{7,20})/i);
  if (telMatch) {
    const digits = telMatch[1].replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) {
      number = telMatch[1].trim();
    }
  } else {
    const textOnly = stripped.replace(/<[^>]+>/g, " ");
    const phoneMatch =
      textOnly.match(/(?:(?:\+91|91|0)[-.\s]?)?[6-9]\d{4}[-.\s]?\d{5}\b/) ||
      textOnly.match(/\+\d{1,4}[-.\s]?\(?\d{1,5}\)?[-.\s]?\d{2,5}[-.\s]?\d{2,5}\b/) ||
      textOnly.match(/(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/);
    if (phoneMatch) {
      const digits = phoneMatch[0].replace(/\D/g, "");
      if (digits.length >= 8 && digits.length <= 15) {
        number = phoneMatch[0].trim();
      }
    }
  }

  return { email, number };
}

async function enrichLinkedPages() {
  if (!state.scanLinkedPages || !state.isRunning) return;

  const targets = state.leads.filter(
    (l) =>
      l.sourceLink &&
      /^https?:\/\//i.test(l.sourceLink) &&
      !l.sourceLink.includes("google.com/") &&
      (!l.email || !l.number)
  );

  for (const lead of targets) {
    if (!state.isRunning) break;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(lead.sourceLink, {
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timer);

      if (!res.ok) {
        if ([403, 429, 503].includes(res.status)) {
          state.skippedBlocked += 1;
        }
        continue;
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) continue;

      const html = await res.text();
      if (isBotBlockedHtml(html)) {
        state.skippedBlocked += 1;
        continue;
      }

      const found = extractContactFromHtml(html);
      let updated = false;
      if (!lead.email && found.email) {
        lead.email = found.email;
        updated = true;
      }
      if (!lead.number && found.number) {
        lead.number = found.number;
        updated = true;
      }
      if (updated) {
        broadcastState();
      }
    } catch {
      state.skippedBlocked += 1;
    }
  }
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "PING_CONTENT" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
  }
}

async function runScrapeStep(idleRounds = 0) {
  if (!state.isRunning || !state.tabId) return;

  if (state.leads.length >= MAX_LEADS) {
    state.isRunning = false;
    state.statusText = `Reached ${MAX_LEADS} lead limit.`;
    broadcastState();
    return;
  }

  try {
    await ensureContentScript(state.tabId);
    const extractRes = await chrome.tabs.sendMessage(state.tabId, {
      type: "EXTRACT_PAGE",
    });

    const added = mergeLeads(extractRes?.leads || []);
    if (added > 0) {
      state.statusText = `Collected ${state.leads.length} / ${MAX_LEADS} leads (Page ${state.pageCount}).`;
      broadcastState();
      if (state.scanLinkedPages) {
        enrichLinkedPages();
      }
    }

    if (state.leads.length >= MAX_LEADS || !state.isRunning) {
      state.isRunning = false;
      state.statusText = `Stopped at ${state.leads.length} leads.`;
      broadcastState();
      return;
    }

    // Attempt scroll or click Next page automatically
    const navRes = await chrome.tabs.sendMessage(state.tabId, {
      type: "SCROLL_OR_NEXT",
    });

    if (!state.isRunning) return;

    if (navRes?.action === "scrolled") {
      const extraAdded = mergeLeads(navRes.leads || []);
      if (extraAdded > 0) {
        state.statusText = `Collected ${state.leads.length} / ${MAX_LEADS} leads (Page ${state.pageCount}).`;
        broadcastState();
        if (state.scanLinkedPages) {
          enrichLinkedPages();
        }
        setTimeout(() => runScrapeStep(0), 600);
      } else if (idleRounds < 2) {
        setTimeout(() => runScrapeStep(idleRounds + 1), 800);
      } else {
        setTimeout(() => runScrapeStep(idleRounds + 1), 500);
      }
      return;
    }

    if (navRes?.action === "clicked_next") {
      state.pageCount += 1;
      state.statusText = `Loading page ${state.pageCount}...`;
      broadcastState();
      setTimeout(() => runScrapeStep(0), 1600);
      return;
    }

    if (navRes?.action === "navigating") {
      state.pageCount += 1;
      state.statusText = `Switching to page ${state.pageCount}...`;
      broadcastState();
      // chrome.tabs.onUpdated listener will resume runScrapeStep when navigation finishes
      return;
    }

    // No more pages or scroll remaining
    state.isRunning = false;
    state.statusText = `Finished. Collected ${state.leads.length} leads across ${state.pageCount} page(s).`;
    broadcastState();
  } catch (err) {
    state.isRunning = false;
    state.errorText =
      "Cannot read this page. Try a standard webpage, search page, or map listing.";
    state.statusText = "Scraping stopped.";
    broadcastState();
  }
}

// Resume auto-pagination if a Next link triggered a full page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (
    state.isRunning &&
    tabId === state.tabId &&
    changeInfo.status === "complete"
  ) {
    setTimeout(() => {
      if (state.isRunning && state.tabId === tabId) {
        runScrapeStep(0);
      }
    }, 1200);
  }
});

async function deliverLeadsToOutflow(leads, targetUrl) {
  const cleanTarget = (targetUrl || state.outflowUrl || "").replace(/\/$/, "");
  if (!cleanTarget) {
    throw new Error("Please set your Outflow App URL first.");
  }

  let originPrefix = cleanTarget;
  try {
    originPrefix = new URL(cleanTarget).origin;
  } catch {
    throw new Error("Invalid Outflow App URL.");
  }

  const allTabs = await chrome.tabs.query({});
  const existingTab = allTabs.find(
    (t) => t.url && t.url.startsWith(originPrefix)
  );

  const injectLeads = (tabId, batch) =>
    chrome.scripting.executeScript({
      target: { tabId },
      func: (items) => {
        window.postMessage(
          { type: "OUTFLOW_EXTENSION_IMPORT", leads: items },
          "*"
        );
        window.dispatchEvent(
          new CustomEvent("outflow:extension-leads", { detail: { leads: items } })
        );
      },
      args: [batch],
    });

  if (existingTab?.id) {
    await chrome.tabs.update(existingTab.id, { active: true });
    if (existingTab.windowId) {
      await chrome.windows.update(existingTab.windowId, { focused: true });
    }
    await injectLeads(existingTab.id, leads);
    return;
  }

  const created = await chrome.tabs.create({ url: cleanTarget });
  if (!created?.id) return;

  const onLoaded = (tabId, changeInfo) => {
    if (tabId === created.id && changeInfo.status === "complete") {
      chrome.tabs.onUpdated.removeListener(onLoaded);
      setTimeout(() => {
        injectLeads(created.id, leads).catch(() => {});
      }, 800);
    }
  };
  chrome.tabs.onUpdated.addListener(onLoaded);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "GET_STATE") {
    sendResponse({
      isRunning: state.isRunning,
      pageCount: state.pageCount,
      leads: state.leads,
      skippedBlocked: state.skippedBlocked,
      scanLinkedPages: state.scanLinkedPages,
      outflowUrl: state.outflowUrl,
      statusText: state.statusText,
      errorText: state.errorText,
      maxLeads: MAX_LEADS,
    });
    return;
  }

  if (msg.type === "START_SCRAPE") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const active = tabs[0];
      if (!active?.id || !active.url || active.url.startsWith("chrome://")) {
        state.errorText = "Open a website or search page before scraping.";
        broadcastState();
        sendResponse({ ok: false });
        return;
      }

      state.isRunning = true;
      state.tabId = active.id;
      state.pageCount = 1;
      state.leads = [];
      state.leadKeys = new Set();
      state.skippedBlocked = 0;
      state.errorText = "";
      state.statusText = "Scanning current page...";
      broadcastState();
      runScrapeStep(0);
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "STOP_SCRAPE") {
    state.isRunning = false;
    state.statusText = `Stopped manually (${state.leads.length} leads).`;
    broadcastState();
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === "CLEAR_LEADS") {
    state.isRunning = false;
    state.leads = [];
    state.leadKeys = new Set();
    state.skippedBlocked = 0;
    state.pageCount = 1;
    state.errorText = "";
    state.statusText = "Ready to extract leads from the open page.";
    broadcastState();
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === "REMOVE_LEAD") {
    state.leads = state.leads.filter((l) => l.id !== msg.id);
    broadcastState();
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === "SET_PREFS") {
    if (typeof msg.scanLinkedPages === "boolean") {
      state.scanLinkedPages = msg.scanLinkedPages;
      chrome.storage.local.set({ scanLinkedPages: msg.scanLinkedPages });
    }
    if (typeof msg.outflowUrl === "string") {
      state.outflowUrl = msg.outflowUrl.trim();
      chrome.storage.local.set({ outflowUrl: state.outflowUrl });
    }
    broadcastState();
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === "SEND_TO_OUTFLOW") {
    deliverLeadsToOutflow(state.leads, msg.outflowUrl || state.outflowUrl)
      .then(() => sendResponse({ ok: true }))
      .catch((err) =>
        sendResponse({ ok: false, error: err?.message || "Failed to send." })
      );
    return true;
  }
});
