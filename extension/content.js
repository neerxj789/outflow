(() => {
  if (window.__OUTFLOW_CONTENT_LOADED__) return;
  window.__OUTFLOW_CONTENT_LOADED__ = true;

  function cleanText(str) {
    return (str || "").replace(/\s+/g, " ").trim();
  }

  function unwrapRedirectUrl(rawHref) {
    if (!rawHref || typeof rawHref !== "string") return "";
    const trimmed = rawHref.trim();
    if (
      !trimmed ||
      trimmed.startsWith("javascript:") ||
      trimmed.startsWith("mailto:") ||
      trimmed.startsWith("tel:") ||
      trimmed.startsWith("#")
    ) {
      return "";
    }

    try {
      const parsed = new URL(trimmed, window.location.href);
      if (
        (parsed.hostname.includes("google.") && parsed.pathname === "/url") ||
        parsed.searchParams.has("q") ||
        parsed.searchParams.has("url")
      ) {
        const target =
          parsed.searchParams.get("q") || parsed.searchParams.get("url");
        if (target && /^https?:\/\//i.test(target)) {
          return target;
        }
      }
      return parsed.href;
    } catch {
      return "";
    }
  }

  function isIgnoredLink(url) {
    if (!url) return true;
    const u = url.toLowerCase();
    return (
      u.includes("google.com/maps/dir") ||
      u.includes("/maps/dir/") ||
      u.includes("gstatic.com") ||
      u.includes("googleusercontent.com") ||
      u.includes("accounts.google.") ||
      u.includes("support.google.") ||
      u.includes("policies.google.") ||
      u.includes("schema.org") ||
      u.includes("w3.org") ||
      u.startsWith("chrome-extension://")
    );
  }

  function extractEmailFromText(text) {
    if (!text) return "";
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (!match) return "";
    for (const candidate of match) {
      const lower = candidate.toLowerCase();
      if (
        !lower.endsWith(".png") &&
        !lower.endsWith(".jpg") &&
        !lower.endsWith(".jpeg") &&
        !lower.endsWith(".webp") &&
        !lower.endsWith(".svg") &&
        !lower.includes("sentry.io") &&
        !lower.includes("example.com")
      ) {
        return candidate;
      }
    }
    return "";
  }

  function extractPhoneFromText(text) {
    if (!text) return "";
    const trimmed = text.trim();
    if (/^https?:\/\//i.test(trimmed)) return "";

    const segments = trimmed
      .split(/[\u00b7\u2022|\n\r]/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const seg of segments) {
      if (!/[a-zA-Z]{5,}/.test(seg)) {
        const digits = seg.replace(/\D/g, "");
        if (digits.length >= 8 && digits.length <= 15 && !/^\d{4}$/.test(digits)) {
          return seg;
        }
      }
    }

    const indianMobile = trimmed.match(
      /(?:(?:\+91|91|0)[-.\s]?)?[6-9]\d{4}[-.\s]?\d{5}\b/
    );
    if (indianMobile) {
      const digits = indianMobile[0].replace(/\D/g, "");
      if (digits.length >= 10 && digits.length <= 12) return indianMobile[0].trim();
    }

    const landline = trimmed.match(/\b0\d{2,4}[-.\s]?\d{6,8}\b/);
    if (landline) {
      const digits = landline[0].replace(/\D/g, "");
      if (digits.length >= 8 && digits.length <= 12) return landline[0].trim();
    }

    const intlPlus = trimmed.match(
      /\+\d{1,4}[-.\s]?\(?\d{1,5}\)?[-.\s]?\d{2,5}[-.\s]?\d{2,5}\b/
    );
    if (intlPlus) {
      const digits = intlPlus[0].replace(/\D/g, "");
      if (digits.length >= 8 && digits.length <= 15) return intlPlus[0].trim();
    }

    const usPhone = trimmed.match(/(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/);
    if (usPhone) {
      const digits = usPhone[0].replace(/\D/g, "");
      if (digits.length === 10) return usPhone[0].trim();
    }

    return "";
  }

  function extractEmailFromElement(el) {
    const mailto = el.querySelector('a[href^="mailto:"]');
    if (mailto) {
      const addr = mailto
        .getAttribute("href")
        .replace(/^mailto:/i, "")
        .split("?")[0]
        .trim();
      if (addr.includes("@")) return addr;
    }
    return extractEmailFromText(el.innerText || el.textContent || "");
  }

  function extractPhoneFromElement(el) {
    const tel = el.querySelector('a[href^="tel:"]');
    if (tel) {
      const num = tel.getAttribute("href").replace(/^tel:/i, "").trim();
      if (num.replace(/\D/g, "").length >= 7) return num;
    }
    return extractPhoneFromText(el.innerText || el.textContent || "");
  }

  function extractSourceLinkFromElement(el) {
    const anchors = Array.from(el.querySelectorAll("a[href]"));
    let fallbackListingUrl = "";

    for (const a of anchors) {
      const raw = a.getAttribute("href") || "";
      const url = unwrapRedirectUrl(raw);
      if (!url || isIgnoredLink(url)) continue;

      const lower = url.toLowerCase();
      // Prefer external business websites over search engine or map wrapper links
      if (
        !lower.includes("google.com/search") &&
        !lower.includes("google.com/maps") &&
        !lower.includes("bing.com/search")
      ) {
        return url;
      }

      if (!fallbackListingUrl && lower.includes("/maps/place/")) {
        fallbackListingUrl = url;
      }
    }

    if (fallbackListingUrl) return fallbackListingUrl;

    if (el.tagName === "A" && el.getAttribute("href")) {
      const direct = unwrapRedirectUrl(el.getAttribute("href"));
      if (direct && !isIgnoredLink(direct)) return direct;
    }

    return "";
  }

  function extractNameFromElement(el) {
    // Google Maps place card anchor aria-label
    const mapAnchor = el.querySelector("a.hfpxzc[aria-label]");
    if (mapAnchor) {
      const label = cleanText(mapAnchor.getAttribute("aria-label"));
      if (label.length >= 2) return label;
    }

    const heading = el.querySelector("h1, h2, h3, h4, [role='heading']");
    if (heading) {
      const text = cleanText(heading.innerText || heading.textContent);
      if (text.length >= 2 && text.length <= 140) return text;
    }

    const primaryLink = el.querySelector("a[href]");
    if (primaryLink) {
      const linkText = cleanText(
        primaryLink.innerText || primaryLink.textContent
      );
      if (
        linkText.length >= 2 &&
        linkText.length <= 120 &&
        !/^https?:\/\//i.test(linkText) &&
        linkText.toLowerCase() !== "website" &&
        linkText.toLowerCase() !== "directions"
      ) {
        return linkText;
      }
    }

    const lines = (el.innerText || el.textContent || "")
      .split("\n")
      .map((l) => cleanText(l))
      .filter(Boolean);

    for (const line of lines) {
      if (
        line.length >= 2 &&
        line.length <= 120 &&
        !/^[\d.]+(\s*\(\d+\))?$/.test(line) &&
        !line.startsWith("http") &&
        !line.includes("@") &&
        /[a-zA-Z]/.test(line)
      ) {
        return line;
      }
    }

    return "";
  }

  function findCandidateContainers() {
    const candidates = new Set();

    // 1. Google Maps feed items
    const mapCards = document.querySelectorAll('[role="feed"] > div');
    mapCards.forEach((node) => {
      if (node.querySelector("a[href]")) candidates.add(node);
    });

    // 2. Google Search result blocks
    const searchBlocks = document.querySelectorAll(
      "div.g, div[data-sokoban-container], div.MjjYud > div"
    );
    searchBlocks.forEach((node) => {
      if (node.querySelector("a[href]") && node.querySelector("h3")) {
        candidates.add(node);
      }
    });

    // 3. Semantic tables, articles, list items
    if (candidates.size < 3) {
      document.querySelectorAll("table tbody tr").forEach((tr) => {
        if (cleanText(tr.innerText).length > 3) candidates.add(tr);
      });
    }

    // 4. Generic repeating sibling detector (works on directories, listings, any link list)
    if (candidates.size < 3) {
      const allParents = document.querySelectorAll(
        "main, section, ul, ol, div"
      );
      let bestGroup = [];
      let bestScore = 0;

      for (const parent of allParents) {
        const children = Array.from(parent.children).filter(
          (ch) =>
            ch.offsetParent !== null &&
            !["SCRIPT", "STYLE", "NAV", "HEADER", "FOOTER"].includes(ch.tagName)
        );
        if (children.length < 3 || children.length > 250) continue;

        const withLinks = children.filter((ch) => {
          const text = cleanText(ch.innerText);
          return (
            text.length >= 5 &&
            text.length <= 1200 &&
            (ch.querySelector("a[href]") || ch.tagName === "A")
          );
        });

        if (withLinks.length >= 3 && withLinks.length > bestScore) {
          bestScore = withLinks.length;
          bestGroup = withLinks;
        }
      }

      bestGroup.forEach((n) => candidates.add(n));
    }

    return Array.from(candidates);
  }

  function extractVisibleLeads() {
    const containers = findCandidateContainers();
    const extracted = [];

    for (const el of containers) {
      const name = extractNameFromElement(el);
      const email = extractEmailFromElement(el);
      const number = extractPhoneFromElement(el);
      const sourceLink = extractSourceLinkFromElement(el);

      if (!name && !email && !number) continue;
      if (!sourceLink && !email && !number) continue;

      extracted.push({
        name: name || sourceLink || email || number,
        email: email || "",
        number: number || "",
        sourceLink: sourceLink || window.location.href,
      });
    }

    // Fallback: single website / contact page open
    if (extracted.length === 0) {
      const pageEmail = extractEmailFromElement(document.body);
      const pagePhone = extractPhoneFromElement(document.body);
      const pageTitle = cleanText(
        document.querySelector("h1")?.innerText || document.title
      ).slice(0, 100);

      if (pageEmail || pagePhone) {
        extracted.push({
          name: pageTitle || window.location.hostname,
          email: pageEmail,
          number: pagePhone,
          sourceLink: window.location.href,
        });
      }
    }

    return extracted;
  }

  function scrollResultsContainer() {
    const feed = document.querySelector('[role="feed"]');
    if (feed && feed.scrollHeight > feed.clientHeight + 20) {
      const prevTop = feed.scrollTop;
      feed.scrollTop = Math.min(
        feed.scrollTop + feed.clientHeight * 1.4,
        feed.scrollHeight
      );
      return feed.scrollTop > prevTop + 5;
    }

    const prevY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    if (prevY + window.innerHeight < docHeight - 20) {
      window.scrollTo({
        top: Math.min(prevY + window.innerHeight * 0.9, docHeight),
        behavior: "smooth",
      });
      return true;
    }
    return false;
  }

  function findNextPageButton() {
    const selectors = [
      "a#pnnext",
      'a[rel="next"]',
      'a[aria-label*="Next" i]',
      'button[aria-label*="Next" i]',
      '[data-testid*="next" i]',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (
        el &&
        el.offsetParent !== null &&
        !el.hasAttribute("disabled") &&
        el.getAttribute("aria-disabled") !== "true"
      ) {
        return el;
      }
    }

    const clickables = Array.from(document.querySelectorAll("a, button"));
    for (const el of clickables) {
      if (
        el.offsetParent === null ||
        el.hasAttribute("disabled") ||
        el.getAttribute("aria-disabled") === "true"
      ) {
        continue;
      }
      const text = cleanText(el.innerText).toLowerCase();
      if (
        text === "next" ||
        text === "next page" ||
        text === "next ›" ||
        text === "›" ||
        text === "»"
      ) {
        return el;
      }
    }

    return null;
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "PING_CONTENT") {
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "EXTRACT_PAGE") {
      const leads = extractVisibleLeads();
      sendResponse({ leads, url: window.location.href });
      return;
    }

    if (msg.type === "SCROLL_OR_NEXT") {
      const didScroll = scrollResultsContainer();
      if (didScroll) {
        setTimeout(() => {
          const leads = extractVisibleLeads();
          sendResponse({ action: "scrolled", leads });
        }, 900);
        return true;
      }

      const nextBtn = findNextPageButton();
      if (nextBtn) {
        const href =
          nextBtn.tagName === "A" ? nextBtn.getAttribute("href") : null;
        nextBtn.scrollIntoView({ block: "center" });
        nextBtn.click();
        sendResponse({
          action: href && !href.startsWith("#") ? "navigating" : "clicked_next",
        });
        return;
      }

      sendResponse({ action: "done" });
    }
  });
})();
