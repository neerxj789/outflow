const counterEl = document.getElementById("counter");
const outflowUrlInput = document.getElementById("outflow-url");
const scanLinksCheckbox = document.getElementById("scan-links");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const clearBtn = document.getElementById("clear-btn");
const statusBar = document.getElementById("status-bar");
const errorBar = document.getElementById("error-bar");
const pageIndicator = document.getElementById("page-indicator");
const emptyState = document.getElementById("empty-state");
const tableWrap = document.getElementById("table-wrap");
const leadsBody = document.getElementById("leads-body");
const copyCsvBtn = document.getElementById("copy-csv-btn");
const downloadCsvBtn = document.getElementById("download-csv-btn");
const sendOutflowBtn = document.getElementById("send-outflow-btn");

let currentLeads = [];

function toCsv(leads) {
  const headers = ["Name", "Mobile Number", "Email", "Source Link"];
  const rows = leads.map((l) =>
    [
      `"${(l.name || "").replace(/"/g, '""')}"`,
      `"${(l.number || "").replace(/"/g, '""')}"`,
      `"${(l.email || "").replace(/"/g, '""')}"`,
      `"${(l.sourceLink || "").replace(/"/g, '""')}"`,
    ].join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function renderState(data) {
  if (!data) return;
  currentLeads = data.leads || [];
  const maxLeads = data.maxLeads || 200;

  counterEl.textContent = `${currentLeads.length} / ${maxLeads}`;
  pageIndicator.textContent = `Page ${data.pageCount || 1}`;

  if (document.activeElement !== outflowUrlInput && data.outflowUrl) {
    outflowUrlInput.value = data.outflowUrl;
  }
  scanLinksCheckbox.checked = Boolean(data.scanLinkedPages);

  startBtn.hidden = Boolean(data.isRunning);
  stopBtn.hidden = !data.isRunning;

  const extraSkip =
    data.skippedBlocked > 0
      ? ` · Skipped ${data.skippedBlocked} protected site(s)`
      : "";
  statusBar.textContent = (data.statusText || "") + extraSkip;

  if (data.errorText) {
    errorBar.hidden = false;
    errorBar.textContent = data.errorText;
  } else {
    errorBar.hidden = true;
    errorBar.textContent = "";
  }

  const hasLeads = currentLeads.length > 0;
  emptyState.hidden = hasLeads;
  tableWrap.hidden = !hasLeads;
  copyCsvBtn.disabled = !hasLeads;
  downloadCsvBtn.disabled = !hasLeads;
  sendOutflowBtn.disabled = !hasLeads;

  leadsBody.innerHTML = "";
  for (const lead of currentLeads) {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.textContent = lead.name || "-";
    nameTd.title = lead.name || "";

    const numTd = document.createElement("td");
    numTd.className = "mono";
    numTd.textContent = lead.number || "-";
    numTd.title = lead.number || "";

    const emailTd = document.createElement("td");
    emailTd.textContent = lead.email || "-";
    emailTd.title = lead.email || "";

    const linkTd = document.createElement("td");
    if (lead.sourceLink) {
      const a = document.createElement("a");
      a.href = lead.sourceLink;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = lead.sourceLink.replace(/^https?:\/\/(www\.)?/, "");
      a.title = lead.sourceLink;
      linkTd.appendChild(a);
    } else {
      linkTd.textContent = "-";
    }

    const actionTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "remove-btn";
    delBtn.textContent = "Remove";
    delBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "REMOVE_LEAD", id: lead.id });
    });
    actionTd.appendChild(delBtn);

    tr.append(nameTd, numTd, emailTd, linkTd, actionTd);
    leadsBody.appendChild(tr);
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "SCRAPE_STATE") {
    renderState(msg.payload);
  }
});

chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
  if (res) renderState(res);
});

outflowUrlInput.addEventListener("change", () => {
  chrome.runtime.sendMessage({
    type: "SET_PREFS",
    outflowUrl: outflowUrlInput.value,
  });
});

scanLinksCheckbox.addEventListener("change", () => {
  chrome.runtime.sendMessage({
    type: "SET_PREFS",
    scanLinkedPages: scanLinksCheckbox.checked,
  });
});

startBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "START_SCRAPE" });
});

stopBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "STOP_SCRAPE" });
});

clearBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CLEAR_LEADS" });
});

copyCsvBtn.addEventListener("click", async () => {
  if (currentLeads.length === 0) return;
  try {
    await navigator.clipboard.writeText(toCsv(currentLeads));
    statusBar.textContent = `Copied ${currentLeads.length} leads as CSV.`;
  } catch {
    errorBar.hidden = false;
    errorBar.textContent = "Clipboard permission denied.";
  }
});

downloadCsvBtn.addEventListener("click", () => {
  if (currentLeads.length === 0) return;
  const blob = new Blob([toCsv(currentLeads)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "outflow_scraped_leads.csv";
  a.click();
  URL.revokeObjectURL(url);
});

sendOutflowBtn.addEventListener("click", () => {
  if (currentLeads.length === 0) return;
  const targetUrl = outflowUrlInput.value.trim();
  chrome.runtime.sendMessage(
    { type: "SEND_TO_OUTFLOW", outflowUrl: targetUrl },
    (res) => {
      if (res?.ok) {
        statusBar.textContent = `Sent ${currentLeads.length} leads to Outflow.`;
      } else {
        errorBar.hidden = false;
        errorBar.textContent = res?.error || "Could not reach Outflow tab.";
      }
    }
  );
});
