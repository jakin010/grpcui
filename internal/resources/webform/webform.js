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
 *      response, history, saved requests, passkey flows, examples
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
    "bookmark": '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    "pencil": '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    "key": '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
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
    // With the popover API the region sits in the top layer, above dialogs,
    // so it can live at the root and outlive any dialog that is closing.
    const host = region.showPopover ? ROOT : overlayHost();
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

// A modal dialog with a form. opts: {title, description, body (nodes),
// submitLabel, className, onReady({submit, error}), onSubmit: async () => false to stay
// open; throwing shows the error in the dialog}. Resolves true if submitted.
function openFormDialog(opts) {
    return new Promise(resolve => {
        const cancel = h("button", {type: "button", class: "btn btn-outline btn-sm"}, "Cancel");
        const submit = h("button", {type: "submit", class: "btn btn-sm " + (opts.destructive ? "btn-destructive" : "btn-primary")}, opts.submitLabel || "Save");
        const error = h("p", {class: "dialog-error", role: "alert"});
        error.hidden = true;
        const form = h("form", {class: "dialog-form", novalidate: true},
            h("h2", {class: "dialog-title", text: opts.title}),
            opts.description ? h("p", {class: "dialog-desc", text: opts.description}) : null,
            h("div", {class: "dialog-fields"}, opts.body),
            error,
            h("div", {class: "dialog-actions"}, cancel, submit));
        const dlg = h("dialog", {class: "dialog" + (opts.className ? " " + opts.className : ""), "aria-label": opts.title}, form);
        let result = false;
        cancel.addEventListener("click", () => dlg.close());
        form.addEventListener("submit", async e => {
            e.preventDefault();
            submit.disabled = true;
            error.hidden = true;
            try {
                const keepOpen = (await opts.onSubmit()) === false;
                if (!keepOpen) {
                    result = true;
                    dlg.close();
                }
            } catch (err) {
                error.textContent = err && err.message ? err.message : String(err);
                error.hidden = false;
            } finally {
                submit.disabled = false;
            }
        });
        dlg.addEventListener("close", () => {
            dlg.remove();
            resolve(result);
        });
        ROOT.appendChild(dlg);
        dlg.showModal();
        if (opts.onReady) {
            opts.onReady({submit: submit, error: error});
        }
        const first = form.querySelector("input:not([type=radio]):not([type=checkbox]), textarea");
        if (first) {
            first.focus();
        }
    });
}

