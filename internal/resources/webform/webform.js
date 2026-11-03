/*
 * gRPC UI web form.
 *
 * Plain JavaScript with no dependencies. The page markup comes from
 * webform-template.html, which calls window.initGRPCForm(config).
 *
 * Sections:
 *   1. Helpers and small UI pieces (icons, tabs, tooltip, toast, dialog,
 *      sheet, menu, JSON highlighting)
 *   2. initGRPCForm: sidebar, metadata scopes, request form, invoke,
 *      response, history, examples
 */
(function() {
"use strict";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SVG_NS = "http://www.w3.org/2000/svg";

// Icon paths in the style of lucide (24x24, stroke based).
const ICONS = {
    "panel-left": '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    "layers": '<path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    "play": '<path d="M6 3l14 9-14 9V3z"/>',
    "history": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    "moon": '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    "monitor": '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    "search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "globe": '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    "package": '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    "server": '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/>',
    "tag": '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    "copy": '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "x": '<path d="M18 6 6 18M6 6l12 12"/>',
    "plus": '<path d="M5 12h14M12 5v14"/>',
    "trash": '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2"/>',
    "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    "upload": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    "info": '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    "alert": '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    "check-circle": '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    "loader": '<path d="M21 12a9 9 0 1 1-6.22-8.56"/>',
    "braces": '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>',
    "send": '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    "dot": '<circle cx="12" cy="12" r="1"/>',
};

function icon(name, size, cls) {
    const svg = document.createElementNS(SVG_NS, "svg");
    const s = String(size || 16);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", s);
    svg.setAttribute("height", s);
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "icon" + (cls ? " " + cls : ""));
    svg.innerHTML = ICONS[name] || "";
    return svg;
}

// Properties that must be set on the element rather than as attributes.
const PROPS = new Set(["value", "checked", "disabled", "selected", "indeterminate"]);

// h creates an element: h("div", {class: "x", onclick: fn}, child, "text", ...)
function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
        for (const k of Object.keys(attrs)) {
            const v = attrs[k];
            if (v === undefined || v === null || v === false) {
                continue;
            }
            if (k === "class") {
                el.className = v;
            } else if (k === "text") {
                el.textContent = v;
            } else if (k === "dataset") {
                Object.assign(el.dataset, v);
            } else if (k === "style" && typeof v === "object") {
                Object.assign(el.style, v);
            } else if (k.startsWith("on") && typeof v === "function") {
                el.addEventListener(k.slice(2).toLowerCase(), v);
            } else if (PROPS.has(k)) {
                el[k] = v;
            } else {
                el.setAttribute(k, v === true ? "" : String(v));
            }
        }
    }
    for (let i = 2; i < arguments.length; i++) {
        appendChildren(el, arguments[i]);
    }
    return el;
}

function appendChildren(el, child) {
    if (child === undefined || child === null || child === false) {
        return;
    }
    if (Array.isArray(child)) {
        child.forEach(c => appendChildren(el, c));
    } else if (child instanceof Node) {
        el.appendChild(child);
    } else {
        el.appendChild(document.createTextNode(String(child)));
    }
}

function qs(sel, root) {
    return (root || document).querySelector(sel);
}

function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
}

function isUnset(v) {
    return v === null || v === undefined;
}

const storage = {
    get(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            return false;
        }
    },
    getJSON(key, fallback) {
        const s = this.get(key);
        if (!s) {
            return fallback;
        }
        try {
            return JSON.parse(s);
        } catch (e) {
            return fallback;
        }
    },
    setJSON(key, value) {
        return this.set(key, JSON.stringify(value));
    },
};

const IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");

function plural(n, word) {
    return n + " " + word + (n === 1 ? "" : "s");
}

function formatDuration(ms) {
    if (!isFinite(ms)) {
        return "";
    }
    if (ms < 10) {
        return ms.toFixed(1) + " ms";
    }
    if (ms < 1000) {
        return Math.round(ms) + " ms";
    }
    return (ms / 1000).toFixed(2) + " s";
}

function formatTime(iso) {
    const d = new Date(iso);
    if (!isFinite(d.getTime())) {
        return "";
    }
    const sameDay = d.toDateString() === new Date().toDateString();
    return sameDay
        ? d.toLocaleTimeString(undefined, {hour: "2-digit", minute: "2-digit", second: "2-digit"})
        : d.toLocaleString(undefined, {month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"});
}

// Quotes a string for a POSIX shell, unless it is obviously safe.
function shellQuote(s) {
    if (/^[A-Za-z0-9_\-.:/@=,+]+$/.test(s)) {
        return s;
    }
    return "'" + s.replace(/'/g, "'\\''") + "'";
}

// Removes the common leading whitespace from every line.
function dedent(text) {
    const lines = text.replace(/\s+$/, "").split("\n");
    let min = Infinity;
    for (const line of lines) {
        if (line.trim() === "") {
            continue;
        }
        min = Math.min(min, line.match(/^[ \t]*/)[0].length);
    }
    if (!isFinite(min) || min === 0) {
        return lines.join("\n");
    }
    return lines.map(l => l.slice(min)).join("\n");
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (e) {
        // Clipboard API needs a secure context; fall back to execCommand.
        const ta = h("textarea", {style: {position: "fixed", opacity: "0", top: "0", left: "0"}});
        ta.value = text;
        (document.querySelector("dialog[open]") || document.body).appendChild(ta);
        ta.select();
        let ok = false;
        try {
            ok = document.execCommand("copy");
        } catch (e2) {
            ok = false;
        }
        ta.remove();
        return ok;
    }
}

// Renders JSON text with syntax colouring. Returns a DocumentFragment.
function highlightJSON(text) {
    const frag = document.createDocumentFragment();
    const re = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
    let last = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) {
            frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        }
        let cls;
        if (m[1] !== undefined) {
            cls = m[2] ? "json-key" : "json-string";
        } else if (m[3] !== undefined) {
            cls = "json-literal";
        } else {
            cls = "json-number";
        }
        if (cls === "json-key") {
            frag.appendChild(h("span", {class: cls, text: m[1]}));
            frag.appendChild(document.createTextNode(m[2]));
        } else {
            frag.appendChild(h("span", {class: cls, text: m[0]}));
        }
        last = re.lastIndex;
    }
    if (last < text.length) {
        frag.appendChild(document.createTextNode(text.slice(last)));
    }
    return frag;
}

function codeBlock(value) {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    const pre = h("pre", {class: "code"});
    pre.appendChild(highlightJSON(text === undefined ? "undefined" : text));
    return pre;
}

function kvTable(rows, emptyText) {
    if (!rows || rows.length === 0) {
        return h("p", {class: "muted text-sm", text: emptyText});
    }
    const table = h("table", {class: "kv-table"});
    for (const r of rows) {
        table.appendChild(h("tr", null, h("th", {text: r.name}), h("td", {text: r.value})));
    }
    return h("div", {class: "kv-wrap"}, table);
}

// ---------------------------------------------------------------------------
// UI pieces. They attach to ROOT (the .grpcui element) so its styles apply.
// ---------------------------------------------------------------------------

let ROOT = null;

// Elements in the browser's top layer (open modal dialogs) cover everything
// else, so floating things are placed inside the topmost open dialog.
function overlayHost() {
    const open = qsa("dialog[open]", ROOT);
    return open.length ? open[open.length - 1] : ROOT;
}

const tooltip = (function() {
    let el = null;
    let current = null;
    let timer = 0;

    function show(target) {
        const text = target.getAttribute("data-tooltip");
        if (!text || !target.isConnected) {
            return;
        }
        if (!el) {
            el = h("div", {class: "tooltip", role: "tooltip"});
        }
        const host = target.closest("dialog") || ROOT;
        if (el.parentNode !== host) {
            host.appendChild(el);
        }
        el.textContent = text;
        el.classList.toggle("mono", target.hasAttribute("data-tooltip-mono"));
        el.style.left = "0px";
        el.style.top = "0px";
        const r = target.getBoundingClientRect();
        const tr = el.getBoundingClientRect();
        let top = r.bottom + 6;
        if (top + tr.height > window.innerHeight - 8) {
            top = Math.max(8, r.top - tr.height - 6);
        }
        let left = r.left + r.width / 2 - tr.width / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - tr.width - 8));
        el.style.left = left + "px";
        el.style.top = top + "px";
        el.classList.add("open");
    }

    function hide() {
        clearTimeout(timer);
        current = null;
        if (el) {
            el.classList.remove("open");
        }
    }

    function init(root) {
        root.addEventListener("mouseover", e => {
            const t = e.target.closest && e.target.closest("[data-tooltip]");
            if (t === current) {
                return;
            }
            hide();
            if (t) {
                current = t;
                timer = setTimeout(() => show(t), 400);
            }
        });
        root.addEventListener("mouseleave", hide);
        root.addEventListener("focusin", e => {
            const t = e.target.closest && e.target.closest("[data-tooltip]");
            hide();
            if (t && t.matches(":focus-visible")) {
                current = t;
                timer = setTimeout(() => show(t), 300);
            }
        });
        root.addEventListener("focusout", hide);
        root.addEventListener("mousedown", hide, true);
        root.addEventListener("keydown", e => {
            if (e.key === "Escape") {
                hide();
            }
        });
        window.addEventListener("scroll", hide, true);
    }

    return {init, hide};
})();

function toast(title, opts) {
    opts = opts || {};
    const variant = opts.variant || "default";
    let region = qs(".toast-region", ROOT);
    if (!region) {
        region = h("div", {class: "toast-region"});
        if (region.showPopover) {
            region.setAttribute("popover", "manual");
        }
    }
    const host = overlayHost();
    if (region.parentNode !== host) {
        host.appendChild(region);
    }
    if (region.showPopover) {
        // Re-showing moves the region to the top of the top layer, above any dialog.
        try {
            if (region.matches(":popover-open")) {
                region.hidePopover();
            }
            region.showPopover();
        } catch (e) {
            // ignore: popover API quirks should never break a toast
        }
    }
    const iconName = variant === "error" ? "alert" : variant === "success" ? "check-circle" : "info";
    const closeBtn = h("button", {type: "button", class: "btn btn-ghost btn-icon btn-xs", "aria-label": "Dismiss"}, icon("x", 14));
    const el = h("div", {class: "toast toast-" + variant, role: variant === "error" ? "alert" : "status"},
        icon(iconName, 16),
        h("div", {class: "toast-content"},
            h("div", {class: "toast-title", text: title}),
            opts.description ? h("div", {class: "toast-desc", text: opts.description}) : null),
        closeBtn);
    region.appendChild(el);
    while (region.children.length > 4) {
        region.firstChild.remove();
    }
    requestAnimationFrame(() => el.classList.add("open"));
    let timer = setTimeout(close, opts.duration || (variant === "error" ? 7000 : 3000));
    el.addEventListener("mouseenter", () => clearTimeout(timer));
    el.addEventListener("mouseleave", () => {
        timer = setTimeout(close, 2000);
    });
    closeBtn.addEventListener("click", close);

    function close() {
        clearTimeout(timer);
        el.classList.remove("open");
        setTimeout(() => {
            el.remove();
            if (region.children.length === 0 && region.hidePopover) {
                try {
                    region.hidePopover();
                } catch (e) {
                    // ignore
                }
            }
        }, 220);
    }
}

// Shows a modal confirmation. Resolves to true if confirmed.
function confirmDialog(opts) {
    return new Promise(resolve => {
        const cancel = h("button", {type: "button", class: "btn btn-outline btn-sm"}, opts.cancelLabel || "Cancel");
        const ok = h("button", {type: "button", class: "btn btn-sm " + (opts.destructive ? "btn-destructive" : "btn-primary")}, opts.confirmLabel || "Continue");
        const dlg = h("dialog", {class: "dialog", role: "alertdialog", "aria-labelledby": "gu-dialog-title"},
            h("h2", {class: "dialog-title", id: "gu-dialog-title", text: opts.title}),
            opts.description ? h("p", {class: "dialog-desc", text: opts.description}) : null,
            h("div", {class: "dialog-actions"}, cancel, ok));
        let result = false;
        cancel.addEventListener("click", () => dlg.close());
        ok.addEventListener("click", () => {
            result = true;
            dlg.close();
        });
        dlg.addEventListener("close", () => {
            dlg.remove();
            resolve(result);
        });
        ROOT.appendChild(dlg);
        dlg.showModal();
        cancel.focus();
    });
}

// A side panel that slides in from the right (shadcn "Sheet").
let currentSheet = null;

function openSheet(opts) {
    closeSheet();
    const title = h("h2", {class: "sheet-title", text: opts.title});
    const desc = h("p", {class: "sheet-desc", text: opts.description || ""});
    desc.hidden = !opts.description;
    const closeBtn = h("button", {type: "button", class: "btn btn-ghost btn-icon btn-sm", "aria-label": "Close"}, icon("x"));
    const body = h("div", {class: "sheet-body"}, opts.body);
    const dlg = h("dialog", {class: "sheet", "aria-label": opts.title},
        h("div", {class: "sheet-head"}, h("div", {class: "sheet-titles"}, title, desc), closeBtn),
        body,
        opts.footer ? h("div", {class: "sheet-foot"}, opts.footer) : null);
    const sheet = {
        dlg: dlg,
        body: body,
        setTitle(t) {
            title.textContent = t;
            dlg.setAttribute("aria-label", t);
        },
        setDescription(d) {
            desc.textContent = d || "";
            desc.hidden = !d;
        },
        close() {
            if (dlg.open) {
                dlg.close();
            }
        },
    };
    closeBtn.addEventListener("click", () => sheet.close());
    // A click on the backdrop targets the dialog element itself.
    dlg.addEventListener("mousedown", e => {
        if (e.target === dlg) {
            sheet.close();
        }
    });
    dlg.addEventListener("close", () => {
        dlg.remove();
        tooltip.hide();
        if (currentSheet === sheet) {
            currentSheet = null;
        }
        if (opts.onClose) {
            opts.onClose();
        }
    });
    currentSheet = sheet;
    ROOT.appendChild(dlg);
    dlg.showModal();
    if (opts.initialFocus) {
        opts.initialFocus.focus();
    }
    return sheet;
}

function closeSheet() {
    if (currentSheet) {
        currentSheet.close();
    }
}

// A small dropdown menu anchored to a button.
// items: [{label, description, checked, icon, onSelect}]
function openMenu(anchor, items, opts) {
    opts = opts || {};
    const menu = h("div", {class: "menu", role: "menu"});
    const usePopover = typeof menu.showPopover === "function";
    if (usePopover) {
        menu.setAttribute("popover", "auto");
    }
    const buttons = items.map(item => {
        const btn = h("button", {type: "button", class: "menu-item", role: "menuitemradio", "aria-checked": item.checked ? "true" : "false"},
            h("span", {class: "menu-check"}, item.checked ? icon("check", 14) : (item.icon ? icon(item.icon, 14) : null)),
            h("span", {class: "menu-text"},
                h("span", {text: item.label}),
                item.description ? h("span", {class: "menu-desc", text: item.description}) : null));
        btn.addEventListener("click", () => {
            close();
            item.onSelect();
        });
        return btn;
    });
    buttons.forEach(b => menu.appendChild(b));
    menu.addEventListener("keydown", e => {
        const i = buttons.indexOf(document.activeElement);
        if (e.key === "ArrowDown") {
            e.preventDefault();
            buttons[(i + 1) % buttons.length].focus();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            buttons[(i - 1 + buttons.length) % buttons.length].focus();
        } else if (e.key === "Escape" && !usePopover) {
            close();
        } else if (e.key === "Tab") {
            close();
        }
    });

    let closed = false;
    function close() {
        if (closed) {
            return;
        }
        closed = true;
        if (usePopover && menu.matches(":popover-open")) {
            menu.hidePopover();
        }
        menu.remove();
        document.removeEventListener("mousedown", outside, true);
        anchor.setAttribute("aria-expanded", "false");
        anchor.focus();
    }
    function outside(e) {
        if (!menu.contains(e.target) && !anchor.contains(e.target)) {
            close();
        }
    }

    overlayHost().appendChild(menu);
    if (usePopover) {
        menu.addEventListener("toggle", e => {
            if (e.newState === "closed") {
                close();
            }
        });
        menu.showPopover();
    } else {
        document.addEventListener("mousedown", outside, true);
    }
    anchor.setAttribute("aria-expanded", "true");
    const r = anchor.getBoundingClientRect();
    const mr = menu.getBoundingClientRect();
    let left = opts.align === "end" ? r.right - mr.width : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - mr.width - 8));
    let top = r.bottom + 6;
    if (top + mr.height > window.innerHeight - 8) {
        top = Math.max(8, r.top - mr.height - 6);
    }
    menu.style.left = left + "px";
    menu.style.top = top + "px";
    const checked = buttons.find(b => b.getAttribute("aria-checked") === "true");
    (checked || buttons[0]).focus();
}

