import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Business, TabData } from "../types/outflow";

export function extractPhone(text: string): string {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();

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

  const segments = trimmed
    .split(/[\u00b7\u2022|\n\r]/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const seg of segments) {
    if (!/[a-zA-Z]{5,}/.test(seg)) {
      const digitsOnly = seg.replace(/\D/g, "");
      if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
        return seg.trim();
      }
    }
  }

  const indianMobileMatch = trimmed.match(
    /(?:(?:\+91|91|0)[-.\s]?)?[6-9]\d{4}[-.\s]?\d{5}\b/
  );
  if (indianMobileMatch) {
    const digitsOnly = indianMobileMatch[0].replace(/\D/g, "");
    if (digitsOnly.length >= 10 && digitsOnly.length <= 12) {
      return indianMobileMatch[0].trim();
    }
  }

  const landlineMatch = trimmed.match(/\b0\d{2,4}[-.\s]?\d{6,8}\b/);
  if (landlineMatch) {
    const digitsOnly = landlineMatch[0].replace(/\D/g, "");
    if (digitsOnly.length >= 8 && digitsOnly.length <= 12) {
      return landlineMatch[0].trim();
    }
  }

  const intlPlusMatch = trimmed.match(
    /\+\d{1,4}[-.\s]?\(?\d{1,5}\)?[-.\s]?\d{2,5}[-.\s]?\d{2,5}\b/
  );
  if (intlPlusMatch) {
    const digitsOnly = intlPlusMatch[0].replace(/\D/g, "");
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      return intlPlusMatch[0].trim();
    }
  }

  const stdMatch = trimmed.match(/(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/);
  if (stdMatch) {
    const digitsOnly = stdMatch[0].replace(/\D/g, "");
    if (digitsOnly.length === 10) {
      return stdMatch[0].trim();
    }
  }

  return "";
}

export function isGoogleOrMapsUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const u = url.toLowerCase().trim();
  if (u.includes("/maps/place/")) {
    return false;
  }
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

export function extractWebsite(text: string): string {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();

  if (isGoogleOrMapsUrl(trimmed)) {
    return "";
  }

  const urlRegex =
    /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/i;
  const match = trimmed.match(urlRegex);
  if (match) {
    const url = match[0];
    if (!isGoogleOrMapsUrl(url)) {
      return url;
    }
  }

  const domainRegex =
    /\b(?:www\.)[a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.[a-zA-Z]{2,10}(?:\/[^\s]*)?/i;
  const domainMatch = trimmed.match(domainRegex);
  if (domainMatch) {
    const domainUrl = `https://${domainMatch[0]}`;
    if (!isGoogleOrMapsUrl(domainUrl)) {
      return domainUrl;
    }
  }

  return "";
}

export function extractEmail(text: string): string {
  if (!text || typeof text !== "string") return "";
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : "";
}

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
  return (
    first === "name" ||
    first === "business name" ||
    first === "company" ||
    first === "title" ||
    first === "osrxxb"
  );
}