// A labelled text input or textarea for dialogs.
function dialogField(label, attrs) {
    attrs = attrs || {};
    const input = attrs.multiline
        ? h("textarea", {class: "input input-sm", rows: "2", placeholder: attrs.placeholder || ""})
        : h("input", {type: "text", class: "input input-sm", placeholder: attrs.placeholder || "", autocomplete: "off"});
    input.value = attrs.value || "";
    return {el: h("label", {class: "dlg-field"}, h("span", {class: "dlg-label", text: label}), input), input: input};
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
    const buttons = [];
    for (const item of items) {
        if (item.separator) {
            menu.appendChild(h("div", {class: "menu-separator", role: "separator"}));
            continue;
        }
        if (item.heading) {
            menu.appendChild(h("div", {class: "menu-heading", text: item.heading}));
            continue;
        }
        const btn = h("button", {type: "button", class: "menu-item", role: item.icon && !item.checked ? "menuitem" : "menuitemradio", "aria-checked": item.checked ? "true" : "false"},
            h("span", {class: "menu-check"}, item.checked ? icon("check", 14) : (item.icon ? icon(item.icon, 14) : null)),
            h("span", {class: "menu-text"},
                h("span", {text: item.label}),
                item.description ? h("span", {class: "menu-desc", text: item.description}) : null));
        btn.addEventListener("click", () => {
            close();
            item.onSelect();
        });
        buttons.push(btn);
        menu.appendChild(btn);
    }
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
        activeSaved: null,
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
            state.activeSaved = null;
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
        updateSavedButton();

        state.schemaReady = false;
        state.schema = null;
        setInvokeEnabled(false);
        els.form.replaceChildren(h("div", {class: "form-skeleton", "aria-busy": "true"}, h("div"), h("div"), h("div")));
        updateFormTools();

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
                updateFormTools();
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

    // The request's own enabled header rows, without any that only came from
    // inherited scopes (rows filled in by a history replay are marked fromScope).
    function ownRequestHeaders() {
        return state.requestRows
            .filter(r => r.enabled !== false && !r.fromScope && r.name && r.name.trim())
            .map(r => ({name: r.name.trim(), value: r.value || ""}));
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
                delete r.fromScope;
                onChange();
            });
            value.addEventListener("input", () => {
                r.value = value.value;
                delete r.fromScope;
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
            updateFormTools();
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
        refreshCollapsed(div);
        els.form.replaceChildren(div);
        updateFormTools();
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
        // JSON object keys are always strings; give 32-bit int and bool keys
        // their real type (64-bit ints stay strings, as in proto JSON)
        const keyType = mapEntryFields[0].type;
        const typedKey = function(k) {
            switch (keyType) {
                case "int32": case "sint32": case "sfixed32": case "uint32": case "fixed32":
                    return isStringInt(k) ? Number(k) : k;
                case "bool":
                    return k === "true" ? true : k === "false" ? false : k;
                default:
                    return k;
            }
        };
        for (const k of Object.keys(value)) {
            const entry = {};
            entry[mapEntryFields[0].name] = typedKey(k);
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
                    if (i !== index && !isUnset(this.childKeys[i]) && String(this.childKeys[i]) === String(newKey)) {
                        throw new Error('key "' + newKey + '" is a duplicate');
                    }
                }
                const entryVal = this.asArray.children[index]["value"].value;
                this.parent.onAdd(this, [newKey], entryVal);
                if (!isUnset(key)) {
                    this.parent.onDelete(this, [key]);
                }
                this.childKeys[index] = newKey;
                const entryRow = this.asArray.children[index] && this.asArray.children[index].row;
                if (entryRow && entryRow._container) {
                    movePaths(entryRow, mapEntryPath(pathOf(entryRow._container), newKey));
                }
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

        // items that hold a message can be collapsed on their own
        const itemsCollapse = !fld.isMap && isContainerField(elementFld);
        // List items are addressed by index (renumbered when one is removed).
        // Map entries are addressed by key, so reordering keeps their state;
        // a new entry gets a placeholder until its key is set.
        const mapKeyName = fld.isMap ? schema.messageTypes[fld.type][0].name : null;
        const newItemRow = function(index, entry) {
            const row = newArrayRow(input);
            // read the parent's path now: it can change (map key rename, renumbering)
            const basePath = pathOf(container);
            row._container = container;
            row._isMapEntry = !!fld.isMap;
            if (fld.isMap) {
                row.dataset.path = entry && !isUnset(entry[mapKeyName]) ? mapEntryPath(basePath, entry[mapKeyName]) : basePath + "{#" + (tempEntrySeq++) + "}";
            } else {
                row.dataset.path = basePath + "[" + index + "]";
            }
            const cell = h("td", {class: "array-value"});
            row.appendChild(cell);
            if (itemsCollapse) {
                makeCollapsible(row, "item");
            }
            return {row: row, cell: cell};
        };

        for (let i = 0; i < value.length; i++) {
            const item = newItemRow(i, value[i]);
            table.appendChild(item.row);
            const child = addElementToForm(schema, item.cell, input, pathLen + 1, value[i], allowMissing, elementFld);
            child.row = item.row;
            children.push(child);
        }

        const addBtn = h("button", {type: "button", class: "btn btn-ghost btn-xs array-add"}, icon("plus", 14), "Add item");
        const addRow = h("tr", {class: "array-add-row"}, h("td", {colspan: "2"}, addBtn));
        table.appendChild(addRow);

        addBtn.addEventListener("click", () => {
            const elementVal = getInitialValue(schema, elementFld);
            const item = newItemRow(children.length, null);
            const newRow = item.row;
            addRow.before(newRow);
            const child = addElementToForm(schema, item.cell, input, pathLen + 1, elementVal, true, elementFld);
            child.row = newRow;
            children.push(child);
            input.onAdd(child, [], elementVal);
            // a new item starts open, even if an old item at this index was collapsed
            [newRow].concat(qsa("tr.collapsible", newRow)).forEach(r => setCollapsed(r, false));
            updateFormTools();
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
            const table = row.parentElement;
            row.remove();
            forgetCollapsedUnder(row.dataset.path || "");
            if (!row._isMapEntry && table && row._container) {
                renumberItems(table, pathOf(row._container));
            }
            if (table) {
                refreshCollapsed(table);
            }
            updateFormTools();
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

        const basePath = pathOf(container);
        const table = makeTableContainer(container, pathLen);
        const children = {};
        const input = new Input(parent, children, value);

        for (const currField of fields) {
            const row = h("tr", {class: "message_field"});
            row.dataset.path = basePath + "/" + currField.name;
            table.appendChild(row);
            row.appendChild(makeFieldLabelCell(currField, schema));
            if (isContainerField(currField)) {
                makeCollapsible(row, currField.protoName || currField.name, currField.isMap);
            }

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
            // attach first: nested rows find their path through the row
            row.appendChild(cell);
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
                        // show what was just switched on
                        setCollapsed(row, false);
                        refreshCollapsed(cell);
                        const first = cell.querySelector("input:not([type=checkbox]):not([type=radio]), textarea, select");
                        if (first && !first.disabled) {
                            first.focus();
                        }
                    } else {
                        refreshCollapsed(row);
                    }
                    updateFormTools();
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
            row.dataset.path = pathOf(container) + "/" + fld.name;
            table.appendChild(row);
            row.appendChild(makeFieldLabelCell(fld, schema));
            if (isContainerField(fld)) {
                makeCollapsible(row, fld.protoName || fld.name, fld.isMap);
            }

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
                setCollapsed(row, false);
                refreshCollapsed(div);
                updateFormTools();
            });
        }

        const noneRadio = h("input", {type: "radio", name: radioName, value: "", checked: !foundValue, "aria-label": "None"});
        noneRadio.addEventListener("change", () => {
            clearPrevious();
            refreshCollapsed(div);
            updateFormTools();
        });
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

    // ----- collapsible sections -----
    //
    // Fields that hold a message, list, map or oneof, and list items that
    // hold a message, get a chevron. Collapsed rows hide their value and show
    // a one-line summary instead. Each row has a data-path (like
    // "/person/address" or "[2]/labels") so the collapsed state survives
    // rebuilding the form, per method, for this page load.

    const collapsedPaths = new Set();

    function pathOf(el) {
        const holder = el.closest("[data-path]");
        return holder ? holder.dataset.path : "";
    }

    function collapseKey(row) {
        return keyForPath(row.dataset.path);
    }

    function keyForPath(path) {
        return state.service + "." + state.method + " " + path;
    }

    let tempEntrySeq = 0;

    function mapEntryPath(basePath, key) {
        return basePath + "{" + JSON.stringify(String(key)) + "}";
    }

    // True if path is prefix itself or something inside it.
    function isUnderPath(path, prefix) {
        if (path === prefix) {
            return true;
        }
        if (!path.startsWith(prefix)) {
            return false;
        }
        const next = path.charAt(prefix.length);
        return next === "/" || next === "[" || next === "{";
    }

    function forgetCollapsedUnder(prefix) {
        if (!prefix) {
            return;
        }
        const keyPrefix = keyForPath("");
        for (const key of Array.from(collapsedPaths)) {
            if (key.startsWith(keyPrefix) && isUnderPath(key.slice(keyPrefix.length), prefix)) {
                collapsedPaths.delete(key);
            }
        }
    }

    // Gives row (and every row inside it) the path newPrefix in place of its
    // current one, carrying the collapsed state along.
    function movePaths(row, newPrefix) {
        const oldPrefix = row.dataset.path;
        if (oldPrefix === undefined || oldPrefix === newPrefix) {
            return;
        }
        const keyPrefix = keyForPath("");
        const moved = [];
        for (const key of Array.from(collapsedPaths)) {
            if (key.startsWith(keyPrefix)) {
                const path = key.slice(keyPrefix.length);
                if (isUnderPath(path, oldPrefix)) {
                    collapsedPaths.delete(key);
                    moved.push(newPrefix + path.slice(oldPrefix.length));
                }
            }
        }
        moved.forEach(p => collapsedPaths.add(keyForPath(p)));
        [row].concat(qsa("[data-path]", row)).forEach(el => {
            if (isUnderPath(el.dataset.path, oldPrefix)) {
                el.dataset.path = newPrefix + el.dataset.path.slice(oldPrefix.length);
            }
        });
    }

    // After a list item is removed, renumbers the remaining items 0..n-1.
    function renumberItems(table, basePath) {
        qsa(":scope > tr.array_element", table).forEach((r, i) => movePaths(r, basePath + "[" + i + "]"));
    }

    function isContainerField(f) {
        if (f.isArray || f.isMap || isOneOf(f)) {
            return true;
        }
        return !!f.isMessage && (!isWellKnown(f.type) || f.type === "google.protobuf.Any" || f.type === "google.protobuf.ListValue");
    }

    // label is the field name (or "item"). isMap picks "entries" wording.
    function makeCollapsible(row, label, isMap) {
        const isItem = row.classList.contains("array_element");
        row.classList.add("collapsible");
        row._label = label;
        row._isMap = !!isMap;
        const toggle = h("button", {type: "button", class: "collapse-toggle", "aria-expanded": "true"}, icon("chevron-down", 14));
        const summary = h("button", {type: "button", class: isItem ? "item-summary" : "field-summary", tabindex: "-1", "aria-hidden": "true"});
        row._toggle = toggle;
        row._summary = summary;
        if (isItem) {
            qs(".array-actions", row).prepend(toggle);
            qs(".array-value", row).appendChild(summary);
        } else {
            const labelCell = qs(".field-label", row);
            labelCell.prepend(toggle);
            labelCell.appendChild(summary);
        }
        toggle.addEventListener("click", e => {
            const collapse = !row.classList.contains("collapsed");
            setCollapsed(row, collapse);
            if (e.altKey) {
                // Alt-click applies to everything inside, too
                qsa("tr.collapsible", row).forEach(r => setCollapsed(r, collapse));
            }
        });
        summary.addEventListener("click", () => {
            setCollapsed(row, false);
            toggle.focus();
        });
        // restore the state from an earlier build of this form
        applyCollapsed(row, collapsedPaths.has(collapseKey(row)));
    }

    function applyCollapsed(row, on) {
        row.classList.toggle("collapsed", on);
        const name = row._label === "item" ? "item" : row._label;
        row._toggle.setAttribute("aria-expanded", on ? "false" : "true");
        row._toggle.setAttribute("aria-label", (on ? "Expand " : "Collapse ") + name);
        row._toggle.setAttribute("data-tooltip", on ? "Expand (Alt-click: everything inside)" : "Collapse (Alt-click: everything inside)");
    }

    // The element a collapsed row hides, or null if there's nothing to hide.
    function collapseContent(row) {
        let cell;
        if (row.classList.contains("array_element")) {
            cell = qs(":scope > .array-value", row);
        } else {
            cell = Array.from(row.children).find(td =>
                !td.classList.contains("field-label") && !td.classList.contains("field-presence") && !td.classList.contains("oneof-radio"));
        }
        if (!cell) {
            return null;
        }
        const content = Array.from(cell.children).find(c => !c.classList.contains("item-summary"));
        if (!content || content.classList.contains("null")) {
            return null;
        }
        return content;
    }

    function setCollapsed(row, on) {
        if (!row.classList.contains("collapsible")) {
            return;
        }
        if (on && !collapseContent(row)) {
            on = false;
        }
        applyCollapsed(row, on);
        if (on) {
            collapsedPaths.add(collapseKey(row));
            updateSummary(row);
        } else {
            collapsedPaths.delete(collapseKey(row));
        }
    }

    // Brings collapsed rows under root up to date: rows with nothing to
    // collapse open up, the rest get a fresh summary.
    function refreshCollapsed(root) {
        const rows = qsa("tr.collapsible", root);
        if (root.matches && root.matches("tr.collapsible")) {
            rows.unshift(root);
        }
        for (const row of rows) {
            if (!row.classList.contains("collapsed")) {
                continue;
            }
            if (collapseContent(row)) {
                updateSummary(row);
            } else {
                applyCollapsed(row, false);
            }
        }
    }

    function updateSummary(row) {
        const content = collapseContent(row);
        let text = content ? summarize(content, row._isMap) : "";
        if (row.classList.contains("array_element")) {
            const index = qsa(":scope > tr.array_element", row.parentElement).indexOf(row);
            text = "Item " + (index + 1) + (text ? " · " + text : "");
        }
        row._summary.textContent = text;
    }

    function summarize(content, isMap) {
        if (content.classList.contains("oneof")) {
            const radio = qs(":scope > table > tr > .oneof-radio > input:checked", content);
            if (!radio || !radio.value) {
                return "none set";
            }
            const name = qs(".field-name", radio.closest("tr"));
            return (name ? name.textContent : radio.value) + " set";
        }
        if (!content.classList.contains("nest")) {
            return "";
        }
        const table = content.firstElementChild;
        if (table.classList.contains("array-table")) {
            const n = qsa(":scope > tr.array_element", table).length;
            return isMap ? (n === 1 ? "1 entry" : n + " entries") : plural(n, "item");
        }
        const anyType = qs(":scope > tr > td > input[list]", table);
        if (anyType) {
            return anyType.value.trim() || "Any";
        }
        const rows = qsa(":scope > tr.message_field", table);
        let total = 0;
        let set = 0;
        for (const r of rows) {
            const presence = qs(":scope > .field-presence", r);
            if (!presence) {
                continue;
            }
            total++;
            const sw = qs(".switch", presence);
            if (!sw || sw.checked) {
                set++;
            }
        }
        return total ? set + " of " + total + " set" : plural(rows.length, "field");
    }

    const formTools = qs("#gu-form-tools");

    function updateFormTools() {
        if (formTools) {
            formTools.hidden = !qs("tr.collapsible", els.form);
        }
    }

    function setAllCollapsed(on) {
        qsa("tr.collapsible", els.form).forEach(r => setCollapsed(r, on));
    }

    qs("#gu-expand-all").addEventListener("click", () => setAllCollapsed(false));
    qs("#gu-collapse-all").addEventListener("click", () => setAllCollapsed(true));

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
        const typeRow = h("tr", {class: "message_field"},
            makeFieldLabelCell({name: "@type", protoName: "@type", type: ""}, schema),
            h("td", {colspan: "2"}, inp));
        table.appendChild(typeRow);

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
            // drop the rows after @type (at the root, the table also has a header row before it)
            let next = typeRow.nextElementSibling;
            while (next) {
                const after = next.nextElementSibling;
                forgetValidationIn(next);
                next.remove();
                next = after;
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
            refreshCollapsed(table);
            updateFormTools();
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

    // Opens any collapsed sections around el.
    function revealField(el) {
        let row = el.closest("tr.collapsed");
        while (row) {
            setCollapsed(row, false);
            row = row.parentElement.closest("tr.collapsed");
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
        const bad = qsa(".invalid-input", rootEl).find(el =>
            el.getClientRects().length > 0 || (el.closest("tr.collapsed") && !el.closest("[hidden]")));
        if (bad) {
            revealField(bad);
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
        const snapshot = currentRequestSnapshot().request;

        const historyItem = {
            request: {
                timeout_seconds: timeout,
                metadata: metadata.map(m => Object.assign({}, m)),
                data: JSON.parse(JSON.stringify(original === undefined ? null : original)),
            },
            // request.metadata is everything that was sent, inherited headers
            // included; ownMetadata is just this request's own rows, which is
            // what saving the entry as a saved request may keep
            ownMetadata: ownRequestHeaders(),
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
            offerPasskeyFlow(service, method, snapshot, resp);
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
    // Storage
    //
    // History and saved requests are kept by grpcui's database when the page
    // has a storage API (cfg.storageURI, set by the standalone handler), and
    // in this browser's local storage otherwise. If the API can't be reached
    // at start up, the page falls back to local storage for the session.
    // ---------------------------------------------------------------------

    const storageURI = cfg.storageURI || "";
    let useRemote = !!storageURI;

    function storageAPI(path, opts) {
        return api(storageURI + path, opts);
    }

    function fallBackToLocal(e) {
        if (!useRemote) {
            return;
        }
        useRemote = false;
        if (debug) {
            console.warn("storage API unavailable", e);
        }
        toast("Couldn't reach grpcui's database", {
            variant: "error",
            description: "History and saved requests are kept in this browser for now." + (e && e.message ? "\n" + e.message : ""),
        });
    }

    // ---------------------------------------------------------------------
    // History
    // ---------------------------------------------------------------------

    const maxHistory = 100;
    const maxHistorySize = 1024 * 1024; // 1mb, for local storage
    let history = [];
    let historyReady = false;
    let historyView = null;

    function persistLocalHistory() {
        let data = JSON.stringify(history);
        while (data.length > maxHistorySize && history.length > 0) {
            // drop the oldest entries until it fits
            history = history.slice(0, -1);
            data = JSON.stringify(history);
        }
        if (!storage.set(KEYS.history, data) && debug) {
            console.warn("couldn't save history to local storage");
        }
    }

    function historyChanged() {
        if (historyView) {
            renderHistoryList();
        }
    }

    // Moves history kept in this browser by older versions into the database, once.
    async function migrateLocalHistory() {
        const flagKey = KEYS.history + "-migrated";
        if (storage.get(flagKey)) {
            return;
        }
        const local = storage.getJSON(KEYS.history, []);
        const items = (Array.isArray(local) ? local : [])
            .filter(it => it && typeof it.service === "string" && it.service && typeof it.method === "string" && it.method)
            .map(it => {
                const copy = Object.assign({}, it);
                delete copy.id;
                if (typeof copy.startTime !== "string") {
                    copy.startTime = new Date(0).toISOString();
                }
                return copy;
            });
        if (items.length) {
            await storageAPI("/history/import", {method: "POST", body: {target: target, items: items}});
        }
        storage.set(flagKey, "1");
    }

    async function loadHistory() {
        if (useRemote) {
            try {
                await migrateLocalHistory();
                const res = await storageAPI("/history?target=" + encodeURIComponent(target));
                history = (res && Array.isArray(res.items)) ? res.items : [];
                historyReady = true;
                historyChanged();
                return;
            } catch (e) {
                fallBackToLocal(e);
            }
        }
        const local = storage.getJSON(KEYS.history, []);
        history = Array.isArray(local) ? local : [];
        historyReady = true;
        historyChanged();
    }

    function addHistory(item) {
        history = [item].concat(history).slice(0, maxHistory);
        if (useRemote) {
            storageAPI("/history", {method: "POST", body: {target: target, item: item}})
                .then(res => {
                    if (res && !isUnset(res.id)) {
                        item.id = res.id;
                    }
                })
                .catch(e => toast("Couldn't save this call to history", {variant: "error", description: e.message}));
        } else {
            persistLocalHistory();
        }
        historyChanged();
    }

    async function deleteHistoryItem(item) {
        if (useRemote) {
            if (isUnset(item.id)) {
                toast("That entry is still being saved. Try again in a moment.");
                return;
            }
            try {
                await storageAPI("/history/" + encodeURIComponent(item.id), {method: "DELETE"});
            } catch (e) {
                if (e.status === 404) {
                    // already gone (another tab, or trimmed): just drop it here
                    const gone = history.indexOf(item);
                    if (gone >= 0) {
                        history.splice(gone, 1);
                    }
                    historyChanged();
                    return;
                }
                toast("Couldn't delete that entry", {variant: "error", description: e.message});
                return;
            }
        }
        const i = history.indexOf(item);
        if (i >= 0) {
            history.splice(i, 1);
        }
        if (!useRemote) {
            persistLocalHistory();
        }
        historyChanged();
    }

    async function clearHistory() {
        if (useRemote) {
            try {
                await storageAPI("/history?target=" + encodeURIComponent(target), {method: "DELETE"});
            } catch (e) {
                toast("Couldn't clear history", {variant: "error", description: e.message});
                return;
            }
        }
        history = [];
        if (!useRemote) {
            persistLocalHistory();
        }
        historyChanged();
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
            delete item.id;
            delete item.startTime;
            delete item.durationMS;
            delete item.responseData;
            delete item.failureStatus;
            delete item.ownMetadata;
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
        if (!historyReady) {
            list.appendChild(h("div", {class: "gu-empty", "aria-busy": "true"}, icon("loader", 24, "spin")));
            return;
        }
        if (history.length === 0) {
            list.appendChild(h("div", {class: "gu-empty"}, icon("history", 28),
                h("p", {class: "gu-empty-title", text: "No requests yet"}),
                h("p", {class: "gu-empty-desc", text: "Requests you send show up here."})));
            return;
        }
        let shown = 0;
        history.forEach(item => {
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
            const save = h("button", {type: "button", class: "btn btn-ghost btn-icon btn-xs", "aria-label": "Save as a saved request", "data-tooltip": "Save as a saved request"}, icon("bookmark", 14));
            const del = h("button", {type: "button", class: "btn btn-ghost btn-icon btn-xs", "aria-label": "Delete entry", "data-tooltip": "Delete"}, icon("trash", 14));
            const summary = h("summary", {class: "hist-summary"},
                icon("chevron-down", 14, "chevron"),
                historyStatus(item),
                h("div", {class: "hist-main"},
                    h("div", {class: "hist-method mono" + (valid ? "" : " invalid"), text: splitService(item.service).name + "/" + item.method, title: valid ? full : full + " (no longer available)"}),
                    h("div", {class: "hist-meta", text: meta.filter(Boolean).join(" · ")})),
                h("div", {class: "hist-actions"}, load, save, del));
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
            save.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                const req = Object.assign({}, item.request, {metadata: Array.isArray(item.ownMetadata) ? item.ownMetadata : []});
                openSaveDialog(normalizeSaved({service: item.service, method: item.method, request: req}));
            });
            del.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                deleteHistoryItem(item);
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
            description: "The last " + maxHistory + " calls to this server, " + (useRemote ? "kept in grpcui's database on this computer." : "kept in this browser."),
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
                description: "This deletes every call to this server from history. Saved requests aren't affected. You can't undo this.",
                confirmLabel: "Clear history",
                destructive: true,
            });
            if (ok) {
                clearHistory();
            }
        });
        renderHistoryList();
    }

    qs("#gu-history-btn").addEventListener("click", openHistory);

    // Loads a history entry, example or saved request into the form.
    function loadRequest(item, opts) {
        opts = opts || {};
        const req = item.request || {};
        if (!hasMethod(item.service, item.method)) {
            toast("That method isn't available on this server", {variant: "error", description: item.service + "/" + item.method});
            return;
        }
        // older versions stored 'timeout'; examples and saved requests use 'timeout_secs'
        let t = req.timeout_seconds;
        if (isUnset(t)) {
            t = req.timeout_secs;
        }
        if (isUnset(t)) {
            t = req.timeout;
        }
        els.timeout.value = isUnset(t) ? "" : String(t);
        markValid(els.timeout);

        // A history replay restores every header that was sent. Mark the ones
        // that weren't the request's own (older entries didn't record that, so
        // all of theirs), so saving the request later doesn't capture them.
        const own = opts.fromHistory ? (Array.isArray(item.ownMetadata) ? item.ownMetadata : []) : null;
        const isOwn = m => !own || own.some(o => o.name === m.name && o.value === m.value);
        state.requestRows = (req.metadata || []).map(m => {
            const row = {name: m.name || "", value: m.value || "", enabled: true};
            if (!isOwn(m)) {
                row.fromScope = true;
            }
            return row;
        });
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
        state.activeSaved = isUnset(opts.savedId) ? null : opts.savedId;
    }

    // ---------------------------------------------------------------------
    // Saved requests
    //
    // Named request bodies (plus timeout and the request's own headers) for
    // a method, meant for sharing. The export file uses the same format as
    // the -examples flag, so a shared file also works as grpcui -examples.
    // ---------------------------------------------------------------------

    const savedLocalKey = `grpcui-saved-${host}`;
    let savedItems = [];
    let savedReady = false;
    let savedView = null;
    let examples = [];

    // JSON with object keys sorted, for spotting duplicates (matches the
    // server, which re-encodes through a Go map).
    function canonicalJSON(v) {
        if (Array.isArray(v)) {
            return "[" + v.map(canonicalJSON).join(",") + "]";
        }
        if (v && typeof v === "object") {
            return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canonicalJSON(v[k])).join(",") + "}";
        }
        const s = JSON.stringify(v);
        return s === undefined ? "null" : s;
    }

    // Accepts a saved request, an -examples entry or a history entry and
    // returns {name, description, service, method, request:{timeout_secs?, metadata?, data}}.
    function normalizeSaved(raw) {
        raw = raw || {};
        const req = raw.request || {};
        let t = req.timeout_secs;
        if (isUnset(t)) {
            t = req.timeout_seconds;
        }
        if (isUnset(t) && !isUnset(req.timeout) && req.timeout !== "") {
            t = Number(req.timeout);
        }
        const out = {
            name: String(isUnset(raw.name) ? "" : raw.name).trim(),
            description: String(isUnset(raw.description) ? "" : raw.description).trim(),
            service: String(isUnset(raw.service) ? "" : raw.service).trim(),
            method: String(isUnset(raw.method) ? "" : raw.method).trim(),
            request: {},
        };
        if (typeof t === "number" && isFinite(t) && t > 0) {
            out.request.timeout_secs = t;
        }
        const md = (Array.isArray(req.metadata) ? req.metadata : [])
            .filter(m => m && !isUnset(m.name) && String(m.name).trim())
            .map(m => ({name: String(m.name).trim(), value: isUnset(m.value) ? "" : String(m.value)}));
        if (md.length) {
            out.request.metadata = md;
        }
        out.request.data = req.data;
        return out;
    }

    function checkSaved(item, where) {
        const prefix = where ? where + ": " : "";
        if (!item.service || !item.method) {
            throw new Error(prefix + "it needs a service and a method.");
        }
        if (!item.name) {
            throw new Error(prefix + "it needs a name.");
        }
        if (isUnset(item.request.data)) {
            throw new Error(prefix + "it has no request data.");
        }
    }

    function savedKey(item) {
        return [item.service, item.method, item.name, canonicalJSON(item.request)].join("\u0000");
    }

    function localSaved() {
        const v = storage.getJSON(savedLocalKey, []);
        return Array.isArray(v) ? v : [];
    }

    function writeLocalSaved(items) {
        if (!storage.setJSON(savedLocalKey, items)) {
            throw new Error("This browser's storage is full or turned off.");
        }
    }

    // Same promise-based interface for the database and local storage.
    const savedStore = {
        async list() {
            if (useRemote) {
                const res = await storageAPI("/saved");
                return (res && Array.isArray(res.items)) ? res.items : [];
            }
            return localSaved();
        },
        async create(item) {
            checkSaved(item);
            if (useRemote) {
                return storageAPI("/saved", {method: "POST", body: item});
            }
            const items = localSaved();
            const now = new Date().toISOString();
            const stored = Object.assign({}, item, {id: items.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1, createdAt: now, updatedAt: now});
            items.push(stored);
            writeLocalSaved(items);
            return stored;
        },
        async update(id, item) {
            checkSaved(item);
            if (useRemote) {
                return storageAPI("/saved/" + encodeURIComponent(id), {method: "PUT", body: item});
            }
            const items = localSaved();
            const i = items.findIndex(x => x.id === id);
            if (i < 0) {
                throw new Error("That saved request no longer exists.");
            }
            items[i] = Object.assign({}, item, {id: id, createdAt: items[i].createdAt, updatedAt: new Date().toISOString()});
            writeLocalSaved(items);
            return items[i];
        },
        async remove(id) {
            if (useRemote) {
                try {
                    await storageAPI("/saved/" + encodeURIComponent(id), {method: "DELETE"});
                } catch (e) {
                    if (e.status !== 404) {
                        throw e; // 404: already deleted, e.g. in another tab
                    }
                }
                return;
            }
            writeLocalSaved(localSaved().filter(x => x.id !== id));
        },
        async importItems(items) {
            items.forEach((it, i) => checkSaved(it, "Item " + (i + 1)));
            if (useRemote) {
                return storageAPI("/saved/import", {method: "POST", body: {items: items}});
            }
            const existing = localSaved();
            // also count "name (2)" copies from earlier imports as duplicates,
            // so importing the same file again adds nothing (like the server)
            const seen = new Set();
            for (const x of existing) {
                const n = normalizeSaved(x);
                seen.add(savedKey(n));
                const m = /^(.*) \((\d+)\)$/.exec(n.name);
                if (m && Number(m[2]) >= 2) {
                    seen.add(savedKey(Object.assign({}, n, {name: m[1]})));
                }
            }
            let nextId = existing.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
            const now = new Date().toISOString();
            let imported = 0;
            let skipped = 0;
            let renamed = 0;
            const taken = new Set(existing.map(x => [x.service, x.method, x.name].join("\u0000")));
            for (const it of items) {
                const key = savedKey(it);
                if (seen.has(key)) {
                    skipped++;
                    continue;
                }
                seen.add(key);
                // same name, different request: keep both, as "name (2)", ...
                let name = it.name;
                const nameKey = n => [it.service, it.method, n].join("\u0000");
                if (taken.has(nameKey(name))) {
                    let n = 2;
                    while (taken.has(nameKey(it.name + " (" + n + ")"))) {
                        n++;
                    }
                    name = it.name + " (" + n + ")";
                    renamed++;
                }
                taken.add(nameKey(name));
                existing.push(Object.assign({}, it, {name: name, id: nextId++, createdAt: now, updatedAt: now}));
                imported++;
            }
            writeLocalSaved(existing);
            return {imported: imported, skipped: skipped, renamed: renamed};
        },
    };

    function compareSaved(a, b) {
        return a.service.localeCompare(b.service) || a.method.localeCompare(b.method) ||
            a.name.localeCompare(b.name) || ((a.id || 0) - (b.id || 0));
    }

    // Moves saved requests kept in this browser (before a database was in
    // use) into the database, once. Exact duplicates are skipped by the server.
    async function migrateLocalSaved() {
        const flagKey = savedLocalKey + "-migrated";
        if (!useRemote || storage.get(flagKey)) {
            return;
        }
        const items = localSaved().map(normalizeSaved).filter(it => {
            try {
                checkSaved(it);
                return true;
            } catch (e) {
                return false;
            }
        });
        if (items.length) {
            await storageAPI("/saved/import", {method: "POST", body: {items: items}});
        }
        storage.set(flagKey, "1");
    }

    async function reloadSaved() {
        try {
            if (!savedReady) {
                await migrateLocalSaved();
            }
            savedItems = (await savedStore.list()).slice().sort(compareSaved);
        } catch (e) {
            if (!savedReady) {
                // first load: use this browser's copy (fallBackToLocal is a
                // no-op if history already switched to local mode)
                fallBackToLocal(e);
                savedItems = localSaved().slice().sort(compareSaved);
            } else {
                toast("Couldn't load saved requests", {variant: "error", description: e.message});
            }
        }
        savedReady = true;
        if (savedView) {
            const ids = new Set(savedItems.map(s => s.id));
            savedView.selected = new Set(Array.from(savedView.selected).filter(id => ids.has(id)));
            renderSavedList();
        }
        updateSavedButton();
    }

    // ----- Saved menu in the request header -----

    const savedBtn = qs("#gu-saved-btn");
    const savedCount = qs("#gu-saved-count");

    function savedForCurrent() {
        return savedItems.filter(s => s.service === state.service && s.method === state.method);
    }

    function updateSavedButton() {
        if (!savedCount) {
            return;
        }
        const n = savedForCurrent().length;
        savedCount.textContent = String(n);
        savedCount.hidden = n === 0;
        savedBtn.setAttribute("aria-label", "Saved requests" + (n ? " (" + n + " for this method)" : ""));
    }

    // The request as it is now: body, timeout and the request's own headers
    // (inherited metadata is not included).
    function currentRequestSnapshot() {
        const request = {data: JSON.parse(JSON.stringify(state.request === undefined ? null : state.request))};
        const t = parseTimeout();
        if (t) {
            request.timeout_secs = t;
        }
        const md = ownRequestHeaders();
        if (md.length) {
            request.metadata = md;
        }
        const out = {service: state.service, method: state.method, request: request, fromCurrent: true};
        const active = savedItems.find(s => s.id === state.activeSaved && s.service === state.service && s.method === state.method);
        if (active) {
            out.defaultName = active.name;
            out.defaultDescription = active.description || "";
        }
        return out;
    }

    function saveCurrentRequest() {
        if (!state.service || !state.schemaReady) {
            return;
        }
        if (!onlyIfValid()) {
            return;
        }
        openSaveDialog(currentRequestSnapshot());
    }

    function openSaveDialog(src) {
        const nameF = dialogField("Name", {placeholder: "Valid order with two items"});
        const descF = dialogField("Description", {placeholder: "Optional", multiline: true});
        const mdCount = (src.request.metadata || []).length;
        const parts = ["the request body"];
        if (src.request.timeout_secs) {
            parts.push("timeout");
        }
        if (mdCount) {
            parts.push(plural(mdCount, "header") + " set on this request");
        }
        const what = parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1] : parts[0];
        const info = h("p", {class: "dlg-hint"}, "Saves " + what + " for ", h("span", {class: "mono", text: splitService(src.service).name + "/" + src.method}), ". Inherited metadata isn't included.");
        const replaceHint = h("p", {class: "dlg-hint dlg-warn", text: "A saved request with this name already exists for this method. Saving replaces it."});
        replaceHint.hidden = true;
        let submitBtn = null;
        const existingFor = name => savedItems.find(s => s.service === src.service && s.method === src.method && s.name === name.trim());
        const sync = () => {
            const ex = existingFor(nameF.input.value);
            replaceHint.hidden = !ex;
            if (submitBtn) {
                submitBtn.textContent = ex ? "Replace" : "Save";
            }
        };
        nameF.input.addEventListener("input", sync);
        if (src.defaultName) {
            nameF.input.value = src.defaultName;
            descF.input.value = src.defaultDescription || "";
        }
        openFormDialog({
            title: "Save request",
            body: [nameF.el, descF.el, info, replaceHint],
            submitLabel: "Save",
            onReady: r => {
                submitBtn = r.submit;
                sync();
                nameF.input.select();
            },
            onSubmit: async () => {
                const name = nameF.input.value.trim();
                if (!name) {
                    nameF.input.focus();
                    throw new Error("Enter a name.");
                }
                const item = {name: name, description: descF.input.value.trim(), service: src.service, method: src.method, request: src.request};
                const ex = existingFor(name);
                let stored;
                try {
                    stored = ex ? await savedStore.update(ex.id, item) : await savedStore.create(item);
                } catch (e) {
                    if (!ex || e.status !== 404) {
                        throw e;
                    }
                    stored = await savedStore.create(item); // it was deleted elsewhere
                }
                await reloadSaved();
                if (src.fromCurrent && stored && !isUnset(stored.id)) {
                    state.activeSaved = stored.id;
                }
                toast(ex ? "Saved request replaced" : "Request saved", {variant: "success", description: name});
            },
        });
    }

    savedBtn.addEventListener("click", () => {
        const items = [];
        const mine = savedForCurrent();
        if (mine.length) {
            items.push({heading: "Saved for " + (state.method || "this method")});
            mine.forEach(s => items.push({
                label: s.name,
                description: s.description,
                checked: s.id === state.activeSaved,
                onSelect: () => loadRequest(s, {savedId: s.id}),
            }));
        }
        if (examples.length) {
            const ordered = examples.map((ex, i) => ({ex: ex, i: i}))
                .sort((a, b) => Number(b.ex.service === state.service && b.ex.method === state.method) - Number(a.ex.service === state.service && a.ex.method === state.method));
            items.push({heading: "Examples"});
            ordered.forEach(x => items.push({
                label: x.ex.name || ("Example " + (x.i + 1)),
                description: x.ex.description || (x.ex.service + "/" + x.ex.method),
                checked: x.i === state.activeExample,
                onSelect: () => loadRequest(x.ex, {exampleIndex: x.i}),
            }));
        }
        if (!mine.length && !examples.length) {
            items.push({heading: savedReady ? "Nothing saved for this method yet" : "Loading…"});
        }
        items.push({separator: true});
        items.push({label: "Save current request…", icon: "plus", description: IS_MAC ? "⌘S" : "Ctrl S", onSelect: saveCurrentRequest});
        items.push({label: "Manage saved requests…", icon: "bookmark", onSelect: openSavedSheet});
        openMenu(savedBtn, items, {align: "end"});
    });

    // ----- Saved requests panel -----

    function openSavedSheet() {
        const filter = h("input", {type: "search", class: "input input-sm", placeholder: "Filter by name, service or method", "aria-label": "Filter saved requests", autocomplete: "off"});
        const selectAll = h("input", {type: "checkbox", class: "checkbox", "aria-label": "Select all shown"});
        const list = h("div", {class: "saved-list"});
        const selCount = h("span", {class: "muted text-sm"});
        const fileInput = h("input", {type: "file", accept: "application/json,.json", class: "sr-only", tabindex: "-1", "aria-hidden": "true"});
        const importBtn = h("button", {type: "button", class: "btn btn-outline btn-sm"}, icon("upload", 14), "Import");
        const exportBtn = h("button", {type: "button", class: "btn btn-primary btn-sm"}, icon("download", 14), "Export…");
        openSheet({
            title: "Saved requests",
            description: (useRemote ? "Kept in grpcui's database on this computer." : "Kept in this browser.") +
                " Export them to share with other people, or import a file someone shared with you.",
            body: [h("div", {class: "saved-toolbar"}, h("label", {class: "saved-check", "data-tooltip": "Select all shown"}, selectAll), filter), list, fileInput],
            footer: [selCount, h("div", {class: "gu-spacer"}), importBtn, exportBtn],
            onClose: () => {
                savedView = null;
            },
            initialFocus: filter,
        });
        savedView = {filter: filter, list: list, selectAll: selectAll, selCount: selCount, exportBtn: exportBtn, selected: new Set()};
        filter.addEventListener("input", renderSavedList);
        selectAll.addEventListener("change", () => {
            const shown = visibleSaved();
            shown.forEach(s => selectAll.checked ? savedView.selected.add(s.id) : savedView.selected.delete(s.id));
            renderSavedList();
        });
        importBtn.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", () => {
            const file = fileInput.files && fileInput.files[0];
            fileInput.value = "";
            if (file) {
                importSavedFile(file);
            }
        });
        exportBtn.addEventListener("click", openExportDialog);
        renderSavedList();
    }

    function visibleSaved() {
        const q = savedView.filter.value.trim().toLowerCase();
        if (!q) {
            return savedItems;
        }
        return savedItems.filter(s => [s.name, s.description || "", s.service, s.method, s.service + "/" + s.method]
            .some(v => v.toLowerCase().includes(q)));
    }

    // Sets a group checkbox to checked / unchecked / mixed for the given ids.
    function setGroupCheck(box, ids) {
        const n = ids.filter(id => savedView.selected.has(id)).length;
        box.checked = n > 0 && n === ids.length;
        box.indeterminate = n > 0 && n < ids.length;
    }

    function groupCheckbox(ids, label) {
        const box = h("input", {type: "checkbox", class: "checkbox", "aria-label": "Select " + label});
        setGroupCheck(box, ids);
        box.addEventListener("change", () => {
            ids.forEach(id => box.checked ? savedView.selected.add(id) : savedView.selected.delete(id));
            renderSavedList();
        });
        return box;
    }

    function renderSavedList() {
        const v = savedView;
        const list = v.list;
        list.replaceChildren();
        const total = savedItems.length;
        const nSel = v.selected.size;
        v.selCount.textContent = total ? (nSel ? nSel + " of " + total + " selected" : plural(total, "saved request")) : "";
        v.exportBtn.disabled = total === 0;
        if (!savedReady) {
            list.appendChild(h("div", {class: "gu-empty", "aria-busy": "true"}, icon("loader", 24, "spin")));
            return;
        }
        if (total === 0) {
            list.appendChild(h("div", {class: "gu-empty"}, icon("bookmark", 28),
                h("p", {class: "gu-empty-title", text: "No saved requests yet"}),
                h("p", {class: "gu-empty-desc", text: "Use Saved › Save current request, or import a file someone shared with you."})));
            setGroupCheck(v.selectAll, []);
            return;
        }
        const shown = visibleSaved();
        setGroupCheck(v.selectAll, shown.map(s => s.id));
        if (shown.length === 0) {
            list.appendChild(h("p", {class: "muted text-sm", style: {padding: "12px 0"}, text: "Nothing matches “" + v.filter.value.trim() + "”."}));
            return;
        }
        // group: service -> method -> items (savedItems is already sorted)
        const bySvc = new Map();
        for (const s of shown) {
            if (!bySvc.has(s.service)) {
                bySvc.set(s.service, new Map());
            }
            const byMethod = bySvc.get(s.service);
            if (!byMethod.has(s.method)) {
                byMethod.set(s.method, []);
            }
            byMethod.get(s.method).push(s);
        }
        for (const [svc, byMethod] of bySvc) {
            const svcIds = Array.from(byMethod.values()).flat().map(s => s.id);
            const group = h("section", {class: "saved-svc"},
                h("div", {class: "saved-svc-head"},
                    h("label", {class: "saved-check"}, groupCheckbox(svcIds, "all of " + svc)),
                    icon("server", 14, "muted"),
                    h("span", {class: "mono saved-svc-name", text: svc, title: svc})));
            for (const [method, items] of byMethod) {
                const available = hasMethod(svc, method);
                group.appendChild(h("div", {class: "saved-method-head"},
                    h("label", {class: "saved-check"}, groupCheckbox(items.map(s => s.id), "all of " + method)),
                    h("span", {class: "mono", text: method}),
                    available ? null : h("span", {class: "badge badge-outline", "data-tooltip": "This server doesn't have this method, so these can't be loaded here.", text: "not on this server"})));
                for (const s of items) {
                    group.appendChild(savedRow(s, available));
                }
            }
            list.appendChild(group);
        }
    }

    function savedRow(s, available) {
        const box = h("input", {type: "checkbox", class: "checkbox", checked: savedView.selected.has(s.id), "aria-label": "Select " + s.name});
        box.addEventListener("change", () => {
            if (box.checked) {
                savedView.selected.add(s.id);
            } else {
                savedView.selected.delete(s.id);
            }
            renderSavedList();
        });
        const load = h("button", {type: "button", class: "btn btn-outline btn-xs", disabled: !available}, "Load");
        const edit = h("button", {type: "button", class: "btn btn-ghost btn-icon btn-xs", "aria-label": "Rename " + s.name, "data-tooltip": "Rename or describe"}, icon("pencil", 13));
        const del = h("button", {type: "button", class: "btn btn-ghost btn-icon btn-xs", "aria-label": "Delete " + s.name, "data-tooltip": "Delete"}, icon("trash", 14));
        load.addEventListener("click", () => {
            closeSheet();
            loadRequest(s, {savedId: s.id});
        });
        edit.addEventListener("click", () => openEditSavedDialog(s));
        del.addEventListener("click", async () => {
            const ok = await confirmDialog({
                title: "Delete “" + s.name + "”?",
                description: "This removes the saved request for " + s.method + ". You can't undo this.",
                confirmLabel: "Delete",
                destructive: true,
            });
            if (!ok) {
                return;
            }
            try {
                await savedStore.remove(s.id);
                if (state.activeSaved === s.id) {
                    state.activeSaved = null;
                }
                await reloadSaved();
            } catch (e) {
                toast("Couldn't delete that saved request", {variant: "error", description: e.message});
            }
        });
        const meta = [];
        const req = s.request || {};
        if (req.metadata && req.metadata.length) {
            meta.push(plural(req.metadata.length, "header"));
        }
        if (req.timeout_secs) {
            meta.push(req.timeout_secs + " s timeout");
        }
        return h("div", {class: "saved-item" + (s.id === state.activeSaved ? " active" : "")},
            h("label", {class: "saved-check"}, box),
            h("div", {class: "saved-main"},
                h("div", {class: "saved-name", text: s.name}),
                s.description ? h("div", {class: "saved-desc", text: s.description}) : null,
                meta.length ? h("div", {class: "saved-meta", text: meta.join(" · ")}) : null),
            h("div", {class: "hist-actions"}, load, edit, del));
    }

    function openEditSavedDialog(s) {
        const nameF = dialogField("Name", {value: s.name});
        const descF = dialogField("Description", {value: s.description || "", placeholder: "Optional", multiline: true});
        openFormDialog({
            title: "Edit saved request",
            body: [nameF.el, descF.el, h("p", {class: "dlg-hint"}, "To change the request itself, load it, edit it and save it again under the same name.")],
            submitLabel: "Save",
            onSubmit: async () => {
                const name = nameF.input.value.trim();
                if (!name) {
                    throw new Error("Enter a name.");
                }
                const clash = savedItems.find(x => x.id !== s.id && x.service === s.service && x.method === s.method && x.name === name);
                if (clash) {
                    throw new Error("Another saved request for " + s.method + " already has that name.");
                }
                await savedStore.update(s.id, normalizeSaved(Object.assign({}, s, {name: name, description: descF.input.value.trim()})));
                await reloadSaved();
            },
        });
    }

    // Shape written to export files: the -examples format.
    function exportShape(s, includeMetadata) {
        const req = s.request || {};
        const out = {name: s.name};
        if (s.description) {
            out.description = s.description;
        }
        out.service = s.service;
        out.method = s.method;
        out.request = {};
        if (!isUnset(req.timeout_secs)) {
            out.request.timeout_secs = req.timeout_secs;
        }
        if (includeMetadata && Array.isArray(req.metadata) && req.metadata.length) {
            out.request.metadata = req.metadata;
        }
        out.request.data = req.data;
        return out;
    }

    function openExportDialog() {
        const total = savedItems.length;
        const selected = savedView ? savedItems.filter(s => savedView.selected.has(s.id)) : [];
        const radioAll = h("input", {type: "radio", name: "gu-export-scope", value: "all", checked: selected.length === 0});
        const radioSel = h("input", {type: "radio", name: "gu-export-scope", value: "selected", checked: selected.length > 0, disabled: selected.length === 0});
        const mdSwitch = h("input", {type: "checkbox", class: "switch", "aria-label": "Include metadata"});
        const withMd = savedItems.filter(s => s.request && s.request.metadata && s.request.metadata.length).length;
        openFormDialog({
            title: "Export saved requests",
            description: "Downloads a JSON file you can share. Others can import it here, or pass it to grpcui -examples.",
            body: [
                h("div", {class: "dlg-choices", role: "radiogroup", "aria-label": "What to export"},
                    h("label", {class: "dlg-choice"}, radioAll, h("span", null, "All saved requests ", h("span", {class: "muted", text: "(" + total + ")"}))),
                    h("label", {class: "dlg-choice" + (selected.length ? "" : " disabled")}, radioSel,
                        h("span", null, "Only the selected ones ", h("span", {class: "muted", text: selected.length ? "(" + selected.length + ")" : "(select some in the list first)"})))),
                h("label", {class: "dlg-switch"}, mdSwitch,
                    h("span", null,
                        h("span", {class: "dlg-label", text: "Include metadata"}),
                        h("span", {class: "dlg-hint", text: "Headers can hold tokens or passwords. Leave this off unless everyone you share the file with should have them." + (withMd ? "" : " (None of your saved requests have headers.)")}))),
            ],
            submitLabel: "Export",
            onSubmit: async () => {
                const items = radioSel.checked ? selected : savedItems;
                if (!items.length) {
                    throw new Error("There's nothing to export.");
                }
                const out = items.map(s => exportShape(s, mdSwitch.checked));
                const stamp = new Date().toISOString().slice(0, 10);
                download("grpcui-saved-requests-" + stamp + ".json", JSON.stringify(out, null, 2) + "\n");
                toast("Exported " + plural(out.length, "saved request"), {variant: "success", description: mdSwitch.checked ? "Metadata included." : "Metadata left out."});
            },
        });
    }

    function importSavedFile(file) {
        const reader = new FileReader();
        reader.addEventListener("load", async () => {
            let parsed;
            try {
                parsed = JSON.parse(String(reader.result));
            } catch (e) {
                toast("That file isn't valid JSON", {variant: "error", description: file.name});
                return;
            }
            const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.items) ? parsed.items : null);
            if (!list) {
                toast("That file doesn't hold saved requests", {variant: "error", description: "Expected a list like the one Export writes."});
                return;
            }
            const items = list.map(normalizeSaved);
            try {
                const res = await savedStore.importItems(items);
                await reloadSaved();
                const imported = res && typeof res.imported === "number" ? res.imported : items.length;
                const skipped = res && typeof res.skipped === "number" ? res.skipped : 0;
                const renamedN = res && typeof res.renamed === "number" ? res.renamed : 0;
                const notes = [];
                if (skipped) {
                    notes.push(plural(skipped, "duplicate") + " already saved, so skipped.");
                }
                if (renamedN) {
                    notes.push(plural(renamedN, "request") + " had the name of a different saved request, so " + (renamedN === 1 ? "it got" : "they got") + " a number added, like “Name (2)”.");
                }
                toast("Imported " + plural(imported, "saved request"), {
                    variant: "success",
                    description: notes.length ? notes.join(" ") : file.name,
                });
            } catch (e) {
                toast("Couldn't import " + file.name, {variant: "error", description: e.message});
            }
        });
        reader.addEventListener("error", () => toast("Couldn't read " + file.name, {variant: "error"}));
        reader.readAsText(file);
    }

    // ---------------------------------------------------------------------
    // Examples (only served by the standalone handler, from -examples)
    // ---------------------------------------------------------------------

    api("examples")
        .then(data => {
            if (Array.isArray(data)) {
                examples = data;
            }
        })
        .catch(e => {
            if (debug) {
                console.log("no examples: " + e.message);
            }
        });

    // one after the other, so that only one of them decides whether the
    // database is reachable
    loadHistory().then(reloadSaved);

    // ---------------------------------------------------------------------
    // Passkey flows
    //
    // A flow runs a passkey ceremony against the server. It calls a "begin"
    // RPC, builds WebAuthn options from fields of its response, has a passkey
    // create a credential (registration) or sign the challenge (login), then
    // calls a "finish" RPC with fields filled in from the result.
    //
    // Passkeys come from grpcui's virtual authenticator, which works for any
    // site and keeps its keys in grpcui's database, or from this browser
    // (Touch ID, a security key), which only works for this page's own host.
    // Flows and passkeys need grpcui's database.
    // ---------------------------------------------------------------------

    const passkeysBtn = qs("#gu-passkeys-btn");
    let flows = [];
    let passkeys = [];
    let passkeyView = null; // set while the Passkeys sheet is open
    const schemaCache = new Map();

    function passkeysAvailable() {
        return !!storageURI && useRemote;
    }

    // What a passkey needs, per kind of flow. names are normalized field
    // names (see norm) used to guess the mapping.
    const OPTION_FIELDS = {
        register: [
            {key: "challenge", label: "challenge", binary: true, required: true, names: ["challenge"]},
            {key: "rp.id", label: "rp.id", names: ["rpid", "relyingpartyid"], hint: "Defaults to the origin's host"},
            {key: "rp.name", label: "rp.name", names: ["rpname", "relyingpartyname"], hint: "Defaults to rp.id"},
            {key: "user.id", label: "user.id", binary: true, required: true, names: ["userid", "userhandle"]},
            {key: "user.name", label: "user.name", required: true, names: ["username", "name", "email", "login"]},
            {key: "user.displayName", label: "user.displayName", names: ["displayname", "userdisplayname"], hint: "Defaults to user.name"},
            {key: "excludeCredentials", label: "excludeCredentials[].id", binary: true, list: true,
                names: ["excludecredentials", "excludecredentialids", "existingcredentialids", "excludedcredentials", "existingcredentials", "credentialids"]},
        ],
        login: [
            {key: "challenge", label: "challenge", binary: true, required: true, names: ["challenge"]},
            {key: "rpId", label: "rpId", names: ["rpid", "relyingpartyid"], hint: "Defaults to the origin's host"},
            {key: "allowCredentials", label: "allowCredentials[].id", binary: true, list: true,
                names: ["allowcredentials", "allowedcredentials", "allowcredentialids", "allowedcredentialids", "credentialids"],
                hint: "Empty lets any passkey for the site answer"},
        ],
    };
    const WHOLE_NAMES = ["options", "optionsjson", "publickey", "creationoptions", "requestoptions", "publickeyoptions",
        "credentialcreationoptions", "credentialrequestoptions", "webauthnoptions", "challengeoptions"];

    // What a passkey returns, per kind of flow.
    const CREDENTIAL_PARTS = {
        register: [
            {key: "id", label: "credential ID", binary: true, names: ["credentialid", "id", "rawid", "credid"]},
            {key: "response.clientDataJSON", label: "clientDataJSON", binary: true, names: ["clientdatajson", "clientdata"]},
            {key: "response.attestationObject", label: "attestationObject", binary: true, names: ["attestationobject", "attestation"]},
            {key: "response.authenticatorData", label: "authenticatorData", binary: true, names: ["authenticatordata", "authdata"]},
            {key: "response.transports", label: "transports", list: true, names: ["transports"]},
            {key: "response.publicKey", label: "publicKey", binary: true, names: ["publickey"]},
            {key: "response.publicKeyAlgorithm", label: "publicKeyAlgorithm", names: ["publickeyalgorithm", "algorithm", "alg"]},
            {key: "$json", label: "whole credential (JSON)", names: ["credential", "credentialjson", "response", "responsejson",
                "registrationresponse", "attestationresponse", "publickeycredential"]},
        ],
        login: [
            {key: "id", label: "credential ID", binary: true, names: ["credentialid", "id", "rawid", "credid"]},
            {key: "response.clientDataJSON", label: "clientDataJSON", binary: true, names: ["clientdatajson", "clientdata"]},
            {key: "response.authenticatorData", label: "authenticatorData", binary: true, names: ["authenticatordata", "authdata"]},
            {key: "response.signature", label: "signature", binary: true, names: ["signature", "sig"]},
            {key: "response.userHandle", label: "userHandle", binary: true, names: ["userhandle"]},
            {key: "$json", label: "whole credential (JSON)", names: ["credential", "credentialjson", "response", "responsejson",
                "assertion", "assertionresponse", "authenticationresponse", "publickeycredential"]},
        ],
    };

    const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const lastSeg = p => p.slice(p.lastIndexOf(".") + 1);
    const flowKindLabel = k => k === "register" ? "Create passkey" : "Sign in";

    // ----- binary values -----

    function b64ToBytes(s) {
        s = String(s).trim().replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
        while (s.length % 4) {
            s += "=";
        }
        const bin = atob(s);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
            out[i] = bin.charCodeAt(i);
        }
        return out;
    }

    function bytesToB64(b) {
        b = new Uint8Array(b);
        let s = "";
        for (let i = 0; i < b.length; i++) {
            s += String.fromCharCode(b[i]);
        }
        return btoa(s);
    }

    function bytesToB64url(b) {
        return bytesToB64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    const B64_RE = /^[A-Za-z0-9+/_-]+={0,2}$/;

    // Turns a field value into a WebAuthn binary value (base64url). enc is
    // "auto", "base64", "text" or "hex"; auto reads bytes fields as bytes and
    // string fields as base64url (the WebAuthn convention), falling back to
    // the text's UTF-8 bytes.
    function toBinary(value, enc, fieldType) {
        if (typeof value !== "string") {
            throw new Error("expected text, got " + describeType(value));
        }
        enc = enc || "auto";
        if (enc === "text") {
            return bytesToB64url(new TextEncoder().encode(value));
        }
        if (enc === "hex") {
            const hex = value.replace(/\s+/g, "");
            if (!/^([0-9a-fA-F]{2})*$/.test(hex)) {
                throw new Error("not hex");
            }
            return bytesToB64url(new Uint8Array(hex.match(/../g) ? hex.match(/../g).map(x => parseInt(x, 16)) : []));
        }
        if (enc === "base64" || fieldType === "bytes") {
            try {
                return bytesToB64url(b64ToBytes(value));
            } catch (e) {
                throw new Error("not base64");
            }
        }
        if (B64_RE.test(value)) {
            try {
                return bytesToB64url(b64ToBytes(value));
            } catch (e) {
                // not base64 after all: use the text
            }
        }
        return bytesToB64url(new TextEncoder().encode(value));
    }

    function shortID(b64) {
        return b64 && b64.length > 14 ? b64.slice(0, 6) + "…" + b64.slice(-6) : (b64 || "");
    }

    // ----- schemas and paths -----

    function methodSchema(svc, method) {
        const k = svc + "." + method;
        if (!schemaCache.has(k)) {
            schemaCache.set(k, api(metadataURI + "?method=" + encodeURIComponent(k)).catch(e => {
                schemaCache.delete(k);
                throw e;
            }));
        }
        return schemaCache.get(k);
    }

    // Message types shown as one value rather than as their fields.
    const LEAF_MESSAGES = new Set([
        "google.protobuf.Struct", "google.protobuf.Value", "google.protobuf.ListValue", "google.protobuf.Any",
        "google.protobuf.Timestamp", "google.protobuf.Duration", "google.protobuf.FieldMask",
        "google.protobuf.StringValue", "google.protobuf.BytesValue", "google.protobuf.BoolValue",
        "google.protobuf.Int32Value", "google.protobuf.Int64Value", "google.protobuf.UInt32Value",
        "google.protobuf.UInt64Value", "google.protobuf.DoubleValue", "google.protobuf.FloatValue",
    ]);
    const WRAPPED = {"google.protobuf.StringValue": "string", "google.protobuf.BytesValue": "bytes"};

    // The fields of a message type, nested messages flattened into dotted
    // paths: [{path, type, isArray}]. Responses use proto names (grpcui
    // writes them that way); requests use JSON names, like the form.
    function schemaLeaves(schema, type, protoNames) {
        const out = [];
        if (!schema || !type) {
            return out;
        }
        const walk = (t, prefix, depth, seen) => {
            const visit = f => {
                const name = protoNames ? (f.protoName || f.name) : f.name;
                const path = prefix ? prefix + "." + name : name;
                if (f.isMessage && !f.isArray && !f.isMap && !LEAF_MESSAGES.has(f.type) && depth < 4 && !seen.has(f.type)) {
                    walk(f.type, path, depth + 1, new Set(seen).add(f.type));
                } else if (!f.isMap) {
                    out.push({path: path, type: WRAPPED[f.type] || f.type, isArray: !!f.isArray});
                }
            };
            for (const f of (schema.messageTypes || {})[t] || []) {
                if (isOneOf(f)) {
                    (f.oneOfFields || []).forEach(visit);
                } else {
                    visit(f);
                }
            }
        };
        walk(type, "", 0, new Set([type]));
        return out;
    }

    function leafLabel(l) {
        const t = l.type.startsWith("google.protobuf.") ? l.type.slice(16) : l.type.slice(l.type.lastIndexOf(".") + 1);
        return l.path + "  ·  " + t + (l.isArray ? "[]" : "");
    }

    function getPath(obj, path) {
        let v = obj;
        for (const p of path.split(".")) {
            if (v === null || typeof v !== "object") {
                return undefined;
            }
            v = v[p];
        }
        return v;
    }

    function setPath(obj, path, value) {
        const parts = path.split(".");
        let o = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (o[parts[i]] === null || typeof o[parts[i]] !== "object" || Array.isArray(o[parts[i]])) {
                o[parts[i]] = {};
            }
            o = o[parts[i]];
        }
        o[parts[parts.length - 1]] = value;
    }

    // Finds the leaf that best matches one of the names: a whole-path match
    // first, then a last-segment match; shallower paths win.
    function matchLeaf(leaves, names, filter) {
        let best = null;
        let bestScore = Infinity;
        leaves.forEach(l => {
            if (filter && !filter(l)) {
                return;
            }
            const whole = norm(l.path);
            const last = norm(lastSeg(l.path));
            names.forEach((n, i) => {
                const score = whole === n ? i : last === n ? 100 + i : Infinity;
                const s = score + l.path.split(".").length / 10;
                if (s < bestScore) {
                    bestScore = s;
                    best = l;
                }
            });
        });
        return best;
    }

    // ----- building the options and the finish request -----

    function flowOrigin(f) {
        return f.authenticator === "device" ? window.location.origin : (f.origin || "https://localhost");
    }

    function originHost(origin) {
        try {
            return new URL(origin).hostname;
        } catch (e) {
            return "";
        }
    }

    // Reads a source: {from: "response", path} or {from: "value", value}.
    function readSource(src, msg) {
        return src.from === "value" ? src.value : getPath(msg, src.path);
    }

    // Builds the WebAuthn options from the begin response message.
    // leaves maps response paths to their schema leaves.
    function buildOptions(kind, f, msg, leaves) {
        const problems = [];
        const map = f.map || {};
        let opts = {};
        const whole = map.$whole;
        if (whole && whole.from) {
            let v = readSource(whole, msg);
            if (typeof v === "string") {
                try {
                    v = JSON.parse(v);
                } catch (e) {
                    problems.push("whole options: " + (whole.path || "the value") + " isn't JSON (" + e.message + ")");
                    v = null;
                }
            }
            if (v && typeof v === "object" && v.publicKey && typeof v.publicKey === "object") {
                v = v.publicKey; // a CredentialCreationOptions wrapper
            }
            if (v && typeof v === "object" && !Array.isArray(v)) {
                opts = JSON.parse(JSON.stringify(v));
            } else if (v !== null && v !== undefined) {
                problems.push("whole options: " + (whole.path || "the value") + " isn't a JSON object");
            } else if (whole.from === "response") {
                problems.push("whole options: the response has no " + whole.path);
            }
        }
        for (const def of OPTION_FIELDS[kind]) {
            const src = map[def.key];
            if (!src || !src.from) {
                continue;
            }
            let v = readSource(src, msg);
            if (isUnset(v) || v === "" || (Array.isArray(v) && v.length === 0 && !def.list)) {
                if (src.from === "response" && def.required) {
                    problems.push(def.label + ": the response has no " + src.path);
                }
                if (!def.list) {
                    continue;
                }
                v = [];
            }
            const leaf = src.from === "response" ? leaves.get(src.path) : null;
            const type = leaf ? leaf.type : "string";
            try {
                if (def.list) {
                    if (typeof v === "string") {
                        try {
                            v = JSON.parse(v);
                        } catch (e) {
                            v = [v];
                        }
                    }
                    if (!Array.isArray(v)) {
                        v = [v];
                    }
                    v = v.map(x => ({type: "public-key", id: toBinary(x && typeof x === "object" ? x.id : x, src.enc, type)}));
                } else if (def.binary) {
                    v = toBinary(v, src.enc, type);
                } else {
                    v = String(v);
                }
            } catch (e) {
                problems.push(def.label + ": " + e.message);
                continue;
            }
            setPath(opts, def.key, v);
        }

        const host = originHost(flowOrigin(f));
        if (kind === "register") {
            opts.rp = opts.rp && typeof opts.rp === "object" ? opts.rp : {};
            opts.rp.id = opts.rp.id || host;
            opts.rp.name = opts.rp.name || opts.rp.id;
            opts.user = opts.user && typeof opts.user === "object" ? opts.user : {};
            if (!opts.user.displayName && opts.user.name) {
                opts.user.displayName = opts.user.name;
            }
            if (!Array.isArray(opts.pubKeyCredParams) || !opts.pubKeyCredParams.length) {
                opts.pubKeyCredParams = [{type: "public-key", alg: -7}, {type: "public-key", alg: -257}];
            }
            opts.authenticatorSelection = opts.authenticatorSelection || {residentKey: "required", userVerification: "preferred"};
            opts.attestation = opts.attestation || "none";
            if (!opts.user.id) {
                problems.push("user.id is required");
            }
            if (!opts.user.name) {
                problems.push("user.name is required");
            }
        } else {
            opts.rpId = opts.rpId || host;
            opts.userVerification = opts.userVerification || "preferred";
        }
        if (!opts.challenge) {
            problems.push("challenge is required");
        }
        return {options: opts, problems: Array.from(new Set(problems))};
    }

    function partDef(kind, key) {
        return CREDENTIAL_PARTS[kind].find(p => p.key === key);
    }

    // Builds the finish request: the flow's request body with mapped fields
    // filled in. leaves maps request paths to their schema leaves.
    function buildFinishRequest(kind, f, beginMsg, credential, leaves) {
        const data = JSON.parse(JSON.stringify(isUnset(f.finish.request && f.finish.request.data) ? {} : f.finish.request.data));
        const problems = [];
        for (const [path, src] of Object.entries(f.result || {})) {
            if (!src || !src.from) {
                continue;
            }
            const leaf = leaves.get(path);
            let v;
            if (src.from === "credential") {
                v = src.key === "$json" ? JSON.stringify(credential) : getPath(credential, src.key);
                if (isUnset(v)) {
                    problems.push(path + ": the passkey returned no " + src.key);
                    continue;
                }
                const part = partDef(kind, src.key);
                if (part && part.binary && leaf && leaf.type === "bytes" && typeof v === "string") {
                    v = bytesToB64(b64ToBytes(v));
                }
            } else {
                v = readSource(src, beginMsg);
                if (isUnset(v)) {
                    if (src.from === "response") {
                        problems.push(path + ": the begin response has no " + src.path);
                    }
                    continue;
                }
            }
            if (leaf && leaf.isArray && !Array.isArray(v)) {
                v = [v];
            }
            setPath(data, path, v);
        }
        return {data: data, problems: problems};
    }

    // Guesses the mappings from field names, keeping ones already made.
    function guessMappings(kind, f, beginLeaves, finishLeaves, sample) {
        f.map = f.map || {};
        f.result = f.result || {};
        if (!f.map.$whole) {
            const strs = beginLeaves.filter(l => !l.isArray && (l.type === "string" || l.type === "google.protobuf.Struct"));
            let whole = matchLeaf(strs, WHOLE_NAMES);
            if (!whole && sample) {
                whole = strs.find(l => {
                    const v = getPath(sample, l.path);
                    return typeof v === "string" && /"challenge"\s*:/.test(v);
                }) || null;
            }
            if (whole) {
                f.map.$whole = {from: "response", path: whole.path};
            }
        }
        if (!f.map.$whole) {
            for (const def of OPTION_FIELDS[kind]) {
                if (f.map[def.key]) {
                    continue;
                }
                const l = matchLeaf(beginLeaves, def.names, x => !!def.list === x.isArray);
                if (l) {
                    f.map[def.key] = {from: "response", path: l.path, enc: "auto"};
                }
            }
        }
        const used = new Set(Object.keys(f.result));
        const credUsed = new Set(Object.values(f.result).filter(s => s && s.from === "credential").map(s => s.key));
        for (const part of CREDENTIAL_PARTS[kind]) {
            if (credUsed.has(part.key)) {
                continue;
            }
            const l = matchLeaf(finishLeaves, part.names, x => !used.has(x.path) && !!part.list === x.isArray &&
                (part.key !== "$json" || x.type === "string"));
            if (l) {
                f.result[l.path] = {from: "credential", key: part.key};
                used.add(l.path);
            }
        }
        // carry values such as a session ID over from the begin response
        for (const l of finishLeaves) {
            if (used.has(l.path)) {
                continue;
            }
            const same = beginLeaves.find(b => norm(lastSeg(b.path)) === norm(lastSeg(l.path)) && b.isArray === l.isArray);
            if (same) {
                f.result[l.path] = {from: "response", path: same.path};
                used.add(l.path);
            }
        }
    }

    // Guesses whether a method begins a registration or a login.
    function guessKind(method, sample) {
        if (/regist|enrol|signup|create|attest/i.test(method)) {
            return "register";
        }
        if (/login|signin|logon|auth|assert/i.test(method)) {
            return "login";
        }
        const text = JSON.stringify(sample || {});
        return /user_?id|pubKeyCredParams|excludeCredentials|"user"/i.test(text) ? "register" : "login";
    }

    // Guesses the finish method for a begin method.
    function guessFinish(svc, method) {
        const names = (services[svc] || []).map(m => m.name).filter(n => n !== method);
        const rest = method.replace(/^(Begin|Start|Init|Initiate|Request|Get|Create|Generate)/, "");
        const finishRe = /^(Finish|Complete|Verify|End|Validate|Confirm|Submit)/;
        return names.find(n => finishRe.test(n) && n.replace(finishRe, "") === rest) ||
            names.find(n => finishRe.test(n) && n.toLowerCase().includes(rest.toLowerCase())) ||
            names.find(n => /finish/i.test(n)) || "";
    }

    function looksLikePasskeyOptions(msg) {
        let found = false;
        const walk = (v, depth) => {
            if (found || depth > 4 || v === null) {
                return;
            }
            if (typeof v === "string") {
                found = v.length < 100000 && /^\s*\{/.test(v) && /"challenge"\s*:/.test(v);
            } else if (typeof v === "object") {
                for (const [k, x] of Object.entries(v)) {
                    if (norm(k).includes("challenge")) {
                        found = true;
                        return;
                    }
                    walk(x, depth + 1);
                }
            }
        };
        walk(msg, 0);
        return found;
    }

    // ----- calling the RPCs -----

    // Calls one of a flow's RPCs with the given request body, sending the
    // method's inherited metadata plus the flow's own headers. Adds the call
    // to history. Returns {message} or {error}.
    async function callFlowRPC(call, data) {
        const req = call.request || {};
        const own = (req.metadata || []).map(m => ({name: m.name, value: m.value, enabled: true}));
        const metadata = flattenMetadata(resolveMetadata(chainFor(call.service, call.method).concat([{key: "request", rows: own}])))
            .map(m => ({name: m.name, value: m.value}));
        const historyItem = {
            request: {timeout_seconds: req.timeout_secs, metadata: metadata, data: JSON.parse(JSON.stringify(data))},
            ownMetadata: (req.metadata || []).slice(),
            service: call.service,
            method: call.method,
            startTime: new Date().toISOString(),
        };
        const start = performance.now();
        let resp;
        try {
            resp = (await api(invokeURI + "/" + call.service + "." + call.method, {
                method: "POST",
                body: {timeout_seconds: req.timeout_secs || 0, metadata: metadata, data: [data]},
            })) || {};
        } catch (e) {
            addHistory(Object.assign(historyItem, {durationMS: performance.now() - start, failureStatus: e.status ? "HTTP " + e.status : "network error"}));
            return {error: e.message, raw: null};
        }
        addHistory(Object.assign(historyItem, {durationMS: performance.now() - start, responseData: historyResponseData(resp)}));
        if (resp.error) {
            return {error: resp.error.name + ": " + resp.error.message, raw: resp};
        }
        const msgs = (resp.responses || []).filter(m => !m.isError);
        if (!msgs.length) {
            return {error: "The server sent no response message.", raw: resp};
        }
        return {message: msgs[0].message, raw: resp};
    }

    // ----- device passkeys (navigator.credentials) -----

    // Says why this browser can't use a device passkey for rpId, or "".
    function deviceProblem(rpId) {
        const host = window.location.hostname;
        if (!window.PublicKeyCredential || !navigator.credentials) {
            return "This browser doesn't support passkeys.";
        }
        if (/^[\d.]+$/.test(host) || host.includes(":")) {
            return "Browsers don't allow passkeys on an IP address. Open grpcui at " + window.location.protocol + "//localhost" +
                (window.location.port ? ":" + window.location.port : "") + " instead.";
        }
        if (rpId && rpId !== host && !host.endsWith("." + rpId)) {
            return "A device passkey for " + rpId + " only works on that site, and this page is on " + host +
                ". Use grpcui's passkeys instead, or have the server use " + host + " as its relying party ID.";
        }
        return "";
    }

    function credentialToJSON(cred) {
        if (typeof cred.toJSON === "function") {
            try {
                return cred.toJSON();
            } catch (e) {
                // build it by hand below
            }
        }
        const r = cred.response;
        const out = {
            id: cred.id,
            rawId: bytesToB64url(cred.rawId),
            type: cred.type,
            response: {clientDataJSON: bytesToB64url(r.clientDataJSON)},
            clientExtensionResults: typeof cred.getClientExtensionResults === "function" ? cred.getClientExtensionResults() : {},
        };
        if (cred.authenticatorAttachment) {
            out.authenticatorAttachment = cred.authenticatorAttachment;
        }
        if (r.attestationObject) {
            out.response.attestationObject = bytesToB64url(r.attestationObject);
            if (typeof r.getTransports === "function") {
                out.response.transports = r.getTransports();
            }
            if (typeof r.getAuthenticatorData === "function") {
                out.response.authenticatorData = bytesToB64url(r.getAuthenticatorData());
            }
            if (typeof r.getPublicKey === "function" && r.getPublicKey()) {
                out.response.publicKey = bytesToB64url(r.getPublicKey());
            }
            if (typeof r.getPublicKeyAlgorithm === "function") {
                out.response.publicKeyAlgorithm = r.getPublicKeyAlgorithm();
            }
        } else {
            out.response.authenticatorData = bytesToB64url(r.authenticatorData);
            out.response.signature = bytesToB64url(r.signature);
            if (r.userHandle && r.userHandle.byteLength) {
                out.response.userHandle = bytesToB64url(r.userHandle);
            }
        }
        return out;
    }

    async function deviceCreate(options) {
        const o = JSON.parse(JSON.stringify(options));
        o.challenge = b64ToBytes(o.challenge);
        o.user.id = b64ToBytes(o.user.id);
        (o.excludeCredentials || []).forEach(d => d.id = b64ToBytes(d.id));
        delete o.hints;
        return credentialToJSON(await navigator.credentials.create({publicKey: o}));
    }

    async function deviceGet(options) {
        const o = JSON.parse(JSON.stringify(options));
        o.challenge = b64ToBytes(o.challenge);
        (o.allowCredentials || []).forEach(d => d.id = b64ToBytes(d.id));
        delete o.hints;
        return credentialToJSON(await navigator.credentials.get({publicKey: o}));
    }

    // ----- loading -----

    async function reloadPasskeys() {
        if (!passkeysAvailable()) {
            return;
        }
        const [f, p] = await Promise.all([storageAPI("/flows"), storageAPI("/passkeys")]);
        flows = (f && f.items) || [];
        passkeys = (p && p.items) || [];
        if (passkeyView) {
            renderPasskeySheet();
        }
    }

    const flowStore = {
        save(item) {
            const body = {name: item.name, kind: item.kind, flow: item.flow};
            return item.id
                ? storageAPI("/flows/" + encodeURIComponent(item.id), {method: "PUT", body: body})
                : storageAPI("/flows", {method: "POST", body: body});
        },
        remove(id) {
            return storageAPI("/flows/" + encodeURIComponent(id), {method: "DELETE"});
        },
    };

    // ----- running a flow -----

    // Asks which of several passkeys should sign. Resolves to one or null.
    function choosePasskey(cands) {
        let chosen = cands[0];
        const radios = cands.map((p, i) => {
            const r = h("input", {type: "radio", name: "gu-pk-choice", checked: i === 0});
            r.addEventListener("change", () => chosen = p);
            return h("label", {class: "dlg-choice"}, r, h("span", null, p.userName || "(no name)", " ",
                h("span", {class: "muted mono", text: shortID(p.credentialId)}),
                p.lastUsedAt ? h("span", {class: "muted", text: " · used " + formatTime(p.lastUsedAt)}) : null));
        });
        return openFormDialog({
            title: "Which passkey should sign in?",
            description: plural(cands.length, "passkey") + " for " + cands[0].rpId + " can answer this challenge.",
            body: [h("div", {class: "dlg-choices", role: "radiogroup"}, radios)],
            submitLabel: "Sign in",
            onSubmit: () => true,
        }).then(ok => ok ? chosen : null);
    }

    function stepRow(title) {
        const status = h("span", {class: "pk-step-icon"}, icon("dot", 16));
        const detail = h("div", {class: "pk-step-detail muted text-sm"});
        const body = h("div", {class: "pk-step-json"});
        const row = h("li", {class: "pk-step"},
            status,
            h("div", {class: "pk-step-main"}, h("div", {class: "pk-step-title", text: title}), detail, body));
        return {
            el: row,
            set(state, text, json, jsonLabel) {
                row.dataset.state = state;
                status.replaceChildren(icon({running: "loader", done: "check-circle", failed: "alert", skipped: "dot", pending: "dot"}[state] || "dot",
                    16, state === "running" ? "spin" : ""));
                detail.textContent = text || "";
                body.replaceChildren();
                if (json !== undefined) {
                    body.appendChild(h("details", {open: state === "failed"},
                        h("summary", {text: jsonLabel || "Details"}), codeBlock(json)));
                }
            },
            add(label, json) {
                body.appendChild(h("details", null, h("summary", {text: label}), codeBlock(json)));
            },
        };
    }

    async function runFlow(item) {
        if (!passkeysAvailable()) {
            toast("Passkey flows need grpcui's database", {variant: "error"});
            return;
        }
        const f = item.flow;
        const kind = item.kind;
        const steps = {
            begin: stepRow("Begin · " + f.begin.service + "/" + f.begin.method),
            sign: stepRow(kind === "register" ? "Create passkey" : "Sign the challenge"),
            finish: stepRow("Finish · " + f.finish.service + "/" + f.finish.method),
        };
        if (kind === "register") {
            steps.save = stepRow("Keep passkey");
        }
        Object.values(steps).forEach(s => s.set("pending", ""));

        const closeBtn = h("button", {type: "button", class: "btn btn-outline btn-sm"}, "Close");
        const editBtn = h("button", {type: "button", class: "btn btn-ghost btn-sm"}, icon("pencil", 14), "Edit flow");
        const againBtn = h("button", {type: "button", class: "btn btn-primary btn-sm", disabled: true}, icon("play", 14), "Run again");
        const summary = h("div", {class: "pk-run-summary"});
        const dlg = h("dialog", {class: "dialog dialog-wide", "aria-label": "Run " + item.name},
            h("h2", {class: "dialog-title"}, item.name, " ", h("span", {class: "badge badge-secondary", text: flowKindLabel(kind)})),
            h("p", {class: "dialog-desc", text: (f.authenticator === "device" ? "This device's passkey" : "grpcui's passkey") +
                " · origin " + flowOrigin(f)}),
            h("ol", {class: "pk-steps"}, Object.values(steps).map(s => s.el)),
            summary,
            h("div", {class: "dialog-actions"}, editBtn, h("div", {class: "gu-spacer"}), closeBtn, againBtn));
        closeBtn.addEventListener("click", () => dlg.close());
        againBtn.addEventListener("click", () => {
            dlg.close();
            runFlow(item);
        });
        editBtn.addEventListener("click", () => {
            dlg.close();
            openFlowEditor(item);
        });
        dlg.addEventListener("close", () => dlg.remove());
        ROOT.appendChild(dlg);
        dlg.showModal();

        const fail = (step, text, json) => {
            step.set("failed", text, json, "What happened");
            summary.replaceChildren(alertBox("destructive", "The flow stopped", text));
        };
        let created = null; // a passkey made by this run, until the server accepts it
        try {
            // 1. begin
            steps.begin.set("running", "Calling the server…");
            const beginReq = f.begin.request || {};
            const begin = await callFlowRPC(f.begin, isUnset(beginReq.data) ? {} : beginReq.data);
            if (begin.error) {
                fail(steps.begin, begin.error, begin.raw || undefined);
                return;
            }
            steps.begin.set("done", "Got the challenge", begin.message, "Response");

            // 2. options
            const beginSchema = await methodSchema(f.begin.service, f.begin.method);
            const leaves = new Map(schemaLeaves(beginSchema, beginSchema.responseType, true).map(l => [l.path, l]));
            const built = buildOptions(kind, f, begin.message, leaves);
            if (built.problems.length) {
                fail(steps.sign, "Couldn't build the passkey options: " + built.problems.join("; "), built.options);
                return;
            }
            const options = built.options;
            const origin = flowOrigin(f);
            const rpId = kind === "register" ? options.rp.id : options.rpId;
            steps.sign.set("running", f.authenticator === "device" ? "Waiting for your passkey…" : "Signing…");

            // 3. create or sign
            let credential;
            let usedPasskey = null;
            if (f.authenticator === "device") {
                const problem = deviceProblem(rpId);
                if (problem) {
                    fail(steps.sign, problem, options);
                    return;
                }
                try {
                    credential = kind === "register" ? await deviceCreate(options) : await deviceGet(options);
                } catch (e) {
                    fail(steps.sign, (e.name ? e.name + ": " : "") + e.message, options);
                    return;
                }
                if (kind === "register") {
                    created = await storageAPI("/passkeys", {
                        method: "POST",
                        body: {
                            rpId: rpId, origin: origin, credentialId: credential.id, userId: options.user.id,
                            userName: options.user.name, displayName: options.user.displayName || "",
                            publicKey: (credential.response && credential.response.publicKey) || "",
                        },
                    });
                }
            } else if (kind === "register") {
                try {
                    const res = await storageAPI("/passkeys/create", {method: "POST", body: {options: options, origin: origin}});
                    created = res.passkey;
                    credential = res.credential;
                } catch (e) {
                    fail(steps.sign, e.message, options);
                    return;
                }
            } else {
                await reloadPasskeys();
                const allow = (options.allowCredentials || []).map(d => bytesToB64url(b64ToBytes(d.id)));
                const cands = passkeys.filter(p => p.kind === "virtual" && p.status === "confirmed" && p.rpId === rpId &&
                    (!allow.length || allow.includes(p.credentialId)))
                    .sort((a, b) => String(b.lastUsedAt || b.createdAt).localeCompare(String(a.lastUsedAt || a.createdAt)));
                if (!cands.length) {
                    fail(steps.sign, allow.length
                        ? "None of grpcui's passkeys for " + rpId + " is in the server's allowCredentials. Run a registration flow for this user first."
                        : "grpcui has no passkeys for " + rpId + ". Run a registration flow first.", options);
                    return;
                }
                usedPasskey = cands.length === 1 ? cands[0] : await choosePasskey(cands);
                if (!usedPasskey) {
                    fail(steps.sign, "No passkey was chosen.");
                    return;
                }
                try {
                    const res = await storageAPI("/passkeys/sign", {method: "POST", body: {options: options, origin: origin, id: usedPasskey.id}});
                    usedPasskey = res.passkey;
                    credential = res.credential;
                } catch (e) {
                    fail(steps.sign, e.message, options);
                    return;
                }
            }
            const who = created || usedPasskey;
            steps.sign.set("done", who
                ? (who.userName || "passkey") + " · " + who.rpId + " · ID " + shortID(who.credentialId) + (usedPasskey ? " · sign count " + usedPasskey.signCount : "")
                : "Done", credential, "Credential");
            steps.sign.add("Options sent to the passkey", options);

            // 4. finish
            const finishSchema = await methodSchema(f.finish.service, f.finish.method);
            const fLeaves = new Map(schemaLeaves(finishSchema, finishSchema.requestType, false).map(l => [l.path, l]));
            const req = buildFinishRequest(kind, f, begin.message, credential, fLeaves);
            if (req.problems.length) {
                fail(steps.finish, req.problems.join("; "), req.data);
                return;
            }
            steps.finish.set("running", "Calling the server…");
            const finish = await callFlowRPC(f.finish, req.data);
            if (finish.error) {
                fail(steps.finish, finish.error, finish.raw || req.data);
                steps.finish.add("Request", req.data);
                return;
            }
            steps.finish.set("done", kind === "register" ? "The server accepted the passkey" : "The server accepted the signature", finish.message, "Response");
            steps.finish.add("Request", req.data);

            // 5. keep
            if (created) {
                await storageAPI("/passkeys/" + encodeURIComponent(created.id) + "/confirm", {method: "POST"});
                steps.save.set("done", "Saved " + (created.userName || "the passkey") + " for " + created.rpId);
                created = null;
            }
            summary.replaceChildren(h("div", {class: "alert alert-success", role: "status"}, icon("check-circle", 16),
                h("div", {class: "alert-body"}, h("div", {class: "alert-title",
                    text: kind === "register" ? "Passkey created" : "Signed in"}))));
        } catch (e) {
            if (debug) {
                console.trace(e);
            }
            summary.replaceChildren(alertBox("destructive", "The flow stopped", e.message || String(e)));
        } finally {
            if (created) {
                // the server didn't accept it, so don't keep it
                try {
                    await storageAPI("/passkeys/" + encodeURIComponent(created.id), {method: "DELETE"});
                    steps.save.set("skipped", "Removed the passkey the server didn't accept");
                } catch (e) {
                    steps.save.set("failed", "Couldn't remove the unaccepted passkey: " + e.message);
                }
            }
            Object.values(steps).forEach(s => s.el.dataset.state === "pending" && s.set("skipped", "Not run"));
            againBtn.disabled = false;
            reloadPasskeys().catch(() => {});
        }
    }

    // ----- the flow editor -----

    function methodOptions(selected) {
        const out = [h("option", {value: "", text: "Choose a method…"})];
        for (const svc of serviceNames) {
            const group = h("optgroup", {label: svc});
            for (const m of services[svc]) {
                const v = svc + "/" + m.name;
                group.appendChild(h("option", {value: v, text: m.name, selected: v === selected}));
            }
            out.push(group);
        }
        return out;
    }

    function splitMethod(v) {
        const i = v.lastIndexOf("/");
        return i < 0 ? {service: "", method: ""} : {service: v.slice(0, i), method: v.slice(i + 1)};
    }

    function jsonArea(value, rows) {
        const ta = h("textarea", {class: "input input-sm code-input pk-json", rows: String(rows || 3), spellcheck: "false"});
        ta.value = JSON.stringify(isUnset(value) ? {} : value, null, 2);
        return ta;
    }

    function parseArea(ta, what) {
        try {
            const v = JSON.parse(ta.value.trim() || "{}");
            if (v === null || typeof v !== "object" || Array.isArray(v)) {
                throw new Error("must be a JSON object");
            }
            markValid(ta);
            return v;
        } catch (e) {
            markInvalid(ta, e.message);
            throw new Error(what + ": " + e.message);
        }
    }

    // A source select. choices: [{value, label, group}]. value encodes the
    // source: "" (none), "=" (fixed value), "r:path", "c:key".
    function sourceSelect(choices, current, noneLabel) {
        const sel = h("select", {class: "select input-sm"});
        sel.appendChild(h("option", {value: "", text: noneLabel}));
        sel.appendChild(h("option", {value: "=", text: "Fixed value…"}));
        const groups = new Map();
        for (const c of choices) {
            if (!groups.has(c.group)) {
                groups.set(c.group, h("optgroup", {label: c.group}));
                sel.appendChild(groups.get(c.group));
            }
            groups.get(c.group).appendChild(h("option", {value: c.value, text: c.label}));
        }
        sel.value = current;
        if (sel.value !== current) {
            // a field the schema no longer has: keep it visible
            sel.appendChild(h("option", {value: current, text: current.slice(2) + " (missing)"}));
            sel.value = current;
        }
        return sel;
    }

    function srcValue(src) {
        if (!src || !src.from) {
            return "";
        }
        return src.from === "value" ? "=" : src.from === "credential" ? "c:" + src.key : "r:" + src.path;
    }

    function srcFromValue(v, prev) {
        if (!v) {
            return null;
        }
        if (v === "=") {
            return {from: "value", value: prev && prev.from === "value" ? prev.value : ""};
        }
        if (v.startsWith("c:")) {
            return {from: "credential", key: v.slice(2)};
        }
        return {from: "response", path: v.slice(2), enc: prev && prev.enc};
    }

    // Opens the editor for a new flow (item without id) or a saved one.
    // sample is a begin response message to preview with, if there is one.
    async function openFlowEditor(item, sample) {
        item = JSON.parse(JSON.stringify(item));
        const f = item.flow;
        f.begin = f.begin || {service: "", method: "", request: {data: {}}};
        f.finish = f.finish || {service: "", method: "", request: {data: {}}};
        f.map = f.map || {};
        f.result = f.result || {};
        f.authenticator = f.authenticator || "virtual";
        f.origin = f.origin || "https://localhost";
        let kind = item.kind || "login";
        let beginSchema = null;
        let finishSchema = null;
        let beginLeaves = [];
        let finishLeaves = [];

        const nameF = dialogField("Name", {value: item.name || "", placeholder: "Sign in as alice"});
        const kindSeg = h("div", {class: "segmented", role: "group", "aria-label": "Kind"});
        const kindBtns = ["register", "login"].map(k => {
            const b = h("button", {type: "button", "aria-pressed": String(k === kind)}, flowKindLabel(k));
            b.addEventListener("click", () => {
                kind = k;
                kindBtns.forEach(x => x.setAttribute("aria-pressed", String(x === b)));
                renderMaps();
            });
            kindSeg.appendChild(b);
            return b;
        });
        const authSel = h("select", {class: "select input-sm"},
            h("option", {value: "virtual", text: "grpcui's passkey (works for any site)"}),
            h("option", {value: "device", text: "This device's passkey (Touch ID, security key)"}));
        authSel.value = f.authenticator;
        const originInput = h("input", {type: "text", class: "input input-sm mono", value: f.origin, autocomplete: "off", spellcheck: "false"});
        const originField = h("label", {class: "dlg-field"}, h("span", {class: "dlg-label", text: "Origin"}), originInput,
            h("span", {class: "dlg-hint", text: "Written into clientDataJSON; the server must accept it. rp.id defaults to its host."}));
        const deviceNote = h("p", {class: "dlg-hint"});
        const updateAuth = () => {
            f.authenticator = authSel.value;
            originField.hidden = f.authenticator === "device";
            const p = f.authenticator === "device" ? deviceProblem("") : "";
            deviceNote.textContent = f.authenticator === "device"
                ? (p || "Uses origin " + window.location.origin + ". It only works when the server's relying party ID is " + window.location.hostname + ".")
                : "";
            deviceNote.hidden = !deviceNote.textContent;
            renderPreview();
        };
        authSel.addEventListener("change", updateAuth);
        originInput.addEventListener("input", () => {
            f.origin = originInput.value.trim();
            renderPreview();
        });

        const beginSel = h("select", {class: "select input-sm"}, methodOptions(f.begin.service ? f.begin.service + "/" + f.begin.method : ""));
        const finishSel = h("select", {class: "select input-sm"}, methodOptions(f.finish.service ? f.finish.service + "/" + f.finish.method : ""));
        const beginBody = jsonArea(f.begin.request && f.begin.request.data, 3);
        const finishBody = jsonArea(f.finish.request && f.finish.request.data, 2);
        const sampleBtn = h("button", {type: "button", class: "btn btn-outline btn-xs"}, icon("play", 12), "Call Begin for a preview");
        const optionsTable = h("div", {class: "pk-map"});
        const resultTable = h("div", {class: "pk-map"});
        const preview = h("div", {class: "pk-preview"});

        function section(n, title, desc, ...children) {
            return h("div", {class: "pk-section"},
                h("div", {class: "pk-section-head"}, h("span", {class: "pk-num", text: String(n)}),
                    h("div", null, h("div", {class: "pk-section-title", text: title}), desc ? h("div", {class: "dlg-hint", text: desc}) : null)),
                ...children);
        }

        async function loadBegin(guess) {
            const m = splitMethod(beginSel.value);
            f.begin.service = m.service;
            f.begin.method = m.method;
            beginSchema = null;
            beginLeaves = [];
            if (m.method) {
                try {
                    beginSchema = await methodSchema(m.service, m.method);
                    beginLeaves = schemaLeaves(beginSchema, beginSchema.responseType, true);
                } catch (e) {
                    toast("Couldn't load " + m.method, {variant: "error", description: e.message});
                }
            }
            if (guess && m.method) {
                if (!item.id && !f.finish.method) {
                    const fin = guessFinish(m.service, m.method);
                    if (fin) {
                        finishSel.value = m.service + "/" + fin;
                        await loadFinish(false);
                    }
                }
                guessMappings(kind, f, beginLeaves, finishLeaves, sample);
            }
            renderMaps();
        }

        async function loadFinish(guess) {
            const m = splitMethod(finishSel.value);
            f.finish.service = m.service;
            f.finish.method = m.method;
            finishSchema = null;
            finishLeaves = [];
            if (m.method) {
                try {
                    finishSchema = await methodSchema(m.service, m.method);
                    finishLeaves = schemaLeaves(finishSchema, finishSchema.requestType, false);
                } catch (e) {
                    toast("Couldn't load " + m.method, {variant: "error", description: e.message});
                }
            }
            if (guess) {
                guessMappings(kind, f, beginLeaves, finishLeaves, sample);
            }
            renderMaps();
        }

        beginSel.addEventListener("change", () => {
            sample = null;
            loadBegin(true);
        });
        finishSel.addEventListener("change", () => loadFinish(true));
        sampleBtn.addEventListener("click", async () => {
            let data;
            try {
                data = parseArea(beginBody, "Begin request");
            } catch (e) {
                return;
            }
            if (!f.begin.method) {
                return;
            }
            sampleBtn.disabled = true;
            const res = await callFlowRPC({service: f.begin.service, method: f.begin.method, request: Object.assign({}, f.begin.request, {data: data})}, data);
            sampleBtn.disabled = false;
            if (res.error) {
                toast("Begin failed", {variant: "error", description: res.error});
                return;
            }
            sample = res.message;
            guessMappings(kind, f, beginLeaves, finishLeaves, sample);
            renderMaps();
        });

        function binaryEncSelect(src) {
            const sel = h("select", {class: "select input-sm pk-enc", "aria-label": "Encoding", "data-tooltip": "How to read the value as bytes"},
                h("option", {value: "auto", text: "Auto"}), h("option", {value: "base64", text: "Base64"}),
                h("option", {value: "text", text: "Text"}), h("option", {value: "hex", text: "Hex"}));
            sel.value = src.enc || "auto";
            sel.addEventListener("change", () => {
                src.enc = sel.value;
                renderPreview();
            });
            return sel;
        }

        function mapRow(label, required, hint, sel, extra) {
            return h("div", {class: "pk-map-row"},
                h("div", {class: "pk-map-label"}, h("span", {class: "mono", text: label}), required ? h("span", {class: "required", text: "*"}) : null,
                    hint ? h("div", {class: "dlg-hint", text: hint}) : null),
                h("div", {class: "pk-map-src"}, sel, extra));
        }

        function renderMaps() {
            // options ← begin response
            const respChoices = beginLeaves.map(l => ({value: "r:" + l.path, label: leafLabel(l), group: "Begin response"}));
            const rows = [];
            const wholeChoices = respChoices.filter(c => {
                const l = beginLeaves.find(x => "r:" + x.path === c.value);
                return l && !l.isArray && (l.type === "string" || l.type === "google.protobuf.Struct");
            });
            const wholeSel = sourceSelect(wholeChoices, srcValue(f.map.$whole), "Not used");
            wholeSel.querySelector('option[value="="]').remove();
            wholeSel.addEventListener("change", () => {
                f.map.$whole = srcFromValue(wholeSel.value, f.map.$whole);
                renderMaps();
            });
            rows.push(mapRow("whole options (JSON)", false, "For servers that send all the options as one JSON field. Fields below override it.", wholeSel));
            for (const def of OPTION_FIELDS[kind]) {
                const src = f.map[def.key];
                const sel = sourceSelect(respChoices, srcValue(src), f.map.$whole ? "From whole options" : (def.hint ? "Default" : "Not mapped"));
                sel.addEventListener("change", () => {
                    f.map[def.key] = srcFromValue(sel.value, f.map[def.key]);
                    renderMaps();
                });
                const extra = [];
                if (src && src.from === "value") {
                    const input = h("input", {type: "text", class: "input input-sm mono", value: src.value || "", placeholder: def.binary ? "base64url or text" : "", autocomplete: "off", spellcheck: "false"});
                    input.addEventListener("input", () => {
                        src.value = input.value;
                        renderPreview();
                    });
                    extra.push(input);
                }
                if (src && src.from && def.binary) {
                    extra.push(binaryEncSelect(src));
                }
                rows.push(mapRow(def.label, def.required && !f.map.$whole, def.hint, sel, extra));
            }
            optionsTable.replaceChildren(...rows);

            // finish request ← credential / begin response
            const credChoices = CREDENTIAL_PARTS[kind].map(p => ({value: "c:" + p.key, label: p.label, group: "Passkey result"}));
            const choices = credChoices.concat(respChoices);
            const fRows = [];
            if (!finishLeaves.length) {
                fRows.push(h("p", {class: "muted text-sm", text: f.finish.method ? "This method's request has no fields." : "Choose the finish method."}));
            }
            for (const l of finishLeaves) {
                const src = f.result[l.path];
                const sel = sourceSelect(choices, srcValue(src), "Leave as in the request body");
                sel.addEventListener("change", () => {
                    f.result[l.path] = srcFromValue(sel.value, f.result[l.path]);
                    if (!f.result[l.path]) {
                        delete f.result[l.path];
                    }
                    renderMaps();
                });
                const extra = [];
                if (src && src.from === "value") {
                    const input = h("input", {type: "text", class: "input input-sm mono", value: src.value || "", autocomplete: "off", spellcheck: "false"});
                    input.addEventListener("input", () => src.value = input.value);
                    extra.push(input);
                }
                fRows.push(mapRow(leafLabel(l), false, null, sel, extra));
            }
            resultTable.replaceChildren(...fRows);
            renderPreview();
        }

        function renderPreview() {
            if (!sample) {
                preview.replaceChildren(h("div", {class: "notice"},
                    h("span", {class: "muted text-sm", text: f.begin.method ? "No begin response to preview with yet." : "Choose the begin method."}),
                    h("div", {class: "gu-spacer"}), f.begin.method ? sampleBtn : null));
                return;
            }
            const leaves = new Map(beginLeaves.map(l => [l.path, l]));
            const built = buildOptions(kind, f, sample, leaves);
            preview.replaceChildren(
                h("div", {class: "pk-preview-head"}, h("span", {class: "dlg-label", text: "Options the passkey will get, from the last begin response"}),
                    h("div", {class: "gu-spacer"}), sampleBtn),
                ...(built.problems.length ? [alertBox("warning", "Not ready yet", built.problems.join("; "))] : []),
                codeBlock(built.options));
        }

        const form = [
            nameF.el,
            h("div", {class: "pk-row"},
                h("div", {class: "dlg-field"}, h("span", {class: "dlg-label", text: "What it does"}), kindSeg),
                h("label", {class: "dlg-field", style: {flex: "1"}}, h("span", {class: "dlg-label", text: "Passkey"}), authSel)),
            originField,
            deviceNote,
            section(1, "Begin", "Called first. Its response holds the challenge.",
                h("label", {class: "dlg-field"}, h("span", {class: "dlg-label", text: "Method"}), beginSel),
                h("label", {class: "dlg-field"}, h("span", {class: "dlg-label", text: "Request body"}), beginBody)),
            section(2, "Passkey options", "Which begin response fields the passkey needs. Guessed from field names; check them.",
                optionsTable, preview),
            section(3, "Finish", "Called with what the passkey returned.",
                h("label", {class: "dlg-field"}, h("span", {class: "dlg-label", text: "Method"}), finishSel),
                h("label", {class: "dlg-field"}, h("span", {class: "dlg-label", text: "Request body"}), finishBody,
                    h("span", {class: "dlg-hint", text: "Fields mapped below replace these values."})),
                resultTable),
        ];

        const ready = (async () => {
            updateAuth();
            await loadFinish(false);
            await loadBegin(!item.id);
        })();

        let saved = null;
        const ok = await openFormDialog({
            title: item.id ? "Edit passkey flow" : "New passkey flow",
            description: "Maps a begin RPC's response to a passkey, and the passkey's result to a finish RPC's request.",
            body: form,
            className: "dialog-wide",
            submitLabel: item.id ? "Save" : "Save and run",
            onSubmit: async () => {
                await ready;
                const name = nameF.input.value.trim();
                if (!name) {
                    throw new Error("Give the flow a name.");
                }
                if (!f.begin.method || !f.finish.method) {
                    throw new Error("Choose the begin and finish methods.");
                }
                f.begin.request = Object.assign({}, f.begin.request, {data: parseArea(beginBody, "Begin request body")});
                f.finish.request = Object.assign({}, f.finish.request, {data: parseArea(finishBody, "Finish request body")});
                if (f.authenticator === "device") {
                    delete f.origin;
                } else if (!originHost(f.origin)) {
                    throw new Error("The origin must look like https://example.com.");
                }
                // drop mappings for fields of the other kind
                const keys = new Set(OPTION_FIELDS[kind].map(d => d.key).concat(["$whole"]));
                Object.keys(f.map).forEach(k => (!keys.has(k) || !f.map[k]) && delete f.map[k]);
                const parts = new Set(CREDENTIAL_PARTS[kind].map(p => p.key));
                Object.keys(f.result).forEach(k => {
                    const s = f.result[k];
                    if (!s || (s.from === "credential" && !parts.has(s.key))) {
                        delete f.result[k];
                    }
                });
                saved = await flowStore.save({id: item.id, name: name, kind: kind, flow: f});
            },
        });
        if (ok && saved) {
            await reloadPasskeys().catch(() => {});
            if (!item.id) {
                runFlow(saved);
            } else {
                toast("Saved “" + saved.name + "”", {variant: "success"});
            }
        }
    }

    // Starts a new flow from a response shown in the response panel.
    function newFlowFromResponse(src) {
        const kind = guessKind(src.method, src.message);
        openFlowEditor({
            name: flowKindLabel(kind) + " · " + src.method.replace(/^(Begin|Start)/, ""),
            kind: kind,
            flow: {
                authenticator: "virtual",
                origin: "https://localhost",
                begin: {service: src.service, method: src.method, request: src.request},
                finish: {service: "", method: "", request: {data: {}}},
                map: {},
                result: {},
            },
        }, src.message);
    }

    // Adds the "make a passkey flow" notice to a response that looks like
    // WebAuthn options.
    function offerPasskeyFlow(service, method, request, resp) {
        if (!passkeysAvailable() || !resp || resp.error) {
            return;
        }
        const msgs = (resp.responses || []).filter(m => !m.isError);
        if (msgs.length !== 1 || !looksLikePasskeyOptions(msgs[0].message)) {
            return;
        }
        const panel = qs('[data-panel="body"]', els.response);
        if (!panel) {
            return;
        }
        const existing = flows.filter(x => x.flow && x.flow.begin && x.flow.begin.service === service && x.flow.begin.method === method);
        const make = h("button", {type: "button", class: "btn btn-outline btn-xs"}, icon("plus", 12), "Make a passkey flow");
        make.addEventListener("click", () => newFlowFromResponse({service: service, method: method, request: request, message: msgs[0].message}));
        const runs = existing.slice(0, 2).map(x => {
            const b = h("button", {type: "button", class: "btn btn-primary btn-xs"}, icon("play", 12), "Run “" + x.name + "”");
            b.addEventListener("click", () => runFlow(x));
            return b;
        });
        panel.prepend(h("div", {class: "resp-section"}, h("div", {class: "notice pk-offer"}, icon("key", 16),
            h("span", {text: "This response has a passkey challenge."}), h("div", {class: "gu-spacer"}), ...runs, make)));
    }

    // ----- the Passkeys sheet -----

    function renderPasskeySheet() {
        const v = passkeyView;
        if (!v) {
            return;
        }
        const fl = flows.map(x => {
            const run = h("button", {type: "button", class: "btn btn-outline btn-xs"}, icon("play", 12), "Run");
            const edit = h("button", {type: "button", class: "btn btn-ghost btn-icon btn-xs", "aria-label": "Edit " + x.name, "data-tooltip": "Edit"}, icon("pencil", 13));
            const del = h("button", {type: "button", class: "btn btn-ghost btn-icon btn-xs", "aria-label": "Delete " + x.name, "data-tooltip": "Delete"}, icon("trash", 14));
            run.addEventListener("click", () => runFlow(x));
            edit.addEventListener("click", () => openFlowEditor(x));
            del.addEventListener("click", async () => {
                const ok = await confirmDialog({
                    title: "Delete “" + x.name + "”?",
                    description: "This removes the flow. Passkeys it made are kept.",
                    confirmLabel: "Delete",
                    destructive: true,
                });
                if (ok) {
                    try {
                        await flowStore.remove(x.id);
                        await reloadPasskeys();
                    } catch (e) {
                        toast("Couldn't delete the flow", {variant: "error", description: e.message});
                    }
                }
            });
            const fb = x.flow || {};
            return h("div", {class: "saved-item pk-item"},
                h("div", {class: "saved-main"},
                    h("div", {class: "saved-name"}, x.name, " ", h("span", {class: "badge badge-secondary", text: flowKindLabel(x.kind)})),
                    h("div", {class: "saved-meta mono", text: (fb.begin ? fb.begin.method : "?") + " → " + (fb.finish ? fb.finish.method : "?") +
                        (fb.authenticator === "device" ? " · device passkey" : " · " + (fb.origin || ""))})),
                h("div", {class: "hist-actions"}, run, edit, del));
        });
        v.flows.replaceChildren(...(fl.length ? fl : [h("p", {class: "muted text-sm",
            text: "No flows yet. Call a method that starts a passkey registration or login, then choose “Make a passkey flow” on its response."})]));

        const groups = new Map();
        passkeys.forEach(p => {
            if (!groups.has(p.rpId)) {
                groups.set(p.rpId, []);
            }
            groups.get(p.rpId).push(p);
        });
        const pk = [];
        for (const [rpId, items] of groups) {
            pk.push(h("div", {class: "pk-site", text: rpId}));
            for (const p of items) {
                const copy = h("button", {type: "button", class: "btn btn-ghost btn-icon btn-xs", "aria-label": "Copy credential ID", "data-tooltip": "Copy credential ID"}, icon("copy", 13));
                const del = h("button", {type: "button", class: "btn btn-ghost btn-icon btn-xs", "aria-label": "Delete passkey", "data-tooltip": "Delete"}, icon("trash", 14));
                copy.addEventListener("click", async () => {
                    const ok = await copyText(p.credentialId);
                    toast(ok ? "Copied the credential ID" : "Couldn't copy the credential ID", {variant: ok ? "success" : "error"});
                });
                del.addEventListener("click", async () => {
                    const ok = await confirmDialog({
                        title: "Delete this passkey?",
                        description: p.kind === "virtual"
                            ? "grpcui forgets " + (p.userName || "this passkey") + "'s key for " + p.rpId + ", so it can't sign in with it again. The server still lists it. You can't undo this."
                            : "grpcui forgets this record. The passkey itself stays on your device.",
                        confirmLabel: "Delete",
                        destructive: true,
                    });
                    if (ok) {
                        try {
                            await storageAPI("/passkeys/" + encodeURIComponent(p.id), {method: "DELETE"});
                            await reloadPasskeys();
                        } catch (e) {
                            toast("Couldn't delete the passkey", {variant: "error", description: e.message});
                        }
                    }
                });
                const meta = ["ID " + shortID(p.credentialId)];
                if (p.kind === "virtual") {
                    meta.push("sign count " + p.signCount);
                }
                meta.push(p.lastUsedAt ? "used " + formatTime(p.lastUsedAt) : "made " + formatTime(p.createdAt));
                pk.push(h("div", {class: "saved-item pk-item"},
                    h("div", {class: "saved-main"},
                        h("div", {class: "saved-name"}, p.userName || "(no name)", " ",
                            h("span", {class: "badge badge-outline", text: p.kind === "virtual" ? "grpcui" : "device"}), " ",
                            p.status === "pending" ? h("span", {class: "badge badge-warning", "data-tooltip": "The server hasn't accepted it", text: "pending"}) : null),
                        h("div", {class: "saved-meta mono", text: meta.join(" · ")})),
                    h("div", {class: "hist-actions"}, copy, del)));
            }
        }
        v.passkeys.replaceChildren(...(pk.length ? pk : [h("p", {class: "muted text-sm", text: "No passkeys yet. A registration flow makes one."})]));
    }

    function openPasskeySheet() {
        if (!passkeysAvailable()) {
            toast("Passkey flows need grpcui's database", {variant: "error", description: "Start grpcui with -db, or on a loopback address."});
            return;
        }
        const flowsEl = h("div", {class: "saved-list"});
        const pkEl = h("div", {class: "saved-list"});
        const newBtn = h("button", {type: "button", class: "btn btn-primary btn-sm"}, icon("plus", 14), "New flow");
        openSheet({
            title: "Passkeys",
            description: "Flows run a server's passkey RPCs. grpcui's passkeys are kept in its database on this computer.",
            body: [h("h3", {class: "pk-heading", text: "Flows"}), flowsEl, h("h3", {class: "pk-heading", text: "Passkeys"}), pkEl],
            footer: [h("div", {class: "gu-spacer"}), newBtn],
            onClose: () => {
                passkeyView = null;
            },
        });
        passkeyView = {flows: flowsEl, passkeys: pkEl};
        newBtn.addEventListener("click", () => {
            const begin = state.service && state.method ? {service: state.service, method: state.method, request: currentRequestSnapshot().request} : null;
            openFlowEditor({
                name: "",
                kind: begin ? guessKind(begin.method) : "login",
                flow: {authenticator: "virtual", origin: "https://localhost", begin: begin, map: {}, result: {}},
            });
        });
        renderPasskeySheet();
        reloadPasskeys().catch(e => toast("Couldn't load passkeys", {variant: "error", description: e.message}));
    }

    if (passkeysBtn) {
        passkeysBtn.hidden = !storageURI;
        passkeysBtn.addEventListener("click", openPasskeySheet);
    }
    if (storageURI) {
        reloadPasskeys().catch(() => {});
    }

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
        } else if (mod && !e.shiftKey && (e.key === "s" || e.key === "S")) {
            if (document.querySelector("dialog[open]")) {
                return;
            }
            e.preventDefault();
            saveCurrentRequest();
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
        updateFormTools();
        els.form.replaceChildren(h("div", {class: "gu-empty"}, icon("server", 28),
            h("p", {class: "gu-empty-title", text: "No methods to show"}),
            h("p", {class: "gu-empty-desc", text: "The server didn't report any services."})));
    }
};

})();