// Wires up a tab list. Panels are found in panelRoot by data-panel.
function createTabs(list, panelRoot, opts) {
    opts = opts || {};
    const tabs = qsa("[role=tab]", list);
    let active = null;
    for (const t of tabs) {
        const name = t.dataset.tab;
        const panel = qs('[data-panel="' + name + '"]', panelRoot);
        t.id = list.id + "-" + name;
        if (panel) {
            panel.id = t.id + "-panel";
            t.setAttribute("aria-controls", panel.id);
            panel.setAttribute("aria-labelledby", t.id);
        }
        if (t.getAttribute("aria-selected") === "true") {
            active = name;
        }
        t.addEventListener("click", () => select(name));
    }
    if (!active && tabs.length) {
        active = tabs[0].dataset.tab;
    }
    apply();

    list.addEventListener("keydown", e => {
        const i = tabs.findIndex(t => t.dataset.tab === active);
        let next = -1;
        if (e.key === "ArrowRight") {
            next = (i + 1) % tabs.length;
        } else if (e.key === "ArrowLeft") {
            next = (i - 1 + tabs.length) % tabs.length;
        } else if (e.key === "Home") {
            next = 0;
        } else if (e.key === "End") {
            next = tabs.length - 1;
        }
        if (next >= 0) {
            e.preventDefault();
            if (select(tabs[next].dataset.tab)) {
                tabs[next].focus();
            }
        }
    });

    function apply() {
        for (const t of tabs) {
            const on = t.dataset.tab === active;
            t.setAttribute("aria-selected", on ? "true" : "false");
            t.tabIndex = on ? 0 : -1;
            const panel = qs('[data-panel="' + t.dataset.tab + '"]', panelRoot);
            if (panel) {
                panel.hidden = !on;
            }
        }
    }

    function select(name, force) {
        if (name === active) {
            return true;
        }
        if (!force && opts.beforeChange && opts.beforeChange(active, name) === false) {
            return false;
        }
        active = name;
        apply();
        if (opts.onChange) {
            opts.onChange(name);
        }
        return true;
    }

    return {
        select: select,
        get active() {
            return active;
        },
    };
}

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

