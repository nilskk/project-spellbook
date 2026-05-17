// Content script for Project Spellbook
(function () {
  const pathname = new URL(window.location.href).pathname;
  if (!/^\/characters\/(\d+)\/?$/.test(pathname)) return;

  const characterId = RegExp.$1;
  const STORAGE_KEY = 'spellbook_pins_' + characterId;
  const SIDEBAR_KEY = 'spellbook_sidebar_' + characterId;
  const SIDEBAR_HTML_KEY = 'spellbook_sidebar_html_' + characterId;
  const SIDEBAR_STATE_KEY = 'spellbook_sidebar_open_' + characterId;
  const SIDEBAR_WIDTH_KEY = 'spellbook_sidebar_width_' + characterId;

  const pinned = new Set();
  let sidebarWidth = 280;
  const sidebarPinned = new Set();
  let sidebarHtml = {};
  const originals = new WeakMap();

  function save() {
    try { chrome.storage.local.set({ [STORAGE_KEY]: [...pinned] }); } catch (e) {}
  }

  function saveSidebar() {
    try {
      chrome.storage.local.set({
        [SIDEBAR_KEY]: [...sidebarPinned],
        [SIDEBAR_HTML_KEY]: sidebarHtml
      });
    } catch (e) {}
  }

  async function load() {
    try {
      const r = await chrome.storage.local.get(STORAGE_KEY);
      (r[STORAGE_KEY] || []).forEach(k => pinned.add(k));
    } catch (e) {}
  }

  async function loadSidebar() {
    try {
      const r = await chrome.storage.local.get([SIDEBAR_KEY, SIDEBAR_HTML_KEY]);
      (r[SIDEBAR_KEY] || []).forEach(k => sidebarPinned.add(k));
      sidebarHtml = r[SIDEBAR_HTML_KEY] || {};
    } catch (e) {
      sidebarHtml = {};
    }
  }

  async function loadSidebarState() {
    try {
      const r = await chrome.storage.local.get(SIDEBAR_STATE_KEY);
      setSidebarOpen(r[SIDEBAR_STATE_KEY] !== false);
    } catch (e) { setSidebarOpen(true); }
  }

  async function loadSidebarWidth() {
    try {
      const r = await chrome.storage.local.get(SIDEBAR_WIDTH_KEY);
      sidebarWidth = r[SIDEBAR_WIDTH_KEY] || 280;
    } catch (e) { sidebarWidth = 280; }
  }

  function isSnippet(el) {
    return [...el.classList].some(c => c === 'ct-feature-snippet' || c.startsWith('ct-feature-snippet--'));
  }

  function getTab(el) {
    let node = el;
    while (node) {
      const cls = node.className || '';
      const m = cls.match(/ct-primary-box__tab--(\w+)/);
      if (m) return m[1];
      if (cls.includes('ct-actions')) return 'actions';
      if (cls.includes('ct-features')) return 'features';
      node = node.parentElement;
    }
    return 'unknown';
  }

  function getHeading(el) {
    const h = el.querySelector('h1, h2, h3, h4, h5, h6, .ct-feature-snippet__heading, [class*="heading"]');
    return h?.textContent.trim() || 'Unknown Feature';
  }

  function keyOf(el) {
    return getTab(el) + '\0' + getHeading(el);
  }

  function wrapperOf(el) {
    let item = el, depth = 0;
    while (depth++ < 5 && item.parentElement?.children.length === 1) {
      item = item.parentElement;
    }
    return item;
  }

  function getContainer() {
    return document.querySelector('.styles_actionsList__tw2cW')
      || document.querySelector('.ct-features [data-scrollable-container="true"]')
      || document.querySelector('.ct-features')
      || document.querySelector('[class*="ct-feature-snippet"]')?.closest('[class*="list"], [class*="content"]');
  }

  function getPinnedSection() {
    const container = getContainer();
    if (!container) return null;
    let section = container.querySelector('.spellbook-pinned-section');
    if (!section) {
      section = document.createElement('div');
      section.className = 'spellbook-pinned-section';
      section.innerHTML = '<div class="spellbook-pinned-section-heading">Pinned</div>';
      container.prepend(section);
    }
    return section;
  }

  function updateVisibility() {
    const section = getPinnedSection();
    if (section) {
      const hasVisible = Array.from(section.children).some(
        c => !c.classList.contains('spellbook-pinned-section-heading') && c.style.display !== 'none'
      );
      section.style.display = hasVisible ? '' : 'none';
    }
  }

  // --- Sidebar ---

  function ensureSidebar() {
    let sb = document.getElementById('spellbook-sidebar');
    let toggle = document.getElementById('spellbook-sidebar-toggle');

    if (!sb) {
      sb = document.createElement('div');
      sb.id = 'spellbook-sidebar';
      sb.className = 'spellbook-sidebar';
      sb.innerHTML = '<div class="spellbook-sidebar-header"><span>Spellbook</span><button class="spellbook-sidebar-close" title="Close sidebar">\u2715</button></div><div class="spellbook-sidebar-content"></div>';
      document.body.appendChild(sb);
      sb.querySelector('.spellbook-sidebar-close').addEventListener('click', () => setSidebarOpen(false));

      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'spellbook-sidebar-resize-handle';
      sb.appendChild(resizeHandle);

      let isResizing = false;
      resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        e.preventDefault();
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        let newWidth = e.clientX;
        if (newWidth < 180) newWidth = 180;
        if (newWidth > 800) newWidth = 800;
        sidebarWidth = newWidth;
        sb.style.width = newWidth + 'px';
      });

      document.addEventListener('mouseup', () => {
        if (!isResizing) return;
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try {
          chrome.storage.local.set({ [SIDEBAR_WIDTH_KEY]: parseInt(sb.style.width, 10) });
        } catch (e) {}
      });
    }

    sb.style.width = sidebarWidth + 'px';

    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = 'spellbook-sidebar-toggle';
      toggle.className = 'spellbook-sidebar-toggle';
      toggle.textContent = '\u26A1';
      toggle.title = 'Open Spellbook sidebar';
      document.body.appendChild(toggle);
      toggle.addEventListener('click', () => setSidebarOpen(true));
    }

    return sb;
  }

  function setSidebarOpen(open) {
    const sb = ensureSidebar();
    sb.classList.toggle('open', open);
    const toggle = document.getElementById('spellbook-sidebar-toggle');
    if (toggle) toggle.style.display = open ? 'none' : 'flex';
    try { chrome.storage.local.set({ [SIDEBAR_STATE_KEY]: open }); } catch (e) {}
  }

  function getSidebarClone(content, k) {
    for (const item of content.children) {
      if (item.dataset.spellbookKey === k) return item;
    }
    return null;
  }

  function attachSidebarCloneListeners(clone, k) {
    const btn = clone.querySelector('.spellbook-sidebar-unpin');
    if (btn) {
      btn.addEventListener('click', (e) => { e.stopPropagation(); sidebarUnpinByKey(k); });
    }
  }

  function makeSidebarClone(w, k) {
    const clone = w.cloneNode(true);
    clone.classList.add('spellbook-sidebar-item');
    clone.classList.remove('spellbook-pinned-feature');
    clone.style.display = '';
    clone.dataset.spellbookKey = k;
    clone.querySelectorAll('.spellbook-pin-btn, .spellbook-sidebar-btn').forEach(b => b.remove());

    const unpinBtn = document.createElement('button');
    unpinBtn.className = 'spellbook-sidebar-unpin';
    unpinBtn.textContent = '\u2715';
    unpinBtn.title = 'Remove from sidebar';
    clone.appendChild(unpinBtn);

    attachSidebarCloneListeners(clone, k);
    return clone;
  }

  function insertSidebarCloneFromHtml(content, k, html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    const clone = div.firstChild;
    if (!clone) return null;
    clone.dataset.spellbookKey = k;
    attachSidebarCloneListeners(clone, k);
    content.appendChild(clone);
    return clone;
  }

  function sidebarPin(el) {
    const k = keyOf(el);
    if (sidebarPinned.has(k)) return;

    sidebarPinned.add(k);

    const sb = ensureSidebar();
    const content = sb.querySelector('.spellbook-sidebar-content');
    let clone = getSidebarClone(content, k);
    if (!clone) {
      clone = makeSidebarClone(wrapperOf(el), k);
      content.appendChild(clone);
    }

    sidebarHtml[k] = clone.outerHTML;
    saveSidebar();

    const btn = el.querySelector('.spellbook-sidebar-btn');
    if (btn) { btn.classList.add('pinned'); btn.textContent = '\u2715'; btn.title = 'Remove from sidebar'; }
  }

  function sidebarUnpin(el) {
    const k = keyOf(el);
    if (!sidebarPinned.has(k)) return;

    sidebarPinned.delete(k);
    delete sidebarHtml[k];
    saveSidebar();

    const sb = ensureSidebar();
    const clone = getSidebarClone(sb.querySelector('.spellbook-sidebar-content'), k);
    if (clone) clone.remove();

    const btn = el.querySelector('.spellbook-sidebar-btn');
    if (btn) { btn.classList.remove('pinned'); btn.textContent = '\u2B50'; btn.title = 'Pin to sidebar'; }
  }

  function sidebarUnpinByKey(k) {
    sidebarPinned.delete(k);
    delete sidebarHtml[k];
    saveSidebar();

    const sb = ensureSidebar();
    const clone = getSidebarClone(sb.querySelector('.spellbook-sidebar-content'), k);
    if (clone) clone.remove();

    const [tab, heading] = k.split('\0');
    for (const el of document.querySelectorAll('[class*="ct-feature-snippet"]')) {
      if (!isSnippet(el) || el.closest('#spellbook-sidebar')) continue;
      if (getTab(el) === tab && getHeading(el) === heading) {
        const btn = el.querySelector('.spellbook-sidebar-btn');
        if (btn) { btn.classList.remove('pinned'); btn.textContent = '\u2B50'; btn.title = 'Pin to sidebar'; }
        break;
      }
    }
  }

  // --- Top pin ---

  function pin(el) {
    const k = keyOf(el);
    if (pinned.has(k)) return;

    const w = wrapperOf(el);
    if (!w) return;

    if (!originals.has(el)) originals.set(el, { parent: w.parentElement, next: w.nextSibling });

    pinned.add(k);
    save();
    el.classList.add('spellbook-pinned-feature');

    const section = getPinnedSection();
    if (section) section.appendChild(w);
    updateVisibility();

    const btn = el.querySelector('.spellbook-pin-btn');
    if (btn) { btn.classList.add('pinned'); btn.textContent = '\u2715'; btn.title = 'Unpin'; }
  }

  function unpin(el) {
    const k = keyOf(el);
    if (!pinned.has(k)) return;

    pinned.delete(k);
    save();
    el.classList.remove('spellbook-pinned-feature');

    const w = wrapperOf(el);
    const orig = originals.get(el);
    if (orig?.parent?.isConnected) {
      if (orig.next && orig.next.parentElement === orig.parent) {
        orig.parent.insertBefore(w, orig.next);
      } else {
        orig.parent.appendChild(w);
      }
    }
    originals.delete(el);

    updateVisibility();

    const btn = el.querySelector('.spellbook-pin-btn');
    if (btn) { btn.classList.remove('pinned'); btn.textContent = '\uD83D\uDCCC'; btn.title = 'Pin to top'; }
  }

  // --- Buttons ---

  function addPinButton(el) {
    const existing = el.querySelector('.spellbook-pin-btn');
    if (!isSnippet(el) || existing) return;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

    const k = keyOf(el);
    const isPinned = pinned.has(k);

    const btn = document.createElement('button');
    btn.className = 'spellbook-pin-btn' + (isPinned ? ' pinned' : '');
    btn.title = isPinned ? 'Unpin' : 'Pin to top';
    btn.textContent = isPinned ? '\u2715' : '\uD83D\uDCCC';

    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      pinned.has(keyOf(el)) ? unpin(el) : pin(el);
    });

    el.appendChild(btn);
  }

  function addSidebarButton(el) {
    const existing = el.querySelector('.spellbook-sidebar-btn');
    if (!isSnippet(el) || existing) return;

    const k = keyOf(el);
    const isPinned = sidebarPinned.has(k);

    const btn = document.createElement('button');
    btn.className = 'spellbook-sidebar-btn' + (isPinned ? ' pinned' : '');
    btn.title = isPinned ? 'Remove from sidebar' : 'Pin to sidebar';
    btn.textContent = isPinned ? '\u2715' : '\u2B50';

    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      sidebarPinned.has(keyOf(el)) ? sidebarUnpin(el) : sidebarPin(el);
    });

    el.appendChild(btn);
  }

  // --- Sync ---

  const observer = new MutationObserver(sync);

  function sync() {
    observer.disconnect();
    try {
      const section = getPinnedSection();
      const sb = ensureSidebar();
      const sbContent = sb.querySelector('.spellbook-sidebar-content');

      // Collect real snippets (ignore sidebar clones)
      const snippets = [];
      for (const el of document.querySelectorAll('[class*="ct-feature-snippet"]')) {
        if (!isSnippet(el) || el.closest('#spellbook-sidebar')) continue;
        snippets.push(el);
      }

      // Top pin
      for (const k of pinned) {
        const [tab, heading] = k.split('\0');
        for (const el of snippets) {
          if (getTab(el) === tab && getHeading(el) === heading) {
            const w = wrapperOf(el);
            if (section && w?.parentElement !== section) {
              if (!originals.has(el)) originals.set(el, { parent: w.parentElement, next: w.nextSibling });
              el.classList.add('spellbook-pinned-feature');
              section.appendChild(w);
            }
            break;
          }
        }
      }

      // Sidebar: remove stale clones
      for (const item of [...sbContent.children]) {
        if (!sidebarPinned.has(item.dataset.spellbookKey)) item.remove();
      }

      // Sidebar: add missing clones from saved HTML (works even if original isn't rendered yet)
      for (const k of sidebarPinned) {
        if (getSidebarClone(sbContent, k)) continue;
        const html = sidebarHtml[k];
        if (html) {
          insertSidebarCloneFromHtml(sbContent, k, html);
        } else {
          // Fallback: clone from live original if it's currently visible
          const [tab, heading] = k.split('\0');
          for (const el of snippets) {
            if (getTab(el) === tab && getHeading(el) === heading) {
              const clone = makeSidebarClone(wrapperOf(el), k);
              sbContent.appendChild(clone);
              sidebarHtml[k] = clone.outerHTML;
              saveSidebar();
              break;
            }
          }
        }
      }

      // Add / refresh buttons
      for (const el of snippets) {
        addPinButton(el);
        addSidebarButton(el);
      }

      updateVisibility();
    } finally {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  (async () => {
    await load();
    await loadSidebar();
    await loadSidebarWidth();
    await loadSidebarState();
    sync();
  })();
})();
