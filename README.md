# ProxFind – Proximity Text Search (Chrome Extension)
<img width="2558" height="1314" alt="image" src="https://github.com/user-attachments/assets/2c1509b6-3aa5-49a4-b5df-7739914ede3b" />

## What it is
ProxFind helps you **find where multiple terms occur near each other** on a web page or in supported PDF viewers.  
Unlike `Ctrl+F` (which only matches one word at a time), ProxFind lets you:

- Search for **two or more terms** (e.g., `Chris, BVA`)
- Define how many words can appear **between them**
- See context snippets, highlight matches directly on the page, and click results to jump  

It’s like a lightweight **co-occurrence analyzer** for the web.

---

## Features
- 🔍 **Proximity search** – find terms within *N* words of each other  
- 🎯 **Highlight-only mode** – just highlight a single term everywhere  
- ⚙️ **Options** – whole-word match, case sensitivity, order matters, same-block restriction  
- 📝 **Context snippets** – results show surrounding text so you see context fast  
- 📑 **PDF support** – works on PDF.js-based viewers (Mozilla’s demo, Google Drive preview, DocHub, etc.)  
  - On Chrome’s built-in PDF viewer (which blocks content scripts), ProxFind offers a one-click **“Open in PDF.js Viewer”** button  

---

## Install (Developer Mode)
1. Download and unzip this extension  
2. In Chrome, go to `chrome://extensions/`  
3. Enable **Developer mode** (top-right)  
4. Click **Load unpacked** → select the `proxfind` folder  

---

## How to Use
1. Open any webpage or PDF.js-based viewer  
2. Click the **ProxFind** icon in your toolbar  
3. Enter terms (comma-separated, e.g., `Russia, drone strikes`)  
4. Adjust **Max words between** and toggles as needed  
5. Press **Search**  
   - Matches appear in the results panel  
   - Click a snippet to jump to that section  
   - Terms are highlighted in yellow on the page  
6. Press **Clear** to remove highlights  
7. *(Optional)* Click **Save defaults** to remember your preferred settings  

---

## Example Workflows
- 📰 **Policy analysis**: Find where “Biden” appears near “student loans” in a long article  
- 📈 **Finance reports**: Detect co-occurrences of “climate change” and “risk management” in annual filings  
- 🧪 **Health research**: Spot mentions of “long COVID” near “neurological”  
- 🌍 **Geopolitics**: In conflict reports, locate passages where “Russia” is close to “drone strikes”  

---

## Notes
- **Order matters** – forces Term 1 → Term 2 sequence (useful for cause/effect searches)  
- **Same block/paragraph only** – restricts to `<p>`, `<li>`, `<td>`, etc. Disable for whole-page scanning  
- **PDF limitations** – Chrome’s built-in PDF viewer blocks scripts. Use the **PDF.js button** if you see one  

---

## Privacy
- All processing happens **locally in your browser**  
- No page content is sent anywhere  

---