export function extractBusinesses(input: string): Business[] {
  const results: Business[] = [];
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Please enter or paste data to parse.");
  }

  let isJson = false;
  try {
    const data = JSON.parse(trimmed);
    isJson = true;

    const traverse = (obj: unknown) => {
      if (Array.isArray(obj)) {
        obj.forEach(traverse);
      } else if (obj !== null && typeof obj === "object") {
        let name = "";
        let email = "";
        let website = "";
        let number = "";

        for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
          if (typeof val === "string" || typeof val === "number") {
            const strVal = String(val).trim();
            const lowerKey = key.toLowerCase();

            if (
              !name &&
              [
                "name",
                "title",
                "company",
                "business",
                "organization",
                "osrxxb",
                "qbf1pd",
              ].some((k) => lowerKey.includes(k))
            ) {
              if (
                strVal.length >= 2 &&
                !strVal.startsWith("http") &&
                !strVal.startsWith("·")
              ) {
                name = strVal;
              }
            }

            if (!email) email = extractEmail(strVal);
            if (!website) website = extractWebsite(strVal);
            if (!number) number = extractPhone(strVal);
          }
        }

        if (!name) {
          for (const [, val] of Object.entries(obj as Record<string, unknown>)) {
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
          if (
            name &&
            (email || website || number || Object.keys(obj).length >= 2)
          ) {
            const cleanWebsite =
              website && !isGoogleOrMapsUrl(website) ? website : "";
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
  } catch {
    // Fallback to tabular parsing
  }

  if (!isJson || results.length === 0) {
    const parsed = Papa.parse(trimmed, {
      skipEmptyLines: true,
    });

    const rows = parsed.data as string[][];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length === 0) continue;
      const cleanCells = row.map((c) => String(c ?? "").trim()).filter(Boolean);
      if (cleanCells.length === 0) continue;
      if (isHeaderRow(cleanCells)) continue;

      let name = "";
      let email = "";
      let website = "";
      let phone = "";

      for (const cell of cleanCells) {
        if (!email) email = extractEmail(cell);
        if (!website) website = extractWebsite(cell);
        if (!phone) phone = extractPhone(cell);
      }

      const firstCell = cleanCells[0];
      const isFirstCellPhone = !!extractPhone(firstCell);
      const isFirstCellUrl =
        firstCell.startsWith("http") || !!extractWebsite(firstCell);
      const isFirstCellEmail = firstCell.includes("@");
      const isFirstCellRating = /^[\d.]+(\s*\(\d+\))?$/.test(firstCell);
      const isFirstCellHours =
        firstCell.toLowerCase().includes("open") ||
        firstCell.toLowerCase().includes("close");
      const isFirstCellBadge =
        firstCell.startsWith("·") ||
        firstCell.toLowerCase() === "website" ||
        firstCell.toLowerCase() === "directions";

      if (
        !isFirstCellPhone &&
        !isFirstCellUrl &&
        !isFirstCellEmail &&
        !isFirstCellRating &&
        !isFirstCellHours &&
        !isFirstCellBadge &&
        firstCell.length >= 2
      ) {
        name = firstCell;
      } else {
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
        const cleanWebsite =
          website && !isGoogleOrMapsUrl(website) ? website : "";
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
    throw new Error(
      "No valid business data found. Paste raw TSV, CSV, or JSON rows."
    );
  }

  const unique = new Map<string, Business>();
  results.forEach((b) => {
    const key = `${b.name.toLowerCase()}-${b.number}-${b.website}-${b.email}`;
    if (!unique.has(key)) {
      unique.set(key, b);
    }
  });

  return Array.from(unique.values());
}

export function exportBusinessesToCSV(tab: TabData, rows: Business[]) {
  if (rows.length === 0) return;

  const headers = [
    "Name",
    "Status",
    "Mobile Number",
    "Website",
    "Email",
    "Follow Up Date",
  ];
  const csvContent = [
    headers.join(","),
    ...rows.map((b) => {
      const cleanWebsite =
        b.website && !isGoogleOrMapsUrl(b.website) ? b.website : "";
      return [
        `"${(b.name || "").replace(/"/g, '""')}"`,
        `"${(b.status || "New").replace(/"/g, '""')}"`,
        `"${(b.number || "").replace(/"/g, '""')}"`,
        `"${cleanWebsite.replace(/"/g, '""')}"`,
        `"${(b.email || "").replace(/"/g, '""')}"`,
        `"${(b.followUpDate || "").replace(/"/g, '""')}"`,
      ].join(",");
    }),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${tab.name.replace(/\s+/g, "_")}_outreach_contacts.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportBusinessesToPDF(tab: TabData, rows: Business[]) {
  if (rows.length === 0) return;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`Outflow - ${tab.name} Outreach Leads`, 40, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const withPhoneCount = rows.filter((b) => b.number && b.number.trim()).length;
  doc.text(
    `Generated: ${dateStr} · Total Leads: ${rows.length} · Mobile Numbers: ${withPhoneCount}`,
    40,
    58
  );

  const tableData = rows.map((b, i) => [
    i + 1,
    b.name || "",
    b.status || "New",
    b.number || "-",
    b.website && !isGoogleOrMapsUrl(b.website) ? b.website : "-",
    b.email || "-",
    b.followUpDate || "-",
  ]);

  autoTable(doc, {
    startY: 72,
    head: [
      [
        "#",
        "Business Name",
        "Status",
        "Mobile Number",
        "Website",
        "Email",
        "Follow Up",
      ],
    ],
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [30, 30, 30],
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 25, halign: "center" },
      1: { cellWidth: 160, fontStyle: "bold" },
      2: { cellWidth: 70, halign: "center" },
      3: { cellWidth: 110 },
      4: { cellWidth: 165 },
      5: { cellWidth: 165 },
      6: { cellWidth: 75 },
    },
    alternateRowStyles: {
      fillColor: [247, 247, 247],
    },
    margin: { left: 40, right: 40, bottom: 40 },
  });

  doc.save(`${tab.name.replace(/\s+/g, "_")}_outreach_leads.pdf`);
}
