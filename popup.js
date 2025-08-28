/* global chrome */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const defaultsKey = "proxfind-defaults";

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

function getOptionsFromUI() {
  const terms = ($("#terms").value || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  return {
    terms,
    maxWordsBetween: Math.max(0, parseInt($("#maxWords").value || "0", 10)),
    wholeWord: $("#wholeWord").checked,
    caseSensitive: $("#caseSensitive").checked,
    orderMatters: $("#orderMatters").checked,
    highlight: $("#highlight").checked,
    sameBlock: $("#sameBlock").checked
  };
}

function applyOptionsToUI(opts) {
  $("#terms").value = (opts.terms || []).join(", ");
  $("#maxWords").value = opts.maxWordsBetween ?? 10;
  $("#wholeWord").checked = !!opts.wholeWord;
  $("#caseSensitive").checked = !!opts.caseSensitive;
  $("#orderMatters").checked = !!opts.orderMatters;
  $("#highlight").checked = !!opts.highlight;
  $("#sameBlock").checked = !!opts.sameBlock;
}

async function loadDefaults() {
  const { [defaultsKey]: saved } = await chrome.storage.sync.get(defaultsKey);
  if (saved) applyOptionsToUI(saved);
}

async function saveDefaults() {
  const opts = getOptionsFromUI();
  await chrome.storage.sync.set({ [defaultsKey]: opts });
}

function renderResults(items) {
  const container = $("#results");
  container.innerHTML = "";
  if (!items || !items.length) {
    container.innerHTML = `<div class="empty">No proximity matches found.</div>`;
    return;
  }
  for (const r of items) {
    const div = document.createElement("div");
    div.className = "result";
    const meta = document.createElement("div");
    meta.className = "meta";
    const words = r.betweenWords === 0 ? "adjacent" : `${r.betweenWords} word${r.betweenWords===1?"":"s"} between`;
    meta.textContent = `${r.tag} • ${words}`;
    const snip = document.createElement("div");
    snip.className = "snippet";
    snip.innerHTML = r.snippetHTML;
    div.append(meta, snip);
    div.addEventListener("click", async () => {
      const tabId = await getActiveTabId();
      chrome.tabs.sendMessage(tabId, { type: "proxfind.scrollTo", id: r.elementId });
    });
    container.appendChild(div);
  }
}

async function search() {
  const tabId = await getActiveTabId();
  if (!tabId) return;
  const options = getOptionsFromUI();
  if (!options.terms.length) {
    $("#results").innerHTML = `<div class="error">Enter at least one term.</div>`;
    return;
  }
  chrome.tabs.sendMessage(tabId, { type: "proxfind.search", options }, (resp) => {
    if (chrome.runtime.lastError) {
      $("#results").innerHTML = `<div class="error">${chrome.runtime.lastError.message}</div>`;
      return;
    }
    renderResults(resp?.results || []);
  });
}

async function clearHighlights() {
  const tabId = await getActiveTabId();
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, { type: "proxfind.clear" });
  $("#results").innerHTML = `<div class="empty">Cleared. Ready for a new search.</div>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadDefaults();

  $("#searchBtn").addEventListener("click", search);
  $("#clearBtn").addEventListener("click", clearHighlights);
  $("#saveDefaults").addEventListener("click", async (e) => {
    e.preventDefault();
    await saveDefaults();
    e.target.textContent = "Saved!";
    setTimeout(() => (e.target.textContent = "Save these as defaults"), 1200);
  });

  // Enter to search
  $("#terms").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); search(); }
  });
});
