ProxFind – Proximity Text Search (Chrome Extension)
===================================================

What it does
------------
ProxFind finds places on the current web page where your search terms appear near each other
(e.g., “Chris” within 10 words of “BVA”). It lists matches with context snippets and can highlight
them on the page.

Install (Developer mode)
------------------------
1) Download the ZIP: proxfind.zip
2) Extract it somewhere.
3) Open Chrome → go to chrome://extensions
4) Enable **Developer mode** (toggle in top-right).
5) Click **Load unpacked** and select the extracted `proxfind-extension` folder.

How to use
----------
- Click the ProxFind icon.
- Enter terms separated by commas (e.g., `Chris, BVA`).
- Choose the maximum number of words allowed *between* the terms.
- Toggle options: whole-word matching, case sensitivity, order matters, highlighting, and restricting
  matches to the same paragraph/block.
- Press **Search**. Click a result to scroll to it on the page.
- Press **Clear** to remove highlights.

Notes
-----
- “Order matters” is designed primarily for two-term searches (Term 1 before Term 2).
- “Same block/paragraph only” limits matches to text contained within a single block element (like a `<p>`,
  list item, table cell, etc.). Turn it off to search the whole page as a large block (may be slower and noisier).
- For very large pages, searching may take a moment. Narrow your terms or reduce the max words between for speed.

Privacy
-------
This extension runs entirely on your device. It does not send page content anywhere.
