// ProxFind content script
(function(){
  const state = {
    lastResults: [],
    counter: 0
  };

  const BLOCK_SELECTOR = [
    "p","li","td","blockquote","pre","article","section",
    "h1","h2","h3","h4","h5","h6","dd","dt"
  ].join(",");

  function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function normalizeSpaces(str){
    return str.replace(/\s+/g, " ").trim();
  }

  function tokenize(text){
    // Produce tokens with char offsets, keeping original casing in text param.
    // Token = sequences of letters/numbers/underscore plus hyphen/apostrophe parts.
    const tokens = [];
    const re = /[A-Za-z0-9_]+(?:['’\-][A-Za-z0-9_]+)*/g;
    let m;
    while ((m = re.exec(text))){
      tokens.push({ token: m[0], start: m.index, end: m.index + m[0].length });
    }
    return tokens;
  }

  function findOccurrencesForTerms(tokens, terms, opts){
    // Return array occurrences per term index -> list of token indices
    const lc = !opts.caseSensitive;
    const whole = !!opts.wholeWord;
    const occurs = terms.map(() => []);

    for (let i=0;i<tokens.length;i++){
      const raw = tokens[i].token;
      const token = lc ? raw.toLowerCase() : raw;
      for (let tIdx=0;tIdx<terms.length;tIdx++){
        const query = lc ? terms[tIdx].toLowerCase() : terms[tIdx];
        let match = false;
        if (whole) {
          // exact token match
          match = token === query;
        } else {
          match = token.includes(query);
        }
        if (match) occurs[tIdx].push(i);
      }
    }
    return occurs;
  }

  function coverageWindows(occurs, maxWordsBetween, termsCount, orderMatters){
    // Build merged list of (termIndex, tokenIndex) and use sliding window to find coverage
    const merged = [];
    for (let t=0;t<occurs.length;t++){
      for (const idx of occurs[t]) merged.push({ t, i: idx });
    }
    merged.sort((a,b)=> a.i - b.i);
    const need = termsCount;
    const have = new Array(termsCount).fill(0);
    let covered = 0;
    let L = 0;
    const windows = [];

    for (let R=0; R<merged.length; R++){
      const r = merged[R];
      if (have[r.t] === 0) covered++;
      have[r.t]++;

      while (covered === need){
        const left = merged[L];
        const right = merged[R];
        const span = right.i - left.i; // tokens spanned including both
        const between = Math.max(0, span - (termsCount - 1)); // words between the terms if we assume one token per term

        let orderOK = true;
        if (orderMatters && termsCount >= 2){
          // require the earliest occurrence of each term to be in term order within this window
          // Simple heuristic: extract one occurrence per term in window (first instance of each term as we go)
          const seq = [];
          const seen = new Set();
          for (let k=L; k<=R; k++){
            const tk = merged[k].t;
            if (!seen.has(tk)) { seen.add(tk); seq.push(tk); }
          }
          // Check that seq is non-decreasing 0..n-1
          for (let z=0; z<seq.length; z++){
            if (seq[z] !== z){ orderOK = false; break; }
          }
        }

        if (between <= maxWordsBetween && orderOK){
          windows.push({ leftIndex: left.i, rightIndex: right.i, betweenWords: between });
        }
        // Shrink from left
        have[left.t]--;
        if (have[left.t] === 0) covered--;
        L++;
      }
    }
    return windows;
  }

  function getCandidates(sameBlock){
    if (!sameBlock){
      // If not restricted to blocks, search big containers to reduce overhead
      return [document.body];
    }
    const els = Array.from(document.querySelectorAll(BLOCK_SELECTOR));
    // include divs with lots of text as pseudo-blocks
    for (const div of Array.from(document.querySelectorAll("div"))) {
      const t = div.innerText || "";
      if (t && t.length > 120 && !els.includes(div)) els.push(div);
    }
    return els.filter(el => !!el && el.offsetParent !== null || el === document.body);
  }

  function ensureId(el){
    if (!el.dataset.proxId){
      el.dataset.proxId = "prox-" + (++state.counter);
    }
    return el.dataset.proxId;
  }

  function buildSnippet(text, start, end, terms, opts){
    const pad = 80;
    const s = Math.max(0, start - pad);
    const e = Math.min(text.length, end + pad);
    let snippet = text.slice(s, e);
    snippet = normalizeSpaces(snippet);
    // highlight terms in snippet (rough, not DOM)
    const flags = opts.caseSensitive ? "g" : "gi";
    for (const term of terms){
      const re = new RegExp(opts.wholeWord ? `\\b${escapeRegExp(term)}\\b` : escapeRegExp(term), flags);
      snippet = snippet.replace(re, (m)=>`<span class="mark">${m}</span>`);
    }
    if (s > 0) snippet = "… " + snippet;
    if (e < text.length) snippet = snippet + " …";
    return snippet;
  }

  function highlightInElement(el, terms, opts){
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        const tag = node.parentElement.tagName;
        if (["SCRIPT","STYLE","NOSCRIPT","CODE"].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest(".proxfind-mark")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const texts = [];
    let n;
    while ( (n = walker.nextNode()) ){
      texts.push(n);
    }
    const flags = opts.caseSensitive ? "g" : "gi";
    const res = new RegExp(terms.map(t => opts.wholeWord ? `\\b${escapeRegExp(t)}\\b` : escapeRegExp(t)).join("|"), flags);
    for (const textNode of texts){
      const parent = textNode.parentNode;
      const value = textNode.nodeValue;
      let lastIndex = 0;
      let match;
      let frag = null;
      while ((match = res.exec(value))){
        if (!frag) frag = document.createDocumentFragment();
        const before = value.slice(lastIndex, match.index);
        if (before) frag.appendChild(document.createTextNode(before));
        const mark = document.createElement("mark");
        mark.className = "proxfind-mark";
        mark.textContent = value.slice(match.index, match.index + match[0].length);
        frag.appendChild(mark);
        lastIndex = match.index + match[0].length;
      }
      if (frag){
        const after = value.slice(lastIndex);
        if (after) frag.appendChild(document.createTextNode(after));
        parent.replaceChild(frag, textNode);
      }
    }
  }

  function clearHighlights(){
    for (const mark of Array.from(document.querySelectorAll("mark.proxfind-mark"))){
      const parent = mark.parentNode;
      if (!parent) continue;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    }
    for (const el of Array.from(document.querySelectorAll(".proxfind-flash"))){
      el.classList.remove("proxfind-flash");
    }
  }

  function search(options){
    const terms = (options.terms || []).map(s=>s.trim()).filter(Boolean);
    if (!terms.length) return { results: [] };

    clearHighlights();

    const sameBlock = options.sameBlock !== false;
    const candidates = getCandidates(sameBlock);
    const results = [];

    for (const el of candidates){
      const text = el.innerText || "";
      if (!text || text.length < 2) continue;

      // quick prefilter: every term appears (rough check on text)
      const hay = options.caseSensitive ? text : text.toLowerCase();
      const queries = options.caseSensitive ? terms : terms.map(t=>t.toLowerCase());
      let ok = true;
      for (const q of queries){
        if (options.wholeWord){
          const wre = new RegExp(`\\b${escapeRegExp(q)}\\b`);
          if (!wre.test(hay)) { ok = false; break; }
        } else {
          if (!hay.includes(q)) { ok = false; break; }
        }
      }
      if (!ok) continue;

      const tokens = tokenize(text);
      if (!tokens.length) continue;

      const occurs = findOccurrencesForTerms(tokens, terms, options);
      if (occurs.some(arr => arr.length === 0)) continue;

      const windows = coverageWindows(occurs, options.maxWordsBetween ?? 10, terms.length, !!options.orderMatters);
      if (!windows.length) continue;

      // Build result rows from windows (dedupe per element by taking the best window)
      windows.sort((a,b)=> a.betweenWords - b.betweenWords || (a.rightIndex - a.leftIndex) - (b.rightIndex - b.leftIndex));
      const best = windows[0];
      const start = tokens[best.leftIndex].start;
      const end = tokens[best.rightIndex].end;
      const snippetHTML = buildSnippet(text, start, end, terms, options);
      const id = ensureId(el);

      results.push({
        elementId: id,
        betweenWords: best.betweenWords,
        snippetHTML,
        tag: el.tagName.toLowerCase()
      });

      if (options.highlight){
        try { highlightInElement(el, terms, options); } catch(e){ /* ignore */ }
        el.classList.add("proxfind-flash");
      }
    }

    // Sort: by closeness, then tag priority (paragraphs first)
    const tagRank = (t) => (t==="p"?0:t==="li"?1:t==="td"?2:3);
    results.sort((a,b)=> a.betweenWords - b.betweenWords || tagRank(a.tag) - tagRank(b.tag));

    state.lastResults = results;
    return { results };
  }

  function scrollToId(id){
    const el = document.querySelector(`[data-prox-id="${CSS.escape(id)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    el.classList.add("proxfind-flash");
    setTimeout(()=> el.classList.remove("proxfind-flash"), 1800);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    try {
      if (msg?.type === "proxfind.search"){
        const out = search(msg.options || {});
        sendResponse(out);
        return true;
      }
      if (msg?.type === "proxfind.clear"){
        clearHighlights();
        sendResponse({ ok: true });
        return true;
      }
      if (msg?.type === "proxfind.scrollTo"){
        scrollToId(msg.id);
        sendResponse({ ok: true });
        return true;
      }
    } catch (e) {
      sendResponse({ error: String(e) });
      return true;
    }
  });
})();