window.initGRPCForm = function(cfg) {
    cfg = cfg || {};
    const rootEl = qs("#grpcui");
    ROOT = rootEl;

    // services: full service name -> [{name, clientStream, serverStream}]
    const services = {};
    for (const svc of cfg.services || []) {
        services[svc] = (cfg.methods && cfg.methods[svc]) || [];
    }
    const serviceNames = Object.keys(services).sort();
    const svcDescs = cfg.svcDescs || {};
    const mtdDescs = cfg.mtdDescs || {};
    const invokeURI = cfg.invokeURI;
    const metadataURI = cfg.metadataURI;
    const debug = !!cfg.debug;
    const target = cfg.target || "";
    const grpcurlOptions = cfg.grpcurlOptions || "";
    const defaultMetadata = (cfg.defaultMetadata || []).map(m => ({name: m.name, value: m.value, enabled: true}));

    const host = window.location.host;
    const KEYS = {
        history: `grpcui-history-${host}-${target}`,
        service: `grpcui-last-service-${host}-${target}`,
        method: `grpcui-last-method-${host}-${target}`,
        metadata: `grpcui-metadata-${host}-${target}`,
        tree: `grpcui-tree-${host}-${target}`,
        description: "grpcui-expand-description",
        metadataOpen: "grpcui-metadata-open",
        sidebar: "grpcui-sidebar-collapsed",
        theme: "grpcui-theme",
    };

    const state = {
        service: null,
        method: null,
        schema: null,
        request: undefined,
        schemaReady: false,
        invoking: false,
        loadSeq: 0,
        activeExample: -1,
        // per-request metadata: rows, inherited names switched off for this
        // request, and whether inheritance is off entirely (history replay)
        requestRows: [],
        skipInherited: new Set(),
        inheritOff: false,
    };

    const els = {
        tree: qs("#gu-tree"),
        search: qs("#gu-search"),
        breadcrumb: qs("#gu-breadcrumb"),
        methodCard: qs("#gu-method-card"),
        metadata: qs("#gu-metadata"),
        form: qs("#gu-form"),
        raw: qs("#gu-raw"),
        grpcurl: qs("#gu-grpcurl"),
        timeout: qs("#gu-timeout"),
        invoke: qs("#gu-invoke"),
        invokeLabel: qs("#gu-invoke-label"),
        response: qs("#gu-response"),
        respStatus: qs("#gu-resp-status"),
        respCopy: qs("#gu-resp-copy"),
        examplesBtn: qs("#gu-examples-btn"),
        globalCount: qs("#gu-global-count"),
    };

    // replace <span data-icon="name"> placeholders from the template
    for (const ph of qsa("[data-icon]", rootEl)) {
        ph.replaceWith(icon(ph.dataset.icon, ph.dataset.size ? Number(ph.dataset.size) : 16, ph.className || ""));
    }
    for (const k of qsa("[data-kbd]", rootEl)) {
        k.textContent = k.dataset.kbd === "enter" ? (IS_MAC ? "⌘↵" : "Ctrl ↵") : (IS_MAC ? "⌘K" : "Ctrl K");
    }

    tooltip.init(rootEl);

    // ----- helpers about services and methods -----

    const hasService = svc => !!svc && Object.prototype.hasOwnProperty.call(services, svc);
    const methodInfo = (svc, m) => hasService(svc) ? services[svc].find(x => x.name === m) : undefined;
    const hasMethod = (svc, m) => !!methodInfo(svc, m);

    function streamKind(mi) {
        if (!mi) {
            return "";
        }
        if (mi.clientStream && mi.serverStream) {
            return "bidi";
        }
        return mi.clientStream ? "client" : mi.serverStream ? "server" : "";
    }

    function streamBadge(mi) {
        const kind = streamKind(mi);
        if (!kind) {
            return null;
        }
        const tips = {
            client: "Client streaming: you send several messages",
            server: "Server streaming: the server sends several messages",
            bidi: "Bidirectional streaming",
        };
        return h("span", {class: "badge badge-stream", "data-tooltip": tips[kind], text: kind});
    }

    function splitService(full) {
        const i = full.lastIndexOf(".");
        return i < 0 ? {pkg: "", name: full} : {pkg: full.slice(0, i), name: full.slice(i + 1)};
    }

    // "a.b.c" -> ["a", "a.b", "a.b.c"]
    function packagePrefixes(pkg) {
        if (!pkg) {
            return [];
        }
        const parts = pkg.split(".");
        return parts.map((_, i) => parts.slice(0, i + 1).join("."));
    }

    // ----- theme -----

    const themeBtn = qs("#gu-theme-btn");

    function themePref() {
        const v = storage.get(KEYS.theme);
        return v === "light" || v === "dark" ? v : "system";
    }

    function applyTheme(pref) {
        const de = document.documentElement;
        if (pref === "light" || pref === "dark") {
            de.setAttribute("data-theme", pref);
            storage.set(KEYS.theme, pref);
        } else {
            de.removeAttribute("data-theme");
            storage.set(KEYS.theme, "system");
        }
        const name = pref === "light" ? "sun" : pref === "dark" ? "moon" : "monitor";
        themeBtn.replaceChildren(icon(name));
        themeBtn.setAttribute("data-tooltip", "Theme: " + pref);
    }

    themeBtn.addEventListener("click", () => {
        const cur = themePref();
        openMenu(themeBtn, [
            {label: "Light", icon: "sun", checked: cur === "light", onSelect: () => applyTheme("light")},
            {label: "Dark", icon: "moon", checked: cur === "dark", onSelect: () => applyTheme("dark")},
            {label: "System", icon: "monitor", checked: cur === "system", onSelect: () => applyTheme("system")},
        ], {align: "end"});
    });
    applyTheme(themePref());

    // ----- sidebar: open/close -----

    const wideScreen = window.matchMedia("(min-width: 1024px)");

    function toggleSidebar(open) {
        if (wideScreen.matches) {
            const collapsed = open === undefined ? !rootEl.classList.contains("sidebar-collapsed") : !open;
            rootEl.classList.toggle("sidebar-collapsed", collapsed);
            storage.set(KEYS.sidebar, collapsed ? "true" : "false");
        } else {
            const isOpen = open === undefined ? !rootEl.classList.contains("sidebar-open") : open;
            rootEl.classList.toggle("sidebar-open", isOpen);
        }
    }

    if (storage.get(KEYS.sidebar) === "true") {
        rootEl.classList.add("sidebar-collapsed");
    }
    qs("#gu-sidebar-toggle").addEventListener("click", () => toggleSidebar());
    qs("#gu-scrim").addEventListener("click", () => toggleSidebar(false));
    wideScreen.addEventListener("change", () => rootEl.classList.remove("sidebar-open"));

    // ----- sidebar: package tree -----

    // Builds a tree of package segments. Each node: {name, full, children: Map, services: []}
    function buildPackageTree() {
        const root = {name: "", full: "", children: new Map(), services: []};
        for (const svc of serviceNames) {
            const {pkg, name} = splitService(svc);
            let node = root;
            if (pkg) {
                const parts = pkg.split(".");
                for (let i = 0; i < parts.length; i++) {
                    if (!node.children.has(parts[i])) {
                        node.children.set(parts[i], {name: parts[i], full: parts.slice(0, i + 1).join("."), children: new Map(), services: []});
                    }
                    node = node.children.get(parts[i]);
                }
            }
            node.services.push({full: svc, name: name});
        }
        return root;
    }

    const packageTree = buildPackageTree();
    const treeState = storage.getJSON(KEYS.tree, {}) || {};
    let treeFilter = "";

    function sortedChildren(node) {
        return Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    function isExpanded(key, fallback) {
        return Object.prototype.hasOwnProperty.call(treeState, key) ? !!treeState[key] : fallback;
    }

    function tagButton(scopeKeys, label) {
        const count = h("span", {class: "tag-count"});
        const btn = h("button", {
            type: "button",
            class: "btn btn-ghost btn-icon btn-xs tree-tag",
            "aria-label": "Metadata for " + label,
            "data-tooltip": "Metadata for " + label,
            tabindex: "-1",
        }, icon("tag", 13), count);
        btn.dataset.scopes = JSON.stringify(scopeKeys);
        btn.addEventListener("click", e => {
            e.stopPropagation();
            openScopeSheet(scopeKeys, scopeKeys[scopeKeys.length - 1]);
        });
        return btn;
    }

    function treeItem(kind, key, depth, rowChildren, groupItems, expanded) {
        const li = h("li", {class: "tree-item tree-" + kind, role: "treeitem", tabindex: "-1"});
        li.dataset.key = key;
        const row = h("div", {class: "tree-row", style: {"--depth": String(depth)}}, rowChildren);
        row.style.setProperty("--depth", String(depth));
        li.appendChild(row);
        if (groupItems) {
            li.setAttribute("aria-expanded", expanded ? "true" : "false");
            const ul = h("ul", {role: "group"}, groupItems);
            ul.hidden = !expanded;
            li.appendChild(ul);
        }
        return li;
    }

    function renderPackageNode(node, depth, q, parentFull) {
        // compact a chain of single-child levels into one row
        const levels = [node.full];
        let n = node;
        while (n.children.size === 1 && n.services.length === 0) {
            n = n.children.values().next().value;
            levels.push(n.full);
        }
        const label = parentFull ? n.full.slice(parentFull.length + 1) : n.full;
        const selfMatch = q && n.full.toLowerCase().includes(q);
        const childQ = selfMatch ? "" : q;
        const items = [];
        for (const c of sortedChildren(n)) {
            const li = renderPackageNode(c, depth + 1, childQ, n.full);
            if (li) {
                items.push(li);
            }
        }
        for (const s of n.services) {
            const li = renderServiceNode(s, depth + 1, childQ);
            if (li) {
                items.push(li);
            }
        }
        if (q && items.length === 0) {
            return null;
        }
        const key = "pkg:" + n.full;
        const holdsSelection = !!state.service && state.service.startsWith(n.full + ".");
        const expanded = q ? true : isExpanded(key, holdsSelection || serviceNames.length <= 12);
        const scopes = levels.map(l => "pkg:" + l);
        return treeItem("pkg", key, depth, [
            h("span", {class: "tree-twisty"}, icon("chevron-down", 14)),
            icon("package", 14, "tree-kind"),
            h("span", {class: "tree-label", title: n.full, text: label}),
            tagButton(scopes, "package " + n.full),
        ], items, expanded);
    }

    function renderServiceNode(svc, depth, q) {
        const methods = services[svc.full] || [];
        const svcMatch = q && svc.full.toLowerCase().includes(q);
        const shown = q && !svcMatch
            ? methods.filter(m => (svc.full + "." + m.name).toLowerCase().includes(q))
            : methods;
        if (q && shown.length === 0) {
            return null;
        }
        const key = "svc:" + svc.full;
        const expanded = q ? true : isExpanded(key, true);
        const items = shown.map(m => renderMethodNode(svc.full, m, depth + 1));
        const desc = svcDescs[svc.full] ? dedent(svcDescs[svc.full]) : "";
        const label = h("span", {class: "tree-label", text: svc.name});
        if (desc) {
            label.setAttribute("data-tooltip", desc);
            label.setAttribute("data-tooltip-mono", "");
        } else {
            label.title = svc.full;
        }
        return treeItem("svc", key, depth, [
            h("span", {class: "tree-twisty"}, icon("chevron-down", 14)),
            icon("server", 14, "tree-kind"),
            label,
            tagButton(["svc:" + svc.full], "service " + svc.full),
        ], items, expanded);
    }

    function renderMethodNode(svc, m, depth) {
        const li = treeItem("method", "mtd:" + svc + "." + m.name, depth, [
            h("span", {class: "tree-twisty"}),
            h("span", {class: "tree-label", text: m.name, title: svc + "/" + m.name}),
            streamBadge(m),
            tagButton(["mtd:" + svc + "." + m.name], "method " + m.name),
        ], null, false);
        li.dataset.service = svc;
        li.dataset.method = m.name;
        li.setAttribute("aria-selected", "false");
        return li;
    }

    function renderTree() {
        const q = treeFilter.trim().toLowerCase();
        const items = [];
        for (const c of sortedChildren(packageTree)) {
            const li = renderPackageNode(c, 0, q, "");
            if (li) {
                items.push(li);
            }
        }
        for (const s of packageTree.services) {
            const li = renderServiceNode(s, 0, q);
            if (li) {
                items.push(li);
            }
        }
        els.tree.replaceChildren();
        if (items.length === 0) {
            els.tree.appendChild(h("div", {class: "tree-empty"},
                serviceNames.length === 0 ? "This server has no services to show." : "No methods match “" + treeFilter.trim() + "”."));
        } else {
            els.tree.appendChild(h("ul", {role: "group"}, items));
        }
        updateTreeSelection(false);
        updateScopeCounts();
    }

    function visibleTreeItems() {
        return qsa(".tree-item", els.tree).filter(li => !li.parentElement.closest("[hidden]"));
    }

    function setExpanded(li, expanded) {
        if (!li.hasAttribute("aria-expanded")) {
            return;
        }
        li.setAttribute("aria-expanded", expanded ? "true" : "false");
        const ul = li.querySelector(":scope > ul");
        if (ul) {
            ul.hidden = !expanded;
        }
        if (!treeFilter.trim()) {
            treeState[li.dataset.key] = expanded;
            storage.setJSON(KEYS.tree, treeState);
        }
    }

    function focusTreeItem(li) {
        if (!li) {
            return;
        }
        qsa('.tree-item[tabindex="0"]', els.tree).forEach(x => x.tabIndex = -1);
        li.tabIndex = 0;
        li.focus();
    }

    function activateTreeItem(li) {
        if (li.classList.contains("tree-method")) {
            selectMethod(li.dataset.service, li.dataset.method);
        } else {
            setExpanded(li, li.getAttribute("aria-expanded") !== "true");
        }
    }

    function updateTreeSelection(scroll) {
        let selected = null;
        for (const li of qsa(".tree-method", els.tree)) {
            const on = li.dataset.service === state.service && li.dataset.method === state.method;
            li.setAttribute("aria-selected", on ? "true" : "false");
            if (on) {
                selected = li;
            }
        }
        qsa('.tree-item[tabindex="0"]', els.tree).forEach(x => x.tabIndex = -1);
        const rovingTarget = selected || qs(".tree-item", els.tree);
        if (rovingTarget) {
            rovingTarget.tabIndex = 0;
        }
        if (selected) {
            // make sure every ancestor is expanded
            let p = selected.parentElement.closest(".tree-item");
            while (p) {
                if (p.getAttribute("aria-expanded") === "false") {
                    setExpanded(p, true);
                }
                p = p.parentElement.closest(".tree-item");
            }
            if (scroll) {
                selected.scrollIntoView({block: "nearest"});
            }
        }
    }

    els.tree.addEventListener("click", e => {
        const row = e.target.closest(".tree-row");
        if (!row) {
            return;
        }
        const li = row.parentElement;
        focusTreeItem(li);
        activateTreeItem(li);
    });

    els.tree.addEventListener("keydown", e => {
        // only handle keys when a tree item itself has focus (not a button in it)
        const cur = e.target.classList && e.target.classList.contains("tree-item") ? e.target : null;
        if (!cur || e.metaKey || e.ctrlKey || e.altKey) {
            return;
        }
        const items = visibleTreeItems();
        const i = items.indexOf(cur);
        const expandable = cur.hasAttribute("aria-expanded");
        const expanded = cur.getAttribute("aria-expanded") === "true";
        switch (e.key) {
            case "ArrowDown":
                focusTreeItem(items[Math.min(i + 1, items.length - 1)]);
                break;
            case "ArrowUp":
                if (i === 0) {
                    els.search.focus();
                } else {
                    focusTreeItem(items[i - 1]);
                }
                break;
            case "Home":
                focusTreeItem(items[0]);
                break;
            case "End":
                focusTreeItem(items[items.length - 1]);
                break;
            case "ArrowRight":
                if (expandable && !expanded) {
                    setExpanded(cur, true);
                } else if (expandable) {
                    focusTreeItem(items[i + 1]);
                }
                break;
            case "ArrowLeft":
                if (expandable && expanded) {
                    setExpanded(cur, false);
                } else {
                    focusTreeItem(cur.parentElement.closest(".tree-item"));
                }
                break;
            case "Enter":
            case " ":
                activateTreeItem(cur);
                break;
            default:
                return;
        }
        e.preventDefault();
    });

    els.search.addEventListener("input", () => {
        treeFilter = els.search.value;
        renderTree();
    });
    els.search.addEventListener("keydown", e => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            focusTreeItem(visibleTreeItems()[0]);
        } else if (e.key === "Enter") {
            e.preventDefault();
            const first = qs(".tree-method", els.tree);
            if (first) {
                selectMethod(first.dataset.service, first.dataset.method);
                focusTreeItem(first);
            }
        } else if (e.key === "Escape" && els.search.value) {
            e.preventDefault();
            e.stopPropagation();
            els.search.value = "";
            treeFilter = "";
            renderTree();
        }
    });

    function focusSearch() {
        if (!wideScreen.matches) {
            toggleSidebar(true);
        } else if (rootEl.classList.contains("sidebar-collapsed")) {
            toggleSidebar(true);
        }
        els.search.focus();
        els.search.select();
    }

    // ----- breadcrumb and method card -----

    function renderBreadcrumb() {
        const bc = els.breadcrumb;
        bc.replaceChildren();
        if (!state.service) {
            return;
        }
        const {pkg, name} = splitService(state.service);
        if (pkg) {
            bc.appendChild(h("span", {class: "crumb crumb-pkg", text: pkg}));
            bc.appendChild(icon("chevron-right", 14, "crumb-pkg"));
        }
        bc.appendChild(h("span", {class: "crumb", text: name}));
        bc.appendChild(icon("chevron-right", 14));
        bc.appendChild(h("span", {class: "crumb crumb-current", text: state.method}));
    }

    function renderMethodCard() {
        if (!state.service) {
            els.methodCard.replaceChildren();
            return;
        }
        const full = state.service + "." + state.method;
        const def = dedent(mtdDescs[full] || "");
        const details = h("details", {class: "card gu-method-card"},
            h("summary", {class: "card-head"},
                h("div", {class: "gu-method-titles"},
                    h("div", {class: "gu-method-name"}, h("span", {text: state.method}), streamBadge(methodInfo(state.service, state.method))),
                    h("div", {class: "gu-method-svc mono", text: state.service})),
                def ? h("span", {class: "gu-method-toggle muted"}, "Definition", icon("chevron-down", 14, "chevron")) : null),
            def ? h("pre", {class: "gu-method-def", text: def}) : null);
        details.open = !!def && storage.get(KEYS.description) !== "false";
        details.addEventListener("toggle", () => storage.set(KEYS.description, details.open ? "true" : "false"));
        if (!def) {
            details.querySelector("summary").addEventListener("click", e => e.preventDefault());
        }
        els.methodCard.replaceChildren(details);
    }

    // ----- method selection -----

    function setInvokeEnabled(on) {
        els.invoke.disabled = !on;
    }

    function persistSelection() {
        if (!hasMethod(state.service, state.method)) {
            return;
        }
        storage.set(KEYS.service, state.service);
        storage.set(KEYS.method, state.method);
        try {
            const url = new URL(window.location.href);
            url.searchParams.set("serviceName", state.service);
            url.searchParams.set("methodName", state.method);
            window.history.replaceState(null, "", url.toString());
        } catch (e) {
            // ignore: some embedding pages do not allow replaceState
        }
    }

    // Selects a method and loads its schema. opts.onReady runs once the form
    // has been built.
    function selectMethod(svc, method, opts) {
        opts = opts || {};
        if (!hasMethod(svc, method)) {
            return;
        }
        if (validation && !validation.element.isConnected) {
            validation = null;
        }
        const changed = svc !== state.service || method !== state.method;
        state.service = svc;
        state.method = method;
        if (changed) {
            state.activeExample = -1;
            if (!opts.fromLoad) {
                // a history replay only switches inheritance off for that request
                state.inheritOff = false;
                state.skipInherited = new Set();
            }
        }
        if (!wideScreen.matches) {
            toggleSidebar(false);
        }
        updateTreeSelection(true);
        renderBreadcrumb();
        renderMethodCard();
        renderMetadataSection();
        resetResponse();

        state.schemaReady = false;
        state.schema = null;
        setInvokeEnabled(false);
        els.form.replaceChildren(h("div", {class: "form-skeleton", "aria-busy": "true"}, h("div"), h("div"), h("div")));

        const seq = ++state.loadSeq;
        api(metadataURI + "?method=" + encodeURIComponent(svc + "." + method))
            .then(schema => {
                if (seq !== state.loadSeq) {
                    return;
                }
                buildRequestForm(schema);
                persistSelection();
                if (opts.onReady) {
                    opts.onReady();
                }
            })
            .catch(e => {
                if (seq !== state.loadSeq) {
                    return;
                }
                if (debug) {
                    console.trace(e);
                }
                els.form.replaceChildren(alertBox("destructive", "Couldn't load this method", e.message));
            });
    }

    function alertBox(variant, title, desc) {
        return h("div", {class: "alert alert-" + variant, role: variant === "destructive" ? "alert" : null},
            icon(variant === "destructive" ? "alert" : "info", 16),
            h("div", {class: "alert-body"},
                h("div", {class: "alert-title", text: title}),
                desc ? h("div", {class: "alert-desc", text: desc}) : null));
    }

    // Fetches JSON. Adds headers from the optional window.grpcui.requestHeaders()
    // hook (the standalone page uses it for the CSRF token).
    async function api(url, opts) {
        opts = opts || {};
        const headers = {};
        if (opts.body !== undefined) {
            headers["Content-Type"] = "application/json";
        }
        const hook = window.grpcui && window.grpcui.requestHeaders;
        if (typeof hook === "function") {
            Object.assign(headers, hook({url: url, method: opts.method || "GET"}) || {});
        }
        let resp;
        try {
            resp = await fetch(url, {
                method: opts.method || "GET",
                headers: headers,
                body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
                credentials: "same-origin",
            });
        } catch (e) {
            const err = new Error("Couldn't reach the gRPC UI server. Check that it's still running.");
            err.status = 0;
            throw err;
        }
        const text = await resp.text();
        if (!resp.ok) {
            const err = new Error((text || "").trim() || resp.statusText || ("HTTP " + resp.status));
            err.status = resp.status;
            throw err;
        }
        return text ? JSON.parse(text) : null;
    }

    // ---------------------------------------------------------------------
    // Metadata scopes
    //
    // Metadata can be set at several scopes. For a selected method the chain
    // is, lowest priority first:
    //   server defaults (-H flags, read-only), global, each package prefix
    //   (a, a.b, a.b.c), the service, the method, then this request.
    // A header set at a higher scope replaces every value of that header
    // from lower scopes. A row that is switched off removes the header from
    // that scope down. Names compare case-insensitively.
    // ---------------------------------------------------------------------

    let mdScopes = storage.getJSON(KEYS.metadata, {});
    if (!mdScopes || typeof mdScopes !== "object" || Array.isArray(mdScopes)) {
        mdScopes = {};
    }

    function scopeRows(key) {
        if (!Array.isArray(mdScopes[key])) {
            mdScopes[key] = [];
        }
        return mdScopes[key];
    }

    function rowsFor(key) {
        if (key === "defaults") {
            return defaultMetadata;
        }
        return Array.isArray(mdScopes[key]) ? mdScopes[key] : [];
    }

    function saveScopes() {
        // keep arrays in memory (editors hold references), but skip empty
        // ones when saving
        const out = {};
        for (const k of Object.keys(mdScopes)) {
            if (Array.isArray(mdScopes[k]) && mdScopes[k].length) {
                out[k] = mdScopes[k];
            }
        }
        storage.setJSON(KEYS.metadata, out);
    }

    function scopeCount(key) {
        return rowsFor(key).filter(r => r.name && r.name.trim()).length;
    }

    function scopeName(key) {
        if (key === "defaults") {
            return "server defaults";
        }
        if (key === "global") {
            return "global";
        }
        if (key === "request") {
            return "this request";
        }
        return key.slice(key.indexOf(":") + 1);
    }

    function scopeTitle(key) {
        if (key === "global") {
            return "Global";
        }
        const kind = key.startsWith("pkg:") ? "Package" : key.startsWith("svc:") ? "Service" : "Method";
        return kind + " " + scopeName(key);
    }

    function scopeHelp(key) {
        const name = scopeName(key);
        if (key === "global") {
            return "Sent with every request. Packages, services and methods can override these.";
        }
        if (key.startsWith("pkg:")) {
            return "Sent with every method in " + name + " and the packages under it. Deeper packages, services and methods override these.";
        }
        if (key.startsWith("svc:")) {
            return "Sent with every method of " + name + ". Methods override these.";
        }
        return "Sent with every call to " + name + ".";
    }

    // The scopes a given scope inherits from, lowest priority first.
    function chainAbove(key) {
        if (key === "global") {
            return ["defaults"];
        }
        if (key.startsWith("pkg:")) {
            const prefixes = packagePrefixes(key.slice(4));
            return ["defaults", "global"].concat(prefixes.slice(0, -1).map(p => "pkg:" + p));
        }
        if (key.startsWith("svc:")) {
            const svc = key.slice(4);
            return ["defaults", "global"].concat(packagePrefixes(splitService(svc).pkg).map(p => "pkg:" + p));
        }
        if (key.startsWith("mtd:")) {
            const full = key.slice(4);
            const svc = full.slice(0, full.lastIndexOf("."));
            return chainAbove("svc:" + svc).concat(["svc:" + svc]);
        }
        return [];
    }

    function chainFor(svc, method) {
        return chainAbove("mtd:" + svc + "." + method).concat(["mtd:" + svc + "." + method]);
    }

    // Merges layers into a Map: lower-case name -> {name, values, source}.
    // layers: array of scope keys or {key, rows} objects.
    function resolveMetadata(layers) {
        const eff = new Map();
        for (const layer of layers) {
            const key = typeof layer === "string" ? layer : layer.key;
            const rows = typeof layer === "string" ? rowsFor(layer) : layer.rows;
            const byName = new Map();
            for (const r of rows) {
                const name = (r.name || "").trim();
                if (!name) {
                    continue;
                }
                const lk = name.toLowerCase();
                if (!byName.has(lk)) {
                    byName.set(lk, {name: name, values: [], on: false});
                }
                const g = byName.get(lk);
                if (r.enabled !== false) {
                    g.values.push(r.value || "");
                    g.on = true;
                }
            }
            for (const [lk, g] of byName) {
                if (g.on) {
                    eff.set(lk, {name: g.name, values: g.values, source: key});
                } else {
                    eff.delete(lk);
                }
            }
        }
        return eff;
    }

    function flattenMetadata(eff) {
        const out = [];
        for (const e of eff.values()) {
            for (const v of e.values) {
                out.push({name: e.name, value: v, source: e.source});
            }
        }
        return out;
    }

    function inheritedMetadata() {
        if (!state.service) {
            return new Map();
        }
        return resolveMetadata(chainFor(state.service, state.method));
    }

    // The metadata that is actually sent for the current request.
    function effectiveMetadata() {
        const request = {key: "request", rows: state.requestRows};
        if (state.inheritOff || !state.service) {
            return flattenMetadata(resolveMetadata([request]));
        }
        const skip = {key: "skip", rows: Array.from(state.skipInherited).map(n => ({name: n, enabled: false}))};
        return flattenMetadata(resolveMetadata(chainFor(state.service, state.method).concat([skip, request])));
    }

    // Editable list of {name, value, enabled} rows. Mutates rows in place and
    // calls onChange after every edit.
    function metadataEditor(rows, onChange) {
        const list = h("div", {class: "md-rows"});

        function rowEl(r) {
            const sw = h("input", {type: "checkbox", class: "switch", checked: r.enabled !== false, "aria-label": "Send this header", "data-tooltip": "Send this header"});
            const name = h("input", {class: "input input-sm mono md-name", placeholder: "name", value: r.name || "", spellcheck: "false", autocomplete: "off", "aria-label": "Header name"});
            const value = h("input", {class: "input input-sm mono md-value", placeholder: "value", value: r.value || "", spellcheck: "false", autocomplete: "off", "aria-label": "Header value"});
            const del = h("button", {type: "button", class: "btn btn-ghost btn-icon btn-xs", "aria-label": "Remove header", "data-tooltip": "Remove"}, icon("x", 14));
            const el = h("div", {class: "md-row" + (r.enabled === false ? " off" : "")}, sw, name, value, del);
            sw.addEventListener("change", () => {
                r.enabled = sw.checked;
                el.classList.toggle("off", !sw.checked);
                onChange();
            });
            name.addEventListener("input", () => {
                r.name = name.value;
                onChange();
            });
            value.addEventListener("input", () => {
                r.value = value.value;
                onChange();
            });
            del.addEventListener("click", () => {
                const i = rows.indexOf(r);
                if (i >= 0) {
                    rows.splice(i, 1);
                }
                const next = el.nextElementSibling || el.previousElementSibling;
                el.remove();
                onChange();
                const focusTarget = next ? qs(".md-name", next) : addBtn;
                focusTarget.focus();
            });
            return el;
        }

        const addBtn = h("button", {type: "button", class: "btn btn-ghost btn-xs md-add"}, icon("plus", 14), "Add header");
        addBtn.addEventListener("click", () => {
            const r = {name: "", value: "", enabled: true};
            rows.push(r);
            const el = rowEl(r);
            list.appendChild(el);
            qs(".md-name", el).focus();
            onChange();
        });
        rows.forEach(r => list.appendChild(rowEl(r)));
        return h("div", {class: "md-editor"}, list, addBtn);
    }

    // Read-only list of inherited headers.
    // opts: {isOn(lk), setOn(lk, on), isOverridden(lk), onOverride(entry), onOpenSource(key)}
    function inheritedList(eff, opts) {
        const wrap = h("div", {class: "md-inh"});
        for (const [lk, e] of eff) {
            const on = opts.isOn ? opts.isOn(lk) : true;
            const overridden = opts.isOverridden ? opts.isOverridden(lk) : false;
            let toggle = h("span");
            if (opts.setOn) {
                toggle = h("input", {type: "checkbox", class: "switch", checked: on, "aria-label": "Send " + e.name + " with this request", "data-tooltip": "Send with this request"});
                toggle.addEventListener("change", () => opts.setOn(lk, toggle.checked));
            }
            const sourceLabel = "from " + scopeName(e.source);
            const source = e.source === "defaults"
                ? h("span", {class: "badge md-source", text: sourceLabel, "data-tooltip": "Set with the -H flag when grpcui started"})
                : h("button", {type: "button", class: "badge md-source", text: sourceLabel, "data-tooltip": "Edit " + scopeTitle(e.source).toLowerCase()});
            if (e.source !== "defaults") {
                source.addEventListener("click", () => opts.onOpenSource(e.source));
            }
            const meta = h("div", {class: "md-inh-meta"}, overridden ? h("span", {class: "badge badge-outline", text: "overridden"}) : null, source);
            if (opts.onOverride) {
                const ov = h("button", {type: "button", class: "btn btn-ghost btn-xs", "data-tooltip": "Copy to this scope to change it"}, "Override");
                ov.addEventListener("click", () => opts.onOverride(e));
                meta.appendChild(ov);
            }
            wrap.appendChild(h("div", {class: "md-inh-row" + (on ? "" : " off") + (overridden ? " overridden" : "")},
                toggle,
                h("span", {class: "md-name", text: e.name, title: e.name}),
                h("span", {class: "md-value", text: e.values.join(", "), title: e.values.join("\n")}),
                meta));
        }
        return wrap;
    }

    // ----- Metadata card in the request panel -----

    let mdCountEl = null;
    let mdInheritedEl = null;

    function renderMetadataSection() {
        mdCountEl = h("span", {class: "badge badge-secondary"});
        mdInheritedEl = h("div", {class: "md-inherited"});
        const editor = metadataEditor(state.requestRows, () => refreshMetadataViews());
        const details = h("details", {class: "card gu-md-card"},
            h("summary", {class: "card-head"},
                icon("chevron-down", 16, "chevron"),
                h("span", {text: "Metadata"}),
                mdCountEl),
            h("div", {class: "card-body"},
                mdInheritedEl,
                h("div", {class: "md-section"},
                    h("h3", {class: "md-title", text: "This request"}),
                    editor)));
        details.open = storage.get(KEYS.metadataOpen) !== "false";
        details.addEventListener("toggle", () => storage.set(KEYS.metadataOpen, details.open ? "true" : "false"));
        els.metadata.replaceChildren(details);
        refreshMetadataViews();
    }

    function refreshMetadataViews() {
        if (!mdCountEl) {
            return;
        }
        const n = effectiveMetadata().length;
        mdCountEl.textContent = String(n);
        mdCountEl.hidden = n === 0;

        const content = [];
        if (state.inheritOff) {
            const on = h("button", {type: "button", class: "btn btn-outline btn-xs"}, "Turn on");
            on.addEventListener("click", () => {
                state.inheritOff = false;
                refreshMetadataViews();
            });
            content.push(h("div", {class: "notice"}, icon("info", 14),
                h("span", null, "Inherited metadata is off, so this request replays exactly as it was sent."),
                h("div", {class: "gu-spacer"}), on));
        } else if (state.service) {
            const eff = inheritedMetadata();
            const requestNames = new Set(state.requestRows.filter(r => r.name && r.name.trim()).map(r => r.name.trim().toLowerCase()));
            if (eff.size > 0) {
                content.push(h("h3", {class: "md-title", text: "Inherited"}));
                content.push(inheritedList(eff, {
                    isOn: lk => !state.skipInherited.has(lk),
                    setOn: (lk, on) => {
                        if (on) {
                            state.skipInherited.delete(lk);
                        } else {
                            state.skipInherited.add(lk);
                        }
                        refreshMetadataViews();
                    },
                    isOverridden: lk => requestNames.has(lk),
                    onOpenSource: key => openScopeSheet([key], key),
                }));
            } else {
                content.push(h("p", {class: "md-empty"},
                    "Nothing inherited. Use the ", icon("tag", 12), " button next to a package, service or method to set metadata for all of its calls."));
            }
        }
        mdInheritedEl.replaceChildren(h("div", {class: "md-section"}, content));
        updateCurlCommand();
    }

    // ----- scope panel -----

    function updateScopeCounts() {
        for (const btn of qsa(".tree-tag", els.tree)) {
            let keys = [];
            try {
                keys = JSON.parse(btn.dataset.scopes || "[]");
            } catch (e) {
                keys = [];
            }
            const n = keys.reduce((sum, k) => sum + scopeCount(k), 0);
            btn.classList.toggle("has-count", n > 0);
            qs(".tag-count", btn).textContent = n > 0 ? String(n) : "";
        }
        const g = scopeCount("global");
        els.globalCount.textContent = String(g);
        els.globalCount.hidden = g === 0;
    }

    // Opens the metadata panel for one of the given scopes. keys has more
    // than one entry for a compacted package row (a level picker is shown).
    function openScopeSheet(keys, initial) {
        let current = initial || keys[keys.length - 1];
        const body = h("div");
        const sheet = openSheet({
            title: "Metadata",
            body: body,
            footer: [h("span", {class: "muted text-sm", text: "Saved in this browser."})],
        });

        function onEdit() {
            saveScopes();
            updateScopeCounts();
            refreshMetadataViews();
        }

        function render() {
            sheet.setTitle("Metadata · " + scopeTitle(current));
            sheet.setDescription(scopeHelp(current));
            const parts = [];
            if (keys.length > 1) {
                const seg = h("div", {class: "segmented", role: "group", "aria-label": "Package level", style: {marginBottom: "16px", flexWrap: "wrap"}});
                for (const k of keys) {
                    const b = h("button", {type: "button", "aria-pressed": k === current ? "true" : "false", class: "mono", text: scopeName(k)});
                    b.addEventListener("click", () => {
                        current = k;
                        render();
                    });
                    seg.appendChild(b);
                }
                parts.push(seg);
            }
            parts.push(h("div", {class: "md-section"},
                h("h3", {class: "md-title", text: "Set here"}),
                metadataEditor(scopeRows(current), onEdit)));
            const eff = resolveMetadata(chainAbove(current));
            if (eff.size > 0) {
                const own = new Set(rowsFor(current).filter(r => r.name && r.name.trim()).map(r => r.name.trim().toLowerCase()));
                parts.push(h("div", {class: "md-section"},
                    h("h3", {class: "md-title", text: "Inherited"}),
                    inheritedList(eff, {
                        isOverridden: lk => own.has(lk),
                        onOverride: e => {
                            scopeRows(current).push({name: e.name, value: e.values[0] || "", enabled: true});
                            onEdit();
                            render();
                        },
                        onOpenSource: key => {
                            if (keys.includes(key)) {
                                current = key;
                                render();
                            } else {
                                openScopeSheet([key], key);
                            }
                        },
                    })));
            }
            parts.push(h("p", {class: "muted text-sm", style: {marginTop: "16px"}},
                "Switch a header off here to stop it being inherited from above."));
            body.replaceChildren(...parts);
        }
        render();
    }

    qs("#gu-global-md").addEventListener("click", () => openScopeSheet(["global"], "global"));

    // ---------------------------------------------------------------------
    // Request form
    //
    // There are three representations of the request to keep in sync: the
    // raw JSON (JSON tab), the request object (state.request) and the form,
    // which is a hierarchy of inputs.
    //
    // If the raw JSON is edited, it is parsed and the whole form is rebuilt
    // from the result. As form inputs are edited, their paths are used to
    // update the request object in place, and the JSON is re-serialized.
    //
    // Each input has: parent, children (array or object), value, setValue(v),
    // and onChange/onAdd/onDelete(child, revPath, val) which bubble changes
    // up the tree. revPath is reversed: first element is the leaf.
    //
    // The add*ToForm functions take (schema, container, parent, pathLen,
    // value, allowMissing, fld). They render into container and return the
    // new input; the caller attaches it to the parent. If allowMissing is
    // true, missing required fields get defaults; otherwise they throw.
    // ---------------------------------------------------------------------

    let radioSeq = 0;

    function buildRequestForm(schema) {
        state.schema = schema;
        let requestObj = getInitialMessageValue(schema.requestType);
        if (schema.requestStream) {
            requestObj = [requestObj];
        }
        try {
            rebuildRequestForm(requestObj, true);
        } catch (e) {
            if (debug) {
                console.trace(e);
            }
            els.form.replaceChildren(alertBox("destructive", "Couldn't build the form", e.message || String(e)));
            state.schemaReady = true;
            setInvokeEnabled(true);
            return;
        }
        updateJSONRequest(requestObj);
        state.schemaReady = true;
        setInvokeEnabled(true);
        updateMessageList(schema.messageTypes);
    }

    function updateMessageList(messageTypes) {
        const names = new Set([
            "google.protobuf.Int32Value", "google.protobuf.UInt32Value",
            "google.protobuf.Int64Value", "google.protobuf.UInt64Value",
            "google.protobuf.DoubleValue", "google.protobuf.FloatValue",
            "google.protobuf.StringValue", "google.protobuf.BytesValue",
            "google.protobuf.BoolValue", "google.protobuf.Timestamp",
            "google.protobuf.Duration", "google.protobuf.Value",
            "google.protobuf.Struct", "google.protobuf.ListValue",
        ]);
        for (const p of Object.keys(messageTypes || {})) {
            // Any can't hold itself, so leave it out
            if (p !== "google.protobuf.Any") {
                names.add(p);
            }
        }
        const list = qs("#grpc-message-types");
        if (list) {
            list.replaceChildren(...Array.from(names).sort().map(n => h("option", {value: n, text: n})));
        }
    }

    // Rebuilds the form so it represents newRequest. Throws if the value is
    // invalid; the existing form is kept in that case.
    function rebuildRequestForm(newRequest, allowMissing) {
        const schema = state.schema;
        const fldDef = {
            name: "",
            type: schema.requestType,
            oneOfFields: [],
            isMessage: true,
            isEnum: false,
            isArray: schema.requestStream,
            isMap: false,
            isRequired: false,
            defaultVal: null,
            description: "",
        };
        const table = h("table", {class: "form-table"},
            h("tr", {class: "form-root-head"},
                h("th", {colspan: "3"},
                    schema.requestStream ? h("span", {class: "badge badge-stream", text: "stream"}) : null,
                    h("span", {class: "mono", text: schema.requestType}))));
        const div = h("div", {class: "form-root"}, table);
        addElementToForm(schema, table, newRootInput(), 0, newRequest, allowMissing, fldDef);
        if (validation && !validation.element.isConnected) {
            validation = null;
        }
        if (validation && els.form.contains(validation.element)) {
            validation = null;
        }
        state.request = newRequest;
        els.form.replaceChildren(div);
    }

    // Adds an input for the field described by fld. Handles everything but
    // oneofs (those are only valid in a message; see addMessageToForm).
    function addElementToForm(schema, container, parent, pathLen, value, allowMissing, fld) {
        if (fld.isMap) {
            return addMapToForm(schema, container, parent, pathLen, value, allowMissing, fld);
        }
        if (fld.isArray) {
            return addArrayToForm(schema, container, parent, pathLen, value, allowMissing, "repeated " + fld.type, fld);
        }
        if (fld.type === "google.protobuf.ListValue") {
            // treat ListValue as if it were 'repeated Value'
            const elemType = {
                name: fld.name,
                protoName: fld.protoName,
                type: "google.protobuf.Value",
                oneOfFields: [],
                isMessage: true,
                isEnum: false,
                isArray: true,
                isMap: false,
                isRequired: false,
                defaultVal: null,
                description: fld.description,
            };
            return addArrayToForm(schema, container, parent, pathLen, value, allowMissing, fld.type, elemType);
        }
        if (fld.isMessage && !isWellKnown(fld.type)) {
            return addMessageToForm(schema, container, parent, pathLen, value, allowMissing, fld);
        }
        if (fld.type === "google.protobuf.Any") {
            return addAnyToForm(schema, container, parent, pathLen, value, allowMissing, fld);
        }

        // Remaining cases are leaf inputs. The root table needs a row and cell.
        container = maybeMakeInputContainer(container, pathLen);

        if (fld.isEnum) {
            return addEnumToForm(schema, container, parent, value, fld);
        }
        switch (fld.type) {
            case "int32": case "sint32": case "sfixed32": case "google.protobuf.Int32Value":
                return addIntToForm(container, parent, value, fld, MIN_INT32, MAX_INT32);
            case "uint32": case "fixed32": case "google.protobuf.UInt32Value":
                return addIntToForm(container, parent, value, fld, 0, MAX_UINT32);
            case "int64": case "sint64": case "sfixed64": case "google.protobuf.Int64Value":
                return addStringIntToForm(container, parent, value, fld, MIN_INT64, MAX_INT64);
            case "uint64": case "fixed64": case "google.protobuf.UInt64Value":
                return addStringIntToForm(container, parent, value, fld, "0", MAX_UINT64);
            case "double": case "float": case "google.protobuf.DoubleValue": case "google.protobuf.FloatValue":
                return addDoubleToForm(container, parent, value, fld);
            case "string": case "google.protobuf.StringValue":
                return addStringToForm(container, parent, value, fld);
            case "bytes": case "google.protobuf.BytesValue":
                return addBytesToForm(container, parent, value, fld);
            case "bool": case "google.protobuf.BoolValue":
                return addBoolToForm(container, parent, value, fld);
            case "google.protobuf.Timestamp":
                return addTimestampToForm(container, parent, value, fld);
            case "google.protobuf.Duration":
                return addDurationToForm(container, parent, value, fld);
            case "google.protobuf.Value": case "google.protobuf.Struct":
                return addJSONToForm(container, parent, value, fld, fld.type === "google.protobuf.Struct");
            default:
                throw new Error("Unable to handle non-message non-enum type " + fld.type);
        }
    }

    // Maps are rendered as arrays of key+value entries (that is also how the
    // schema describes them). The map input uses an array input for its
    // children and translates the array's change notifications into map keys.
    function addMapToForm(schema, container, parent, pathLen, value, allowMissing, fld) {
        const mapEntryFields = schema.messageTypes[fld.type];
        const mapType = "map<" + mapEntryFields[0].type + "," + mapEntryFields[1].type + ">";

        if (isUnset(value)) {
            value = {};
        } else if (typeof value !== "object" || Array.isArray(value)) {
            throw typeError(mapType, value, "object");
        }

        const input = new Input(parent);
        input.childKeys = [];

        const arrayVal = [];
        for (const k of Object.keys(value)) {
            const entry = {};
            entry[mapEntryFields[0].name] = k;
            entry[mapEntryFields[1].name] = value[k];
            arrayVal.push(entry);
            input.childKeys.push(k);
        }

        input.asArray = addArrayToForm(schema, container, input, pathLen, arrayVal, allowMissing, mapType, fld);

        input.doOnChange = function(child, revPath, val, nextFunc) {
            const index = +revPath[revPath.length - 1];
            const key = this.childKeys[index];
            if (revPath.length === 2 && revPath[0] === "key") {
                // the key changed: make sure keys stay unique
                const newKey = val;
                for (let i = 0; i < this.childKeys.length; i++) {
                    if (i !== index && this.childKeys[i] === newKey) {
                        throw new Error('key "' + newKey + '" is a duplicate');
                    }
                }
                const entryVal = this.asArray.children[index]["value"].value;
                this.parent.onAdd(this, [newKey], entryVal);
                if (!isUnset(key)) {
                    this.parent.onDelete(this, [key]);
                }
                this.childKeys[index] = newKey;
                return;
            }
            if (isUnset(key)) {
                // not in the request object yet
                return;
            }
            // replace the last two path elements (index and 'value') with the key
            revPath.splice(revPath.length - 1, 1);
            revPath[revPath.length - 1] = key;
            this.parent[nextFunc].call(this.parent, this, revPath, val);
        };
        input.onAdd = function(child, revPath, val) {
            if (revPath.length <= 1) {
                // A new entry. An undefined key means it is not in the request
                // object yet, so the user can edit the key first.
                this.childKeys.push(undefined);
            } else {
                this.doOnChange(child, revPath, val, "onAdd");
            }
        };
        input.onChange = function(child, revPath, val) {
            this.doOnChange(child, revPath, val, "onChange");
        };
        input.onDelete = function(child, revPath) {
            const index = revPath[revPath.length - 1];
            const key = this.childKeys[index];
            if (isUnset(key)) {
                return;
            }
            if (revPath.length === 1) {
                this.parent.onDelete(this, [key]);
                this.childKeys.splice(index, 1);
                return;
            }
            revPath.splice(revPath.length - 1, 1);
            revPath[revPath.length - 1] = key;
            this.parent.onDelete(this, revPath);
        };
        return input;
    }

    // Arrays render as a table: one row per element, with remove and add buttons.
    function addArrayToForm(schema, container, parent, pathLen, value, allowMissing, typeName, fld) {
        if (isUnset(value)) {
            value = [];
        } else if (!Array.isArray(value)) {
            throw typeError(typeName, value, "array");
        }

        const table = makeTableContainer(container, pathLen);
        table.classList.add("array-table");
        const children = [];
        const input = new Input(parent, children, value);

        const elementFld = {
            name: fld.name,
            protoName: fld.protoName,
            type: fld.type,
            oneOfFields: [],
            isMessage: fld.isMessage,
            isEnum: fld.isEnum,
            isArray: false,
            isMap: false,
            isMapEntry: fld.isMap,
            isRequired: false,
        };

        for (let i = 0; i < value.length; i++) {
            const row = newArrayRow(input);
            const cell = h("td", {class: "array-value"});
            row.appendChild(cell);
            table.appendChild(row);
            const child = addElementToForm(schema, cell, input, pathLen + 1, value[i], allowMissing, elementFld);
            child.row = row;
            children.push(child);
        }

        const addBtn = h("button", {type: "button", class: "btn btn-ghost btn-xs array-add"}, icon("plus", 14), "Add item");
        const addRow = h("tr", {class: "array-add-row"}, h("td", {colspan: "2"}, addBtn));
        table.appendChild(addRow);

        addBtn.addEventListener("click", () => {
            const elementVal = getInitialValue(schema, elementFld);
            const newRow = newArrayRow(input);
            const cell = h("td", {class: "array-value"});
            newRow.appendChild(cell);
            addRow.before(newRow);
            const child = addElementToForm(schema, cell, input, pathLen + 1, elementVal, true, elementFld);
            child.row = newRow;
            children.push(child);
            input.onAdd(child, [], elementVal);
            if (fld.isMap) {
                // the key likely needs editing right away so keys stay unique
                const first = newRow.querySelector("input, textarea");
                if (first) {
                    first.focus();
                    first.scrollIntoView({block: "nearest"});
                }
            }
        });
        return input;
    }

    function newArrayRow(input) {
        const del = h("button", {type: "button", class: "btn btn-ghost btn-icon btn-xs", "aria-label": "Remove item", "data-tooltip": "Remove item"}, icon("x", 14));
        const row = h("tr", {class: "array_element"}, h("td", {class: "array-actions"}, del));
        del.addEventListener("click", () => {
            const children = input.children;
            const idx = children.findIndex(c => c.row === row);
            forgetValidationIn(row);
            row.remove();
            if (idx < 0) {
                return;
            }
            input.onDelete(children[idx], []);
            children.splice(idx, 1);
        });
        return row;
    }

    // Messages render as a table with one row per field. Non-repeated fields
    // outside a oneof have a presence switch, or "*" if required.
    function addMessageToForm(schema, container, parent, pathLen, value, allowMissing, fld) {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
            throw typeError(fld.type, value, "object");
        }
        const fields = schema.messageTypes[fld.type];
        value = canonicalizeFields(value, fld.type, fields);

        const table = makeTableContainer(container, pathLen);
        const children = {};
        const input = new Input(parent, children, value);

        for (const currField of fields) {
            const row = h("tr", {class: "message_field"});
            table.appendChild(row);
            row.appendChild(makeFieldLabelCell(currField, schema));

            if (isOneOf(currField)) {
                const cell = h("td", {colspan: "2"});
                row.appendChild(cell);
                Object.assign(children, addOneOfFieldsToForm(schema, cell, input, pathLen, value, allowMissing, currField));
                continue;
            }

            let fldVal = value[currField.name];

            if (currField.isArray || currField.isMap) {
                const cell = h("td", {colspan: "2"});
                row.appendChild(cell);
                if (isUnset(fldVal)) {
                    fldVal = currField.isMap ? {} : [];
                    value[currField.name] = fldVal;
                }
                children[currField.name] = addElementToForm(schema, cell, input, pathLen + 1, fldVal, allowMissing, currField);
                continue;
            }

            const required = fld.isMapEntry || currField.isRequired;
            let checkbox = null;
            if (!fld.isMapEntry) {
                const cell = h("td", {class: "field-presence"});
                if (currField.isRequired) {
                    cell.appendChild(h("span", {class: "required", "data-tooltip": "Required", text: "*"}));
                } else {
                    checkbox = h("input", {
                        type: "checkbox",
                        class: "switch",
                        checked: !isUnset(fldVal),
                        "aria-label": "Set " + (currField.protoName || currField.name),
                        "data-tooltip": "Set or unset this field",
                    });
                    cell.appendChild(checkbox);
                }
                row.appendChild(cell);
            }

            const cell = h("td", {class: "field-value"});
            if (isUnset(fldVal) && required) {
                if (allowMissing) {
                    fldVal = getInitialValue(schema, currField);
                    value[currField.name] = fldVal;
                } else {
                    throw new Error("value for required field " + currField.name + " is missing");
                }
            }
            let child;
            if (!currField.isRequired && currField.isMessage) {
                child = addOptionalMessage(schema, cell, input, pathLen + 1, fldVal, allowMissing, currField);
            } else {
                child = addElementToForm(schema, cell, input, pathLen + 1, fldVal, allowMissing, currField);
            }
            child.fld = currField;
            children[currField.name] = child;
            row.appendChild(cell);

            if (checkbox) {
                const theField = currField;
                const theBox = checkbox;
                theBox.addEventListener("change", () => {
                    forgetValidationIn(cell);
                    cell.replaceChildren();
                    const newVal = theBox.checked ? getInitialValue(schema, theField) : undefined;
                    const newChild = theField.isMessage
                        ? addOptionalMessage(schema, cell, input, pathLen + 1, newVal, true, theField)
                        : addElementToForm(schema, cell, input, pathLen + 1, newVal, true, theField);
                    newChild.fld = theField;
                    for (const k of Object.keys(children)) {
                        if (children[k].fld === theField) {
                            children[k] = newChild;
                            break;
                        }
                    }
                    input.onChange(newChild, [], newVal);
                    if (theBox.checked) {
                        const first = cell.querySelector("input:not([type=checkbox]):not([type=radio]), textarea, select");
                        if (first && !first.disabled) {
                            first.focus();
                        }
                    }
                });
            }
        }

        if (fields.length === 0) {
            table.appendChild(h("tr", null, h("td", {class: "empty_message", colspan: "3", text: "No fields"})));
        } else {
            // keep this input's value in step with changes below it
            input.onChange = function(child, revPath, val) {
                pushChildPath(child, this.children, revPath);
                if (revPath.length === 1) {
                    this.value[revPath[0]] = val;
                }
                this.parent.onChange(this, revPath, val);
            };
        }
        return input;
    }

    function addOneOfFieldsToForm(schema, container, parent, pathLen, value, allowMissing, oneof) {
        const table = h("table");
        const div = h("div", {class: "oneof"}, table);
        container.appendChild(div);
        const children = {};
        let foundValue = false;
        const selected = {};
        const radioName = "grpc_form_" + (radioSeq++);

        const clearPrevious = function() {
            if (isUnset(selected.field)) {
                return;
            }
            const siblings = parent.children;
            let otherKey;
            let otherCell;
            for (const j of Object.keys(siblings)) {
                if (siblings[j].fld && siblings[j].fld.name === selected.field) {
                    otherKey = j;
                    otherCell = siblings[j].cell;
                    break;
                }
            }
            const otherFld = oneof.oneOfFields.find(f => f.name === selected.field);
            if (!otherCell || !otherFld) {
                return;
            }
            forgetValidationIn(otherCell);
            otherCell.replaceChildren();
            const otherChild = otherFld.isMessage
                ? addOptionalMessage(schema, otherCell, parent, pathLen + 1, undefined, false, otherFld)
                : addElementToForm(schema, otherCell, parent, pathLen + 1, undefined, false, otherFld);
            otherChild.fld = otherFld;
            otherChild.cell = otherCell;
            siblings[otherKey] = otherChild;
            parent.onChange(otherChild, [], undefined);
            selected.field = undefined;
        };

        for (const fld of oneof.oneOfFields) {
            let fldVal;
            let isPresent = false;
            if (!foundValue) {
                fldVal = value[fld.name];
                if (!isUnset(fldVal)) {
                    isPresent = true;
                    foundValue = true;
                }
            }

            const row = h("tr", {class: "message_field"});
            table.appendChild(row);
            row.appendChild(makeFieldLabelCell(fld, schema));

            const radio = h("input", {type: "radio", name: radioName, value: fld.name, checked: isPresent, "aria-label": "Use " + (fld.protoName || fld.name)});
            if (isPresent) {
                selected.field = fld.name;
            }
            row.appendChild(h("td", {class: "oneof-radio"}, radio));

            const cell = h("td", {class: "field-value"});
            row.appendChild(cell);

            const child = fld.isMessage
                ? addOptionalMessage(schema, cell, parent, pathLen + 1, fldVal, allowMissing, fld)
                : addElementToForm(schema, cell, parent, pathLen + 1, fldVal, allowMissing, fld);
            children[fld.name] = child;
            child.fld = fld;
            child.cell = cell;

            radio.addEventListener("change", () => {
                clearPrevious();
                selected.field = fld.name;
                const newVal = getInitialValue(schema, fld);
                forgetValidationIn(cell);
                cell.replaceChildren();
                const newChild = fld.isMessage
                    ? addOptionalMessage(schema, cell, parent, pathLen + 1, newVal, true, fld)
                    : addElementToForm(schema, cell, parent, pathLen + 1, newVal, true, fld);
                newChild.fld = fld;
                newChild.cell = cell;
                const siblings = parent.children;
                for (const k of Object.keys(siblings)) {
                    if (siblings[k].fld === fld) {
                        siblings[k] = newChild;
                        break;
                    }
                }
                parent.onChange(newChild, [], newVal);
            });
        }

        const noneRadio = h("input", {type: "radio", name: radioName, value: "", checked: !foundValue, "aria-label": "None"});
        noneRadio.addEventListener("change", clearPrevious);
        table.appendChild(h("tr", {class: "message_field"},
            h("td", {class: "oneof_none field-label", text: "None"}),
            h("td", {class: "oneof-radio"}, noneRadio),
            h("td")));
        return children;
    }

    // Returns value with all fields keyed by their JSON name (accepting proto
    // names too). Throws on unknown or duplicated fields.
    function canonicalizeFields(value, type, fields) {
        const newValue = {};
        const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
        for (const currField of fields) {
            const list = isOneOf(currField) ? currField.oneOfFields : [currField];
            for (const f of list) {
                if (has(value, f.name)) {
                    newValue[f.name] = value[f.name];
                    delete value[f.name];
                }
            }
        }
        for (const currField of fields) {
            const list = isOneOf(currField) ? currField.oneOfFields : [currField];
            for (const f of list) {
                if (has(value, f.protoName)) {
                    if (has(newValue, f.name)) {
                        throw new Error("value for type " + type + " has redundant values: " + f.name + " and " + f.protoName);
                    }
                    newValue[f.name] = value[f.protoName];
                    delete value[f.protoName];
                }
            }
        }
        for (const p of Object.keys(value)) {
            throw new Error("value for type " + type + " has unrecognized field: " + p);
        }
        return Object.assign(value, newValue);
    }

    function isOneOf(fld) {
        return fld.type === "oneof" && !fld.isMessage;
    }

    function makeTableContainer(container, pathLen) {
        if (pathLen === 0) {
            return container;
        }
        const table = h("table");
        container.appendChild(h("div", {class: "nest"}, table));
        return table;
    }

    function maybeMakeInputContainer(container, pathLen) {
        if (pathLen === 0) {
            // container is the root table: add a row and cell for the input
            const cell = h("td", {colspan: "3"});
            container.appendChild(h("tr", null, cell));
            return cell;
        }
        return container;
    }

    function makeFieldLabelCell(fld, schema) {
        let typeText = fld.type || "";
        if (fld.isMap) {
            const entry = schema.messageTypes[fld.type];
            typeText = "map<" + entry[0].type + ", " + entry[1].type + ">";
        } else if (fld.isArray) {
            typeText = "repeated " + typeText;
        }
        const name = h("div", {class: "field-name"}, h("span", {text: fld.protoName || fld.name}));
        if (fld.description) {
            name.appendChild(h("span", {
                class: "field-info",
                tabindex: "0",
                role: "img",
                "aria-label": fld.description,
                "data-tooltip": dedent(fld.description),
                "data-tooltip-mono": "",
            }, icon("info", 13)));
        }
        return h("td", {class: "field-label mono"},
            name,
            typeText ? h("div", {class: "field-type", text: typeText, title: typeText}) : null);
    }

    function addEnumToForm(schema, container, parent, value, fld) {
        const enumVals = schema.enumTypes[fld.type];
        let disabled = false;
        if (isUnset(value)) {
            value = fld.defaultVal;
            disabled = true;
        } else if (typeof value !== "string" && typeof value !== "number") {
            throw typeError(fld.type, value, "string or number");
        }

        const sel = h("select", {class: "select input-sm mono", disabled: disabled, "aria-label": fld.protoName || fld.name});
        const isNumber = typeof value === "number";
        let found = null;
        for (const ev of enumVals) {
            if (found === null && (isNumber ? ev.num === value : ev.name === value)) {
                found = ev.name;
            }
            sel.appendChild(h("option", {value: ev.name, text: ev.name}));
        }
        if (found === null) {
            throw new Error("Field " + fld.name + " of type enum " + fld.type + " has no such value: " + value);
        }
        sel.value = found;
        container.appendChild(sel);

        const input = new Input(parent, [], value);
        sel.addEventListener("change", () => {
            let v = sel.value;
            if (fld.type === "google.protobuf.NullValue" && v === "NULL") {
                v = null;
            }
            input.setValue(v);
        });
        return input;
    }

    function textInput(value, disabled, fld, extraClass) {
        return h("input", {
            type: "text",
            class: "input input-sm mono" + (extraClass ? " " + extraClass : ""),
            value: "" + value,
            disabled: disabled,
            spellcheck: "false",
            autocomplete: "off",
            "aria-label": fld.protoName || fld.name || fld.type,
        });
    }

    function addIntToForm(container, parent, value, fld, min, max) {
        let disabled = false;
        if (isUnset(value)) {
            value = fld.defaultVal;
            disabled = true;
        } else {
            if (typeof value !== "number") {
                throw typeError(fld.type, value, "number");
            }
            if (!isInt(value)) {
                throw new Error("value for type " + fld.type + " is not an integer: " + value);
            }
            if (value < min) {
                throw new Error("value for type " + fld.type + " is less than allowed min: " + value + " < " + min);
            }
            if (value > max) {
                throw new Error("value for type " + fld.type + " is greater than allowed max: " + value + " > " + max);
            }
        }
        const inp = textInput(value, disabled, fld);
        inp.inputMode = "numeric";
        container.appendChild(inp);

        const input = new Input(parent, [], value);
        bindValidation(inp, () => {
            const raw = inp.value.trim();
            const num = +raw;
            if (raw === "" || !isInt(num)) {
                throw new Error("Enter a whole number");
            }
            if (num < min) {
                throw new Error("Must be at least " + min);
            }
            if (num > max) {
                throw new Error("Must be at most " + max);
            }
            input.setValue(num);
        });
        return input;
    }

    function isInt(num) {
        // % returns a fractional remainder for non-whole numbers, so this
        // detects all integers (range is checked separately)
        return (num % 1) === 0;
    }

    function addStringIntToForm(container, parent, value, fld, min, max) {
        let disabled = false;
        if (isUnset(value)) {
            value = fld.defaultVal;
            disabled = true;
        } else {
            if (typeof value !== "string") {
                if (typeof value === "number") {
                    value = value.toString();
                } else {
                    throw typeError(fld.type, value, "string");
                }
            }
            if (!isStringInt(value)) {
                throw new Error("value for type " + fld.type + " is not a valid number: " + JSON.stringify(value));
            }
            if (compareStringInts(value, min) < 0) {
                throw new Error("value for type " + fld.type + " is less than allowed min: " + value + " < " + min);
            }
            if (compareStringInts(value, max) > 0) {
                throw new Error("value for type " + fld.type + " is greater than allowed max: " + value + " > " + max);
            }
        }
        const inp = textInput(value, disabled, fld);
        inp.inputMode = "numeric";
        container.appendChild(inp);

        const input = new Input(parent, [], value);
        bindValidation(inp, () => {
            const val = inp.value.trim();
            if (!isStringInt(val)) {
                throw new Error("Enter a whole number");
            }
            if (compareStringInts(val, min) < 0) {
                throw new Error("Must be at least " + min);
            }
            if (compareStringInts(val, max) > 0) {
                throw new Error("Must be at most " + max);
            }
            input.setValue(val);
        });
        return input;
    }

    function isStringInt(str) {
        if (str === "") {
            return false;
        }
        if (str.charAt(0) === "-") {
            str = str.slice(1);
        }
        return str.length > 0 && /^[0-9]+$/.test(str);
    }

    function compareStringInts(a, b) {
        let aNeg = false;
        let bNeg = false;
        if (a.charAt(0) === "-") {
            aNeg = true;
            a = a.slice(1);
        }
        if (b.charAt(0) === "-") {
            bNeg = true;
            b = b.slice(1);
        }
        if (aNeg !== bNeg) {
            return aNeg ? -1 : 1;
        }
        const sgn = aNeg ? -1 : 1;
        const padLen = a.length - b.length;
        if (padLen > 0) {
            b = "0".repeat(padLen) + b;
        } else if (padLen < 0) {
            a = "0".repeat(-padLen) + a;
        }
        if (a < b) {
            return -sgn;
        } else if (a > b) {
            return sgn;
        }
        return 0;
    }

    function addDoubleToForm(container, parent, value, fld) {
        let disabled = false;
        if (isUnset(value)) {
            value = fld.defaultVal;
            disabled = true;
        } else if (typeof value !== "number") {
            switch (value) {
                case "Infinity":
                    value = Infinity;
                    break;
                case "-Infinity":
                    value = -Infinity;
                    break;
                case "NaN":
                    value = NaN;
                    break;
                default:
                    throw typeError(fld.type, value, "number");
            }
        }
        const inp = textInput(value, disabled, fld);
        inp.inputMode = "decimal";
        container.appendChild(inp);

        const input = new Input(parent, [], value);
        bindValidation(inp, () => {
            let val = inp.value;
            let num = +val;
            if (val.trim() === "" || isNaN(num)) {
                val = val.trim().toLowerCase();
                // accept a few spellings of infinity and NaN
                switch (val) {
                    case "inf": case "+inf": case "infinity": case "+infinity": case "infinite": case "+infinite":
                        num = "Infinity";
                        break;
                    case "-inf": case "-infinity": case "-infinite":
                        num = "-Infinity";
                        break;
                    case "nan":
                        num = "NaN";
                        break;
                    default:
                        throw new Error("Enter a number");
                }
            }
            input.setValue(num);
        });
        return input;
    }

    function addBoolToForm(container, parent, value, fld) {
        let disabled = false;
        if (isUnset(value)) {
            value = fld.defaultVal;
            disabled = true;
        }
        if (typeof value !== "boolean") {
            throw typeError(fld.type, value, "boolean");
        }
        const input = new Input(parent, [], value);
        const name = "grpc_form_" + (radioSeq++);
        const div = h("div", {class: "segmented bool-input" + (disabled ? " disabled" : ""), role: "radiogroup", "aria-label": fld.protoName || fld.name || fld.type});
        for (const b of [true, false]) {
            const id = name + "_" + b;
            const inp = h("input", {type: "radio", name: name, value: String(b), id: id, checked: b === value, disabled: disabled});
            inp.addEventListener("change", () => input.setValue(b));
            div.appendChild(inp);
            div.appendChild(h("label", {for: id, text: String(b)}));
        }
        container.appendChild(div);
        return input;
    }

    function addStringToForm(container, parent, value, fld) {
        let disabled = false;
        if (isUnset(value)) {
            value = fld.defaultVal;
            disabled = true;
        }
        if (typeof value !== "string") {
            throw typeError(fld.type, value, "string");
        }
        const inp = h("textarea", {class: "input input-sm", rows: "1", disabled: disabled, "aria-label": fld.protoName || fld.name || fld.type});
        inp.value = value;
        container.appendChild(inp);

        const input = new Input(parent, [], value);
        bindValidation(inp, () => input.setValue(inp.value));
        return input;
    }

    function addBytesToForm(container, parent, value, fld) {
        let disabled = false;
        if (isUnset(value)) {
            value = fld.defaultVal;
            disabled = true;
        }
        if (typeof value !== "string") {
            throw typeError(fld.type, value, "string");
        }
        if (!isBase64(value)) {
            throw new Error("value for type " + fld.type + " is not a valid base64-encoded string: " + JSON.stringify(value));
        }

        const inp = h("textarea", {class: "input input-sm mono", rows: "1", disabled: disabled, placeholder: "base64", spellcheck: "false", "aria-label": (fld.protoName || fld.name || fld.type) + " (base64)"});
        inp.value = value;
        const fileInput = h("input", {type: "file", class: "sr-only", tabindex: "-1", disabled: disabled, "aria-hidden": "true"});
        const upload = h("button", {type: "button", class: "btn btn-outline btn-sm", disabled: disabled, "data-tooltip": "Load bytes from a file"}, icon("upload", 14), "File");
        upload.addEventListener("click", () => fileInput.click());
        container.appendChild(h("div", {class: "inline-row grpc-bytes-container"}, inp, upload, fileInput));

        const input = new Input(parent, [], value);
        fileInput.addEventListener("change", () => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.addEventListener("load", () => {
                const bytes = new Uint8Array(reader.result);
                let binary = "";
                const chunk = 0x8000;
                for (let i = 0; i < bytes.length; i += chunk) {
                    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
                }
                const b64 = btoa(binary);
                inp.value = b64;
                markValid(inp);
                input.setValue(b64);
                toast("Loaded " + file.name, {variant: "success", description: plural(bytes.length, "byte")});
            });
            reader.addEventListener("error", () => toast("Couldn't read " + file.name, {variant: "error"}));
            reader.readAsArrayBuffer(file);
            fileInput.value = "";
        });

        bindValidation(inp, () => {
            const str = inp.value.trim();
            if (!isBase64(str)) {
                throw new Error("Enter valid base64, or load a file");
            }
            input.setValue(str);
        });
        return input;
    }

    function isBase64(str) {
        // standard (+/) or web-safe (-_) alphabet, but not both
        let isStandard = false;
        let isWebsafe = false;
        for (let i = 0; i < str.length; i++) {
            const ch = str.charAt(i);
            if (/[A-Za-z0-9=]/.test(ch)) {
                continue;
            }
            if (ch === "+" || ch === "/") {
                if (isWebsafe) {
                    return false;
                }
                isStandard = true;
            } else if (ch === "-" || ch === "_") {
                if (isStandard) {
                    return false;
                }
                isWebsafe = true;
            } else {
                return false;
            }
        }
        return true;
    }

    const dateFormat = /^\d+-\d+-\d+T\d+:\d\d:\d\d(\.\d+)?Z(-?\d+:?\d\d)?$/;
    const timeFormat = /^\d+:\d\d(:\d\d(\.\d+)?)?(\s*(am|pm))?\s*((Z|GMT)?\s*(-|\+)?(\d+:?\d\d)?)?$/;

    function addTimestampToForm(container, parent, value, fld) {
        if (typeof value !== "string") {
            throw typeError(fld.type, value, "string");
        }
        if (!dateFormat.test(value) || !isFinite(new Date(value).getTime())) {
            throw new Error("value for type " + fld.type + " is not a valid timestamp string: " + JSON.stringify(value));
        }
        const parts = value.split("T", 2);
        const date = h("input", {type: "date", class: "input input-sm mono ts-date", value: parts[0], "aria-label": "Date"});
        const time = h("input", {type: "text", class: "input input-sm mono ts-time", value: parts[1], placeholder: "HH:MM:SSZ", spellcheck: "false", autocomplete: "off", "aria-label": "Time"});
        const now = h("button", {type: "button", class: "btn btn-outline btn-sm"}, "Now");
        container.appendChild(h("div", {class: "inline-row grpc-timestamp"}, date, time, now));

        const input = new Input(parent, [], value);
        const onTimeChange = function() {
            let timeStr = time.value.trim();
            if (!timeFormat.test(timeStr)) {
                throw new Error("Enter a time like 13:45:00Z");
            }
            // make sure there is a space before any am/pm
            timeStr = timeStr.replace("am", " am").replace("pm", " pm");
            if (!isFinite(new Date("2018-10-31T" + timeStr).getTime())) {
                throw new Error("Enter a time like 13:45:00Z");
            }
            const dateTime = new Date(date.value + "T" + timeStr);
            if (isFinite(dateTime.getTime())) {
                input.setValue(dateTime.toISOString());
            }
        };
        const onDateChange = function() {
            const d = date.value;
            if (!/^\d{4,}-\d{2}-\d{2}$/.test(d) || !isFinite(new Date(d + "T00:00:00Z").getTime())) {
                throw new Error("Enter a valid date");
            }
            const dateTime = new Date(d + "T" + time.value.trim());
            if (isFinite(dateTime.getTime())) {
                input.setValue(dateTime.toISOString());
            }
        };
        bindValidation(time, onTimeChange);
        bindValidation(date, onDateChange);
        date.addEventListener("change", () => checkElement(date, onDateChange));
        now.addEventListener("click", () => {
            const iso = new Date().toISOString();
            const split = iso.split("T", 2);
            date.value = split[0];
            time.value = split[1];
            markValid(date);
            markValid(time);
            input.setValue(iso);
        });
        return input;
    }

    function addDurationToForm(container, parent, value, fld) {
        if (typeof value !== "string") {
            throw typeError(fld.type, value, "string");
        }
        if (value.slice(-1) !== "s") {
            throw new Error("value for type " + fld.type + " is not a valid duration string: " + JSON.stringify(value));
        }
        const secs = +(value.slice(0, -1));
        if (!isFinite(secs)) {
            throw new Error("value for type " + fld.type + " is not a valid duration string: " + JSON.stringify(value));
        }
        const inp = textInput(secs, false, fld, "dur-num");
        inp.inputMode = "decimal";
        const units = [
            ["0.000000001", "nanoseconds"], ["0.000001", "microseconds"], ["0.001", "milliseconds"],
            ["1", "seconds"], ["60", "minutes"], ["3600", "hours"], ["86400", "days"], ["604800", "weeks"],
        ];
        const unit = h("select", {class: "select input-sm dur-unit", "aria-label": "Unit"},
            units.map(u => h("option", {value: u[0], text: u[1]})));
        unit.value = "1";
        container.appendChild(h("div", {class: "inline-row"}, inp, unit));

        const input = new Input(parent, [], value);
        const onChange = function() {
            const raw = inp.value.trim();
            let num = +raw;
            if (raw === "" || isNaN(num)) {
                throw new Error("Enter a number");
            }
            num = num * Number(unit.value);
            input.setValue(num.toFixed(9) + "s");
        };
        bindValidation(inp, onChange);
        unit.addEventListener("change", () => {
            try {
                onChange();
            } catch (ex) {
                // errors come from the number box, which shows them itself
            }
        });
        return input;
    }

    function addJSONToForm(container, parent, value, fld, mustBeObject) {
        if (mustBeObject && (typeof value !== "object" || value === null || Array.isArray(value))) {
            throw typeError(fld.type, value, "object");
        }
        const inp = h("textarea", {class: "input input-sm mono", rows: "3", spellcheck: "false", "aria-label": (fld.protoName || fld.name || fld.type) + " (JSON)"});
        inp.value = JSON.stringify(value);
        container.appendChild(h("div", {class: "json-entry"}, h("div", {class: "json-caption", text: "JSON"}), inp));

        const input = new Input(parent, [], value);
        bindValidation(inp, () => {
            let o;
            try {
                o = JSON.parse(inp.value);
            } catch (e) {
                throw new Error("Invalid JSON: " + e.message);
            }
            if (mustBeObject && (typeof o !== "object" || o === null || Array.isArray(o))) {
                throw typeError(fld.type, o, "object");
            }
            input.setValue(o);
        });
        return input;
    }

    function addAnyToForm(schema, container, parent, pathLen, value, allowMissing, fld) {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
            throw typeError(fld.type, value, "object");
        }
        let typeUrl = value["@type"];
        if (isUnset(typeUrl) && allowMissing) {
            typeUrl = "type.googleapis.com/google.protobuf.StringValue";
            value["@type"] = typeUrl;
        }
        if (typeof typeUrl !== "string") {
            throw new Error("value for type " + fld.type + " must have attribute '@type'");
        }
        const typeName = typeUrl.split("/").slice(-1)[0];
        if (typeName === "google.protobuf.Any") {
            throw new Error("Any message cannot directly contain an Any message");
        }

        const table = makeTableContainer(container, pathLen);
        const children = {};
        const input = new Input(parent, children, value);

        const inp = h("input", {type: "text", class: "input input-sm mono", list: "grpc-message-types", spellcheck: "false", autocomplete: "off", "aria-label": "@type"});
        inp.value = typeName;
        table.appendChild(h("tr", {class: "message_field"},
            makeFieldLabelCell({name: "@type", protoName: "@type", type: ""}, schema),
            h("td", {colspan: "2"}, inp)));

        const updateVal = function(typeName, allowMissing) {
            const wellKnown = isWellKnown(typeName);
            const knownType = wellKnown || Object.prototype.hasOwnProperty.call(schema.messageTypes, typeName);
            if (!knownType) {
                table.appendChild(h("tr", {class: "unknown"}, h("td"),
                    h("td", {colspan: "2", class: "unknown-type", text: "This type isn't in the schema, so its value is edited as JSON."})));
            }
            const cell = h("td", {colspan: "2"});
            table.appendChild(h("tr", {class: "message_field"},
                makeFieldLabelCell({name: "value", protoName: "value", type: typeName}, schema),
                cell));

            if (wellKnown) {
                input.anyValue = value["value"];
                if (isUnset(input.anyValue)) {
                    input.anyValue = getInitialMessageValue(typeName);
                    value["value"] = input.anyValue;
                }
            } else {
                input.anyValue = Object.assign({}, value);
                delete input.anyValue["@type"];
            }
            const valFld = {
                name: "value",
                type: typeName,
                oneOfFields: [],
                isMessage: true,
                isEnum: false,
                isArray: false,
                isMap: false,
                isRequired: false,
            };
            if (knownType) {
                input.child = addElementToForm(schema, cell, input, pathLen, input.anyValue, allowMissing, valFld);
                if (!wellKnown && allowMissing) {
                    // copy any defaults added for required fields back into value
                    Object.assign(value, input.anyValue);
                }
            } else {
                input.child = addJSONToForm(cell, input, input.anyValue, valFld, true);
            }
        };

        bindValidation(inp, () => {
            // drop every row but the @type row
            const rows = Array.from(table.rows);
            for (let i = 1; i < rows.length; i++) {
                forgetValidationIn(rows[i]);
                rows[i].remove();
            }
            for (const p of Object.keys(value)) {
                delete value[p];
            }
            const newType = inp.value.trim();
            if (!newType) {
                throw new Error("Enter a message type");
            }
            value["@type"] = "type.googleapis.com/" + newType;
            updateVal(newType, true);
            parent.onChange(input, [], value);
        });

        input.onChange = function(child, revPath, val) {
            const tn = inp.value.trim();
            if (isWellKnown(tn)) {
                revPath.push("value");
            } else if (revPath.length === 0) {
                // replacing the whole value: keep @type
                val = Object.assign({}, val);
                val["@type"] = "type.googleapis.com/" + tn;
            }
            this.parent.onChange(this, revPath, val);
        };
        input.onAdd = function(child, revPath, val) {
            if (isWellKnown(inp.value.trim())) {
                revPath.push("value");
            }
            this.parent.onAdd(this, revPath, val);
        };
        input.onDelete = function(child, revPath) {
            if (isWellKnown(inp.value.trim())) {
                revPath.push("value");
            }
            this.parent.onDelete(this, revPath);
        };

        updateVal(typeName, allowMissing);
        return input;
    }

    function addOptionalMessage(schema, container, parent, pathLen, value, allowMissing, fld) {
        if (isUnset(value)) {
            container.appendChild(h("div", {class: "null", text: "unset"}));
            return new Input(parent, [], undefined);
        }
        return addElementToForm(schema, container, parent, pathLen, value, allowMissing, fld);
    }

    function describeType(v) {
        if (v === null) {
            return "null";
        }
        if (Array.isArray(v)) {
            return "array";
        }
        return typeof v;
    }

    function typeError(type, val, expectedType) {
        const article = "aeiou".indexOf(expectedType.charAt(0)) !== -1 ? "an" : "a";
        return new Error("value for type " + type + " should be " + article + " " + expectedType + "; instead got " + describeType(val));
    }

    function Input(parent, children, value) {
        this.parent = parent;
        this.children = children;
        this.value = value;

        this.setValue = function(value) {
            // No-op changes still bubble up: a new map entry relies on that to
            // get added to the request with its default key.
            this.value = value;
            this.parent.onChange(this, [], value);
        };
        this.onAdd = function(child, revPath, value) {
            pushChildPath(child, this.children, revPath);
            this.parent.onAdd(this, revPath, value);
        };
        this.onChange = function(child, revPath, value) {
            pushChildPath(child, this.children, revPath);
            this.parent.onChange(this, revPath, value);
        };
        this.onDelete = function(child, revPath) {
            pushChildPath(child, this.children, revPath);
            this.parent.onDelete(this, revPath);
        };
    }

    function pushChildPath(child, children, path) {
        for (const p of Object.keys(children || {})) {
            if (children[p] === child) {
                path.push(Array.isArray(children) ? +p : p);
                return;
            }
        }
    }

    function newRootInput() {
        const root = new Input();
        root.onAdd = (child, revPath, val) => onInputChange(revPath.reverse(), val);
        root.onChange = (child, revPath, val) => onInputChange(revPath.reverse(), val);
        root.onDelete = (child, revPath) => onInputDelete(revPath.reverse());
        return root;
    }

    function getInitialValue(schema, fld) {
        if (fld.isMap) {
            return {};
        }
        if (fld.isArray) {
            return [];
        }
        if (fld.isMessage) {
            return getInitialMessageValue(fld.type);
        }
        if (!isUnset(fld.defaultVal)) {
            return fld.defaultVal;
        }
        if (fld.isEnum) {
            return schema.enumTypes[fld.type][0].name;
        }
        switch (fld.type) {
            case "int32": case "uint32": case "sint32": case "fixed32": case "sfixed32":
            case "double": case "float":
                return 0;
            case "int64": case "uint64": case "sint64": case "fixed64": case "sfixed64":
                return "0";
            case "string": case "bytes":
                return "";
            case "bool":
                return false;
            default:
                throw new Error("unknown non-message non-enum type: " + fld.type);
        }
    }

    function getInitialMessageValue(messageType) {
        switch (messageType) {
            case "google.protobuf.Timestamp":
                return "1970-01-01T00:00:00Z";
            case "google.protobuf.Duration":
                return "0s";
            case "google.protobuf.Int32Value": case "google.protobuf.UInt32Value":
            case "google.protobuf.DoubleValue": case "google.protobuf.FloatValue":
                return 0;
            case "google.protobuf.Int64Value": case "google.protobuf.UInt64Value":
                return "0";
            case "google.protobuf.StringValue": case "google.protobuf.BytesValue":
                return "";
            case "google.protobuf.BoolValue":
                return false;
            case "google.protobuf.ListValue":
                return [];
            default:
                return {};
        }
    }

    function isWellKnown(t) {
        switch (t) {
            case "google.protobuf.Int32Value": case "google.protobuf.UInt32Value":
            case "google.protobuf.Int64Value": case "google.protobuf.UInt64Value":
            case "google.protobuf.DoubleValue": case "google.protobuf.FloatValue":
            case "google.protobuf.StringValue": case "google.protobuf.BytesValue":
            case "google.protobuf.BoolValue": case "google.protobuf.Timestamp":
            case "google.protobuf.Duration": case "google.protobuf.Value":
            case "google.protobuf.Struct": case "google.protobuf.ListValue":
            case "google.protobuf.Any":
                return true;
            default:
                return false;
        }
    }

    // Changes from the form are applied to the request object here, then
    // the JSON is regenerated.
    function onInputChange(path, value) {
        if (debug) {
            console.log("changing " + JSON.stringify(path) + " to " + JSON.stringify(value));
        }
        if (path.length === 0) {
            state.request = value;
        } else {
            updateRequestObject(path, state.request, value);
        }
        updateJSONRequest(state.request);
    }

    function onInputDelete(path) {
        if (debug) {
            console.log("deleting " + JSON.stringify(path));
        }
        removeFromRequestObject(path, state.request);
        updateJSONRequest(state.request);
    }

    function updateRequestObject(path, req, value) {
        if (path.length === 1) {
            req[path[0]] = value;
        } else {
            updateRequestObject(path.slice(1), req[path[0]], value);
        }
    }

    function removeFromRequestObject(path, req) {
        if (path.length === 1) {
            if (Array.isArray(req)) {
                req.splice(path[0], 1);
            } else {
                delete req[path[0]];
            }
        } else {
            removeFromRequestObject(path.slice(1), req[path[0]]);
        }
    }

    const MAX_INT64 = "9223372036854775807";
    const MIN_INT64 = "-9223372036854775808";
    const MAX_UINT64 = "18446744073709551615";
    const MAX_INT32 = 2147483647;
    const MIN_INT32 = -2147483648;
    const MAX_UINT32 = 4294967295;

    // ---------------------------------------------------------------------
    // Validation
    //
    // An input registers a validator with bindValidation. When it gets
    // focus it becomes "the element being validated"; its validator runs
    // when it loses focus, or before another element takes over, or before
    // an invoke or a tab switch. Validators throw an Error with a message
    // to show, and are responsible for pushing the new value into the form.
    // ---------------------------------------------------------------------

    let validation = null;

    function bindValidation(el, func) {
        el.addEventListener("focus", () => setValidation(el, func));
        el.addEventListener("blur", () => onElementBlur(el));
    }

    function setValidation(el, func) {
        if (validation && validation.element === el) {
            return;
        }
        checkValidation();
        validation = {element: el, func: func};
    }

    function onElementBlur(el) {
        if (document.activeElement !== el && validation && validation.element === el) {
            checkValidation();
            validation = null;
        }
    }

    function checkElement(el, func) {
        let err = "";
        try {
            func(el);
        } catch (ex) {
            if (debug) {
                console.trace(ex);
            }
            err = ex && ex.message ? ex.message : String(ex);
        }
        if (err) {
            markInvalid(el, err);
        } else {
            markValid(el);
        }
        return !err;
    }

    // Runs the current validator. Returns true if the element is valid.
    function checkValidation() {
        if (!validation) {
            return true;
        }
        if (!validation.element.isConnected) {
            validation = null;
            return true;
        }
        return checkElement(validation.element, validation.func);
    }

    function markInvalid(el, msg) {
        el.classList.add("invalid-input");
        el.setAttribute("aria-invalid", "true");
        el.dataset.error = msg;
        if (el.dataset.errorInline === "false") {
            return;
        }
        let m = el._errEl;
        if (!m) {
            m = h("div", {class: "field-error", role: "alert"});
            el._errEl = m;
            const hostEl = el.closest(".inline-row") || el;
            hostEl.after(m);
        }
        m.textContent = msg;
    }

    function markValid(el) {
        el.classList.remove("invalid-input");
        el.removeAttribute("aria-invalid");
        delete el.dataset.error;
        if (el._errEl) {
            el._errEl.remove();
            el._errEl = null;
        }
    }

    // Drops the pending validator if its element is inside el (about to be removed).
    function forgetValidationIn(el) {
        if (validation && el.contains(validation.element)) {
            validation = null;
        }
    }

    function focusInvalid(el) {
        el.scrollIntoView({block: "center", behavior: "smooth"});
        el.focus({preventScroll: true});
    }

    // Returns true if the form is valid. Otherwise shows the first problem.
    function onlyIfValid() {
        if (!checkValidation()) {
            const el = validation.element;
            focusInvalid(el);
            toast("Fix the highlighted field first", {variant: "error", description: el.dataset.error});
            return false;
        }
        const bad = qsa(".invalid-input", rootEl).find(el => el.getClientRects().length > 0);
        if (bad) {
            focusInvalid(bad);
            toast("Fix the highlighted field first", {variant: "error", description: bad.dataset.error});
            return false;
        }
        return true;
    }

    // ---------------------------------------------------------------------
    // JSON and grpcurl views
    // ---------------------------------------------------------------------

    function updateJSONRequest(req) {
        const json = JSON.stringify(req, null, 2);
        els.raw.value = json === undefined ? "" : json;
        markValid(els.raw);
        updateCurlCommand(json);
    }

    function validateJSON() {
        const json = els.raw.value;
        updateCurlCommand(json);
        let obj;
        try {
            obj = JSON.parse(json);
        } catch (e) {
            throw new Error("Invalid JSON: " + e.message);
        }
        rebuildRequestForm(obj, false);
    }

    bindValidation(els.raw, validateJSON);

    function parseTimeout() {
        const v = els.timeout.value.trim();
        if (!v) {
            return undefined;
        }
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : undefined;
    }

    function updateCurlCommand(json) {
        if (json === undefined) {
            json = els.raw.value;
        }
        if (!state.service) {
            els.grpcurl.textContent = "";
            return;
        }
        const parts = ["grpcurl"];
        if (grpcurlOptions) {
            parts.push(grpcurlOptions);
        }
        const t = parseTimeout();
        if (t) {
            parts.push("-max-time " + t);
        }
        for (const m of effectiveMetadata()) {
            parts.push("-H " + shellQuote(m.name + ": " + m.value));
        }
        parts.push("-d " + shellQuote(json || "{}"));
        parts.push(target ? shellQuote(target) : "HOST:PORT");
        parts.push(state.service + "/" + state.method);
        els.grpcurl.textContent = parts.join(" \\\n  ");
    }

    els.timeout.dataset.errorInline = "false";
    bindValidation(els.timeout, () => {
        const v = els.timeout.value.trim();
        if (!v) {
            return;
        }
        const n = Number(v);
        if (Number.isNaN(n)) {
            throw new Error("The timeout must be a number of seconds");
        }
        if (n <= 0) {
            throw new Error("The timeout must be more than zero");
        }
    });
    els.timeout.addEventListener("input", () => updateCurlCommand());

    qs("#gu-json-format").addEventListener("click", () => {
        try {
            els.raw.value = JSON.stringify(JSON.parse(els.raw.value), null, 2);
        } catch (e) {
            toast("Can't format invalid JSON", {variant: "error", description: e.message});
        }
    });

    function wireCopy(btn, getText, what) {
        btn.addEventListener("click", async () => {
            const ok = await copyText(getText());
            if (ok) {
                btn.replaceChildren(icon("check", 13), "Copied");
                setTimeout(() => btn.replaceChildren(icon("copy", 13), "Copy"), 1500);
            } else {
                toast("Couldn't copy " + what, {variant: "error"});
            }
        });
    }

    wireCopy(qs("#gu-json-copy"), () => els.raw.value, "the JSON");
    wireCopy(qs("#gu-curl-copy"), () => els.grpcurl.textContent, "the command");

    // ---------------------------------------------------------------------
    // Invoke and response
    // ---------------------------------------------------------------------

    let lastResponseText = "";
    let respTab = "body";

    wireCopy(els.respCopy, () => lastResponseText, "the response");

    function resetResponse() {
        els.respStatus.replaceChildren();
        els.respCopy.hidden = true;
        lastResponseText = "";
        els.response.replaceChildren(h("div", {class: "gu-empty"},
            icon("send", 28),
            h("p", {class: "gu-empty-title", text: "No response yet"}),
            h("p", {class: "gu-empty-desc"}, "Press ", h("kbd", {class: "kbd", text: IS_MAC ? "⌘↵" : "Ctrl ↵"}), " or Invoke to send the request.")));
    }

    function showResponseLoading() {
        els.respStatus.replaceChildren(h("span", {class: "badge badge-outline"}, icon("loader", 12, "spin"), "Sending"));
        els.respCopy.hidden = true;
        els.response.replaceChildren(h("div", {class: "gu-empty", "aria-busy": "true"},
            icon("loader", 24, "spin"),
            h("p", {class: "gu-empty-desc", text: "Waiting for the response…"})));
    }

    function setInvoking(on) {
        state.invoking = on;
        els.invoke.disabled = on || !state.schemaReady;
        els.invokeLabel.textContent = on ? "Sending…" : "Invoke";
    }

    async function invoke() {
        if (state.invoking || !state.schemaReady || !state.service) {
            return;
        }
        if (!onlyIfValid()) {
            return;
        }
        const service = state.service;
        const method = state.method;
        const timeout = parseTimeout();
        const original = state.request;
        const data = Array.isArray(original) ? original : [original];
        const metadata = effectiveMetadata().map(m => ({name: m.name, value: m.value}));

        const historyItem = {
            request: {
                timeout_seconds: timeout,
                metadata: metadata.map(m => Object.assign({}, m)),
                data: JSON.parse(JSON.stringify(original === undefined ? null : original)),
            },
            service: service,
            method: method,
            startTime: new Date().toISOString(),
        };

        setInvoking(true);
        showResponseLoading();
        const start = performance.now();
        try {
            const resp = await api(invokeURI + "/" + service + "." + method, {
                method: "POST",
                body: {timeout_seconds: timeout, metadata: metadata, data: data},
            });
            const ms = performance.now() - start;
            renderResponse(resp || {}, ms, methodInfo(service, method));
            addHistory(Object.assign(historyItem, {durationMS: ms, responseData: historyResponseData(resp || {})}));
        } catch (e) {
            const ms = performance.now() - start;
            if (debug) {
                console.trace(e);
            }
            renderFailure(e, ms);
            addHistory(Object.assign(historyItem, {durationMS: ms, failureStatus: e.status ? "HTTP " + e.status : "network error"}));
        } finally {
            setInvoking(false);
        }
    }

    function renderFailure(e, ms) {
        els.respStatus.replaceChildren(
            h("span", {class: "badge badge-destructive", text: e.status ? "HTTP " + e.status : "Failed"}),
            h("span", {class: "gu-resp-meta", text: formatDuration(ms)}));
        els.respCopy.hidden = true;
        lastResponseText = "";
        els.response.replaceChildren(alertBox("destructive", "The request didn't go through", e.message));
    }

    function renderResponse(resp, ms, mi) {
        const err = resp.error;
        const msgs = resp.responses || [];
        const headers = resp.headers || [];
        const trailers = resp.trailers || [];

        const badge = err
            ? h("span", {class: "badge badge-destructive", "data-tooltip": "gRPC status code " + err.code, text: err.name})
            : h("span", {class: "badge badge-success", text: "OK"});
        els.respStatus.replaceChildren(badge, h("span", {class: "gu-resp-meta", text: formatDuration(ms) + " · " + plural(msgs.length, "message")}));

        const bodies = msgs.filter(m => !m.isError).map(m => m.message);
        lastResponseText = JSON.stringify(bodies.length === 1 && !(mi && mi.serverStream) ? bodies[0] : bodies, null, 2);
        els.respCopy.hidden = bodies.length === 0;

        // tabs
        const tabList = h("div", {class: "tabs-list", role: "tablist", id: "gu-resp-tabs", "aria-label": "Response view"},
            h("button", {type: "button", role: "tab", class: "tab", dataset: {tab: "body"}, "aria-selected": "false"}, "Body"),
            h("button", {type: "button", role: "tab", class: "tab", dataset: {tab: "headers"}, "aria-selected": "false"}, "Headers", h("span", {class: "tab-count", text: String(headers.length)})),
            h("button", {type: "button", role: "tab", class: "tab", dataset: {tab: "trailers"}, "aria-selected": "false"}, "Trailers", h("span", {class: "tab-count", text: String(trailers.length)})));
        qs('[data-tab="' + respTab + '"]', tabList).setAttribute("aria-selected", "true");

        const bodyPanel = h("div", {dataset: {panel: "body"}, role: "tabpanel"});
        if (resp.requests && resp.requests.total !== resp.requests.sent) {
            bodyPanel.appendChild(h("div", {class: "resp-section"}, alertBox("warning",
                "Only " + resp.requests.sent + " of " + resp.requests.total + " request messages were accepted",
                "The server ended the call before the client finished sending.")));
        }
        if (err) {
            const box = alertBox("destructive", err.name + " (code " + err.code + ")", err.message !== err.name ? err.message : "");
            const details = err.details || [];
            if (details.length) {
                const body = qs(".alert-body", box);
                body.appendChild(h("div", {class: "alert-title", style: {marginTop: "6px"}, text: "Details"}));
                details.forEach(d => body.appendChild(codeBlock(d.message)));
            }
            bodyPanel.appendChild(h("div", {class: "resp-section"}, box));
        }
        if (msgs.length === 0) {
            if (!err) {
                bodyPanel.appendChild(h("p", {class: "muted text-sm", text: "The server sent no response messages."}));
            }
        } else if (msgs.length === 1 && !(mi && mi.serverStream)) {
            bodyPanel.appendChild(h("div", {class: "resp-section"}, messageBlock(msgs[0], 0)));
        } else {
            const section = h("div", {class: "resp-section"});
            msgs.forEach((m, i) => section.appendChild(h("div", {class: "msg-card"},
                h("div", {class: "msg-head"}, h("span", {text: "Message " + (i + 1)}), m.isError ? h("span", {class: "badge badge-destructive", text: "error"}) : null),
                messageBlock(m, i))));
            bodyPanel.appendChild(section);
        }

        const headersPanel = h("div", {dataset: {panel: "headers"}, role: "tabpanel"}, kvTable(headers, "No response headers."));
        const trailersPanel = h("div", {dataset: {panel: "trailers"}, role: "tabpanel"}, kvTable(trailers, "No response trailers."));
        const panels = h("div", null, bodyPanel, headersPanel, trailersPanel);
        els.response.replaceChildren(tabList, panels);
        createTabs(tabList, panels, {onChange: name => respTab = name});
    }

    function messageBlock(m, i) {
        if (m.isError) {
            return alertBox("destructive", "Couldn't decode message " + (i + 1), typeof m.message === "string" ? m.message : JSON.stringify(m.message));
        }
        return codeBlock(m.message);
    }

    function historyResponseData(resp) {
        const result = {};
        if (resp.error) {
            result.error = {name: resp.error.name, code: resp.error.code};
        }
        result.responseMsgCount = resp.responses ? resp.responses.length : 0;
        return result;
    }

    els.invoke.addEventListener("click", () => invoke());

    // ---------------------------------------------------------------------
    // History
    // ---------------------------------------------------------------------

    const maxHistory = 100;
    const maxHistorySize = 1024 * 1024; // 1mb
    let history = storage.getJSON(KEYS.history, []);
    if (!Array.isArray(history)) {
        history = [];
    }
    let historyView = null;

    function saveHistory() {
        let data = JSON.stringify(history);
        while (data.length > maxHistorySize && history.length > 0) {
            // drop the oldest entries until it fits
            history = history.slice(0, -1);
            data = JSON.stringify(history);
        }
        if (!storage.set(KEYS.history, data) && debug) {
            console.warn("couldn't save history to local storage");
        }
        if (historyView) {
            renderHistoryList();
        }
    }

    function addHistory(item) {
        history = history.slice(0, maxHistory - 1);
        history.unshift(item);
        saveHistory();
    }

    function download(filename, text) {
        const url = URL.createObjectURL(new Blob([text], {type: "application/json"}));
        const a = h("a", {href: url, download: filename, style: {display: "none"}});
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // Exports history in the same format as the -examples file.
    function exportHistory() {
        const out = history.map((entry, i) => {
            const item = Object.assign({}, entry);
            item.name = "Example #" + (i + 1) + " @ " + item.startTime;
            item.description = "";
            delete item.startTime;
            delete item.durationMS;
            delete item.responseData;
            delete item.failureStatus;
            let req = item.request || {};
            if (Object.prototype.hasOwnProperty.call(req, "timeout")) {
                // older entries stored a string 'timeout'
                req = Object.assign({}, req);
                const t = Number(req.timeout);
                req.timeout_seconds = req.timeout === "" || Number.isNaN(t) ? undefined : t;
                delete req.timeout;
                item.request = req;
            }
            return item;
        });
        download("history.json", JSON.stringify(out, null, 2));
    }

    function historyStatus(item) {
        if (item.failureStatus) {
            return h("span", {class: "badge badge-destructive", text: "Failed", "data-tooltip": item.failureStatus});
        }
        if (item.responseData && item.responseData.error) {
            return h("span", {class: "badge badge-destructive", text: item.responseData.error.name || "Error"});
        }
        return h("span", {class: "badge badge-success", text: "OK"});
    }

    function renderHistoryList() {
        const q = historyView.filter.value.trim().toLowerCase();
        const list = historyView.list;
        list.replaceChildren();
        if (history.length === 0) {
            list.appendChild(h("div", {class: "gu-empty"}, icon("history", 28),
                h("p", {class: "gu-empty-title", text: "No requests yet"}),
                h("p", {class: "gu-empty-desc", text: "Requests you send show up here."})));
            return;
        }
        let shown = 0;
        history.forEach((item, i) => {
            const full = item.service + "/" + item.method;
            if (q && !full.toLowerCase().includes(q)) {
                return;
            }
            shown++;
            const valid = hasMethod(item.service, item.method);
            const count = item.responseData ? item.responseData.responseMsgCount : undefined;
            const meta = [formatTime(item.startTime), formatDuration(item.durationMS || 0)];
            if (typeof count === "number" && count !== 1) {
                meta.push(plural(count, "message"));
            }
            const load = h("button", {type: "button", class: "btn btn-outline btn-xs", disabled: !valid}, "Load");
            const del = h("button", {type: "button", class: "btn btn-ghost btn-icon btn-xs", "aria-label": "Delete entry", "data-tooltip": "Delete"}, icon("trash", 14));
            const summary = h("summary", {class: "hist-summary"},
                icon("chevron-down", 14, "chevron"),
                historyStatus(item),
                h("div", {class: "hist-main"},
                    h("div", {class: "hist-method mono" + (valid ? "" : " invalid"), text: splitService(item.service).name + "/" + item.method, title: valid ? full : full + " (no longer available)"}),
                    h("div", {class: "hist-meta", text: meta.filter(Boolean).join(" · ")})),
                h("div", {class: "hist-actions"}, load, del));
            const details = h("details", {class: "hist-item"}, summary);
            details.addEventListener("toggle", () => {
                if (details.open && !details._built) {
                    details._built = true;
                    const req = item.request || {};
                    const t = !isUnset(req.timeout_seconds) ? req.timeout_seconds : req.timeout;
                    details.appendChild(h("div", {class: "hist-detail"},
                        h("div", {class: "md-title", text: "Request"}),
                        codeBlock(req.data),
                        h("div", {class: "md-title", text: "Metadata"}),
                        kvTable(req.metadata || [], "No metadata."),
                        !isUnset(t) && t !== "" ? h("div", {class: "muted text-sm", text: "Timeout: " + t + " s"}) : null));
                }
            });
            load.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                closeSheet();
                loadRequest(item, {fromHistory: true});
            });
            del.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                history.splice(i, 1);
                saveHistory();
            });
            list.appendChild(details);
        });
        if (shown === 0) {
            list.appendChild(h("p", {class: "muted text-sm", style: {padding: "16px 20px"}, text: "No requests match “" + historyView.filter.value.trim() + "”."}));
        }
    }

    function openHistory() {
        const filter = h("input", {type: "search", class: "input input-sm", placeholder: "Filter by method", "aria-label": "Filter history", autocomplete: "off"});
        const list = h("div", {class: "hist-list"});
        const exportBtn = h("button", {type: "button", class: "btn btn-outline btn-sm"}, icon("download", 14), "Export");
        const clearBtn = h("button", {type: "button", class: "btn btn-ghost btn-sm text-destructive"}, icon("trash", 14), "Clear history");
        openSheet({
            title: "History",
            description: "The last " + maxHistory + " requests sent to this server from this browser.",
            body: [h("div", {class: "hist-filter"}, filter), list],
            footer: [clearBtn, h("div", {class: "gu-spacer"}), exportBtn],
            onClose: () => {
                historyView = null;
            },
            initialFocus: filter,
        });
        historyView = {filter: filter, list: list};
        filter.addEventListener("input", renderHistoryList);
        exportBtn.addEventListener("click", exportHistory);
        clearBtn.addEventListener("click", async () => {
            const ok = await confirmDialog({
                title: "Clear history?",
                description: "This deletes every saved request for this server from this browser. You can't undo this.",
                confirmLabel: "Clear history",
                destructive: true,
            });
            if (ok) {
                history = [];
                saveHistory();
            }
        });
        renderHistoryList();
    }

    qs("#gu-history-btn").addEventListener("click", openHistory);

    // Loads a history entry or example into the form.
    function loadRequest(item, opts) {
        opts = opts || {};
        const req = item.request || {};
        if (!hasMethod(item.service, item.method)) {
            toast("That method isn't available on this server", {variant: "error", description: item.service + "/" + item.method});
            return;
        }
        // older versions stored 'timeout'; examples use 'timeout_secs'
        let t = req.timeout_seconds;
        if (isUnset(t)) {
            t = req.timeout_secs;
        }
        if (isUnset(t)) {
            t = req.timeout;
        }
        els.timeout.value = isUnset(t) ? "" : String(t);
        markValid(els.timeout);

        state.requestRows = (req.metadata || []).map(m => ({name: m.name || "", value: m.value || "", enabled: true}));
        state.skipInherited = new Set();
        state.inheritOff = !!opts.fromHistory;
        validation = null;
        reqTabs.select("form", true);

        selectMethod(item.service, item.method, {
            fromLoad: true,
            onReady: () => {
                if (isUnset(req.data)) {
                    return;
                }
                updateJSONRequest(req.data);
                try {
                    validateJSON();
                } catch (e) {
                    markInvalid(els.raw, e.message);
                    reqTabs.select("json", true);
                    toast("Couldn't load that request into the form", {variant: "error", description: e.message});
                }
            },
        });
        state.activeExample = isUnset(opts.exampleIndex) ? -1 : opts.exampleIndex;
    }

    // ---------------------------------------------------------------------
    // Examples (only served by the standalone handler)
    // ---------------------------------------------------------------------

    let examples = [];

    els.examplesBtn.addEventListener("click", () => {
        openMenu(els.examplesBtn, examples.map((ex, i) => ({
            label: ex.name || ("Example " + (i + 1)),
            description: ex.description || (ex.service + "/" + ex.method),
            checked: i === state.activeExample,
            onSelect: () => loadRequest(ex, {exampleIndex: i}),
        })), {align: "end"});
    });

    api("examples")
        .then(data => {
            if (Array.isArray(data) && data.length > 0) {
                examples = data;
                els.examplesBtn.hidden = false;
            }
        })
        .catch(e => {
            if (debug) {
                console.log("no examples: " + e.message);
            }
        });

    // ---------------------------------------------------------------------
    // Start up
    // ---------------------------------------------------------------------

    const reqTabs = createTabs(qs("#gu-req-tabs"), qs("#gu-req-body"), {
        beforeChange: () => onlyIfValid(),
    });

    document.addEventListener("keydown", e => {
        const mod = IS_MAC ? e.metaKey : e.ctrlKey;
        if (mod && e.key === "Enter") {
            if (document.querySelector("dialog[open]")) {
                return;
            }
            e.preventDefault();
            invoke();
        } else if (mod && (e.key === "k" || e.key === "K")) {
            if (document.querySelector("dialog[open]")) {
                return;
            }
            e.preventDefault();
            focusSearch();
        }
    }, true);

    function initialSelection() {
        const params = new URLSearchParams(window.location.search || "");
        const svcCandidates = [params.get("serviceName"), storage.get(KEYS.service), serviceNames[0]];
        const svc = svcCandidates.find(hasService) || null;
        if (!svc) {
            return null;
        }
        const methods = services[svc];
        const mCandidates = [params.get("methodName"), storage.get(KEYS.method), methods.length ? methods[0].name : null];
        const method = mCandidates.find(m => hasMethod(svc, m)) || null;
        return method ? {service: svc, method: method} : null;
    }

    renderTree();
    resetResponse();
    const first = initialSelection();
    if (first) {
        selectMethod(first.service, first.method);
    } else {
        renderMetadataSection();
        els.form.replaceChildren(h("div", {class: "gu-empty"}, icon("server", 28),
            h("p", {class: "gu-empty-title", text: "No methods to show"}),
            h("p", {class: "gu-empty-desc", text: "The server didn't report any services."})));
    }
};

})();
