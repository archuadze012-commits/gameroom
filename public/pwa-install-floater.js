/*!
 * PWA Install Floater — vanilla IIFE widget
 * Pairs with pwa-install-floater.css
 *
 * Usage:
 *   PWAInstallFloater.init({
 *     delay: 5000,
 *     locale: 'ka',        // 'ka' | 'en'
 *     cooldownDays: 7,
 *     forceStage: null,    // 'install' | 'fallback' | 'pin'
 *     onInstall: () => {},
 *     onDismiss: (stage) => {},
 *     onPinAcknowledged: () => {},
 *   });
 *   PWAInstallFloater.show('install' | 'fallback' | 'pin');
 *   PWAInstallFloater.hide();
 *   PWAInstallFloater.reset();
 */
(function (root) {
  "use strict";

  var KEY = function (stage) { return "gameroom-pwa-dismissed-" + stage; };
  var KEY_PIN_SHOWN = "gameroom-pwa-pin-shown";

  var I18N = {
    ka: {
      installTitle: "დააყენე Gameroom დესკტოპზე",
      installBody:  "სწრაფი წვდომა ერთი კლიკით — გაუშვი ცალკე ფანჯარაში, ბრაუზერის გარეშე.",
      installCta:   "დააყენე ახლა",
      later:        "მოგვიანებით",
      fallbackTitle:"დააყენე Gameroom როგორც აპლიკაცია",
      fallbackBody: "გახსენი საიტი Google Chrome-ში და დააჭირე ამ ღილაკს მისამართის ველში:",
      fallbackHint: 'თუ ღილაკი არ ჩანს → მენიუ (⋮) → "Install Gameroom..."',
      fallbackCta:  "გასაგებია",
      pinTitleWin:  "მიამაგრე Taskbar-ზე",
      pinTitleMac:  "შეინახე Dock-ში",
      pinTitleLinux:"მიამაგრე Launcher-ზე",
      pinBodyWin:   'მარჯვენა ღილაკი Taskbar-ში Gameroom-ის იკონაზე → "Pin to taskbar".',
      pinBodyMac:   'მარჯვენა ღილაკი Dock-ში იკონაზე → Options → "Keep in Dock".',
      pinBodyLinux: "მიამაგრე აპის იკონა შენი დესკტოპის გამშვებზე.",
      pinCta:       "გასაგებია 👍",
      close:        "დახურვა",
      address:      "gameroom.com.ge",
    },
    en: {
      installTitle: "Install Gameroom on desktop",
      installBody:  "One-click access — runs in its own window, no browser tab.",
      installCta:   "Install now",
      later:        "Later",
      fallbackTitle:"Install Gameroom as an app",
      fallbackBody: "Open the site in Google Chrome and tap this button in the address bar:",
      fallbackHint: 'If you don\'t see it → menu (⋮) → "Install Gameroom..."',
      fallbackCta:  "Got it",
      pinTitleWin:  "Pin it to your Taskbar",
      pinTitleMac:  "Keep it in your Dock",
      pinTitleLinux:"Pin it to your launcher",
      pinBodyWin:   'Right-click the Gameroom icon in the Taskbar → "Pin to taskbar".',
      pinBodyMac:   'Right-click the icon in the Dock → Options → "Keep in Dock".',
      pinBodyLinux: "Pin the app icon to your desktop launcher.",
      pinCta:       "Got it 👍",
      close:        "Close",
      address:      "gameroom.com.ge",
    },
  };

  // Inline lucide-style SVGs
  var SVG = {
    monitorDown:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 13V7"/><path d="m9 10 3 3 3-3"/><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>',
    monitorDownSm:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 13V7"/><path d="m9 10 3 3 3-3"/><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>',
    pin:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>',
    pinTiny:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>',
    rocket:
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    lock:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    star:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    dots:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
  };

  function detectOS() {
    var ua = (navigator.userAgent || "").toLowerCase();
    if (ua.indexOf("win") !== -1) return "windows";
    if (ua.indexOf("mac") !== -1) return "macos";
    if (ua.indexOf("linux") !== -1 || ua.indexOf("x11") !== -1) return "linux";
    return "other";
  }
  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
           window.navigator.standalone === true;
  }
  function isWebView() {
    return /(; wv\)|Electron|CEF|WebView|FBAN|FBAV|Instagram|Line\/|MicroMessenger)/i.test(navigator.userAgent || "");
  }
  function supportsNativePrompt() {
    return ("BeforeInstallPromptEvent" in window) || /Chrome|Edg/.test(navigator.userAgent || "");
  }
  function withinCooldown(key, days) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return false;
      var t = Number(raw);
      if (!isFinite(t)) return false;
      var ageDays = (Date.now() - t) / (1000 * 60 * 60 * 24);
      return ageDays < days;
    } catch (e) { return false; }
  }

  function PWAInstallFloater() {
    var deferred = null;
    var el = null;
    var stage = null;
    var initialized = false;
    var previouslyFocused = null;
    var opts = {
      delay: 5000, locale: "ka", cooldownDays: 7, forceStage: null,
      onInstall: null, onDismiss: null, onPinAcknowledged: null,
    };

    function tt() { return I18N[opts.locale] || I18N.en; }

    function build(s) {
      var t = tt();
      var os = detectOS();
      var title, body;
      if (s === "install") { title = t.installTitle; body = t.installBody; }
      else if (s === "fallback") { title = t.fallbackTitle; body = t.fallbackBody; }
      else {
        title = os === "macos" ? t.pinTitleMac : os === "linux" ? t.pinTitleLinux : t.pinTitleWin;
        body  = os === "macos" ? t.pinBodyMac  : os === "linux" ? t.pinBodyLinux  : t.pinBodyWin;
      }

      var node = document.createElement("div");
      node.className = "pwaif";
      node.setAttribute("role", "dialog");
      node.setAttribute("aria-modal", "false");
      node.setAttribute("aria-live", "polite");
      node.setAttribute("aria-labelledby", "pwaif-title");
      node.setAttribute("aria-describedby", "pwaif-body");

      var iconHtml = s === "pin"
        ? '<span class="pwaif__wiggle">' + SVG.pin + "</span>"
        : SVG.monitorDown;

      var dotHtml = s === "pin" ? "" : '<span class="pwaif__dot"></span>';

      var midHtml = "";
      if (s === "fallback") {
        midHtml =
          '<div class="pwaif__addrbar" aria-hidden="true">' +
            '<span class="pwaif__addrbar-lock">' + SVG.lock + "</span>" +
            '<span class="pwaif__addrbar-url">' + t.address + "</span>" +
            '<span class="pwaif__addrbar-actions">' +
              '<span class="pwaif__addrbar-pill">' + SVG.monitorDownSm + "Install</span>" +
              '<span class="pwaif__addrbar-icon">' + SVG.star + "</span>" +
              '<span class="pwaif__addrbar-icon">' + SVG.dots + "</span>" +
            "</span>" +
          "</div>" +
          '<p class="pwaif__hint">' + t.fallbackHint + "</p>";
      } else if (s === "pin") {
        midHtml =
          '<div class="pwaif__taskbar-wrap"><div class="pwaif__taskbar" aria-hidden="true">' +
            '<div class="pwaif__tile"></div><div class="pwaif__tile"></div>' +
            '<div class="pwaif__tile pwaif__tile--app"><span class="pwaif__pin">' + SVG.pinTiny + "</span></div>" +
            '<div class="pwaif__tile"></div>' +
          "</div></div>";
      }

      var primaryLabel =
        s === "install" ? t.installCta :
        s === "fallback" ? t.fallbackCta : t.pinCta;

      var primaryIcon = s === "install" ? SVG.rocket : "";

      var actionsHtml =
        '<div class="pwaif__actions">' +
          (s === "install"
            ? '<button class="pwaif__btn" data-act="later" type="button">' + t.later + "</button>"
            : "") +
          '<button class="pwaif__btn pwaif__btn--primary" data-act="primary" type="button">' +
            primaryIcon + "<span>" + primaryLabel + "</span>" +
          "</button>" +
        "</div>";

      node.innerHTML =
        '<button class="pwaif__close" data-act="close" type="button" aria-label="' + t.close + '">' + SVG.close + "</button>" +
        '<div class="pwaif__row">' +
          '<div class="pwaif__icon">' + iconHtml + dotHtml + "</div>" +
          '<div class="pwaif__body">' +
            '<h3 class="pwaif__title" id="pwaif-title">' + title + "</h3>" +
            '<p class="pwaif__text" id="pwaif-body">' + body + "</p>" +
          "</div>" +
        "</div>" +
        midHtml +
        actionsHtml;

      return node;
    }

    function mark(key, value) {
      try { localStorage.setItem(key, value == null ? "1" : value); } catch (e) {}
    }

    function trapTab(e) {
      if (!el) return;
      var fs = el.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
      if (!fs.length) return;
      var first = fs[0], last = fs[fs.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function onKey(e) {
      if (e.key === "Escape") { dismiss(stage); }
      else if (e.key === "Tab") { trapTab(e); }
    }

    function mount(s) {
      if (el) return;
      stage = s;
      previouslyFocused = document.activeElement;
      el = build(s);
      document.body.appendChild(el);
      requestAnimationFrame(function () { el.setAttribute("data-open", "true"); });

      el.addEventListener("click", function (e) {
        var btn = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
        if (!btn) return;
        var act = btn.getAttribute("data-act");
        if (act === "primary") {
          if (stage === "install") return installNow();
          dismiss(stage);
        } else {
          dismiss(stage);
        }
      });

      document.addEventListener("keydown", onKey);

      setTimeout(function () {
        var c = el && el.querySelector("[data-act='close']");
        if (c) c.focus();
      }, 60);
    }

    function unmount() {
      if (!el) return;
      el.setAttribute("data-open", "false");
      document.removeEventListener("keydown", onKey);
      var node = el; el = null;
      var leftStage = stage; stage = null;
      setTimeout(function () {
        if (node && node.parentNode) node.parentNode.removeChild(node);
        if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      }, 300);
      return leftStage;
    }

    function dismiss(s) {
      if (!s) { unmount(); return; }
      mark(KEY(s), String(Date.now()));
      if (s === "pin") {
        mark(KEY_PIN_SHOWN, "1");
        if (typeof opts.onPinAcknowledged === "function") opts.onPinAcknowledged();
      }
      if (typeof opts.onDismiss === "function") opts.onDismiss(s);
      unmount();
    }

    function installNow() {
      if (!deferred) return;
      try {
        deferred.prompt();
        deferred.userChoice.then(function (c) {
          deferred = null;
          if (c && c.outcome === "accepted") {
            if (typeof opts.onInstall === "function") opts.onInstall();
            unmount();
          } else {
            dismiss("install");
          }
        });
      } catch (e) { dismiss("install"); }
    }

    function decideAndShow() {
      if (opts.forceStage) { mount(opts.forceStage); return; }

      if (isStandalone()) {
        try {
          if (!localStorage.getItem(KEY_PIN_SHOWN) &&
              !withinCooldown(KEY("pin"), opts.cooldownDays)) {
            setTimeout(function () { mount("pin"); }, Math.min(opts.delay, 1500));
          }
        } catch (e) {}
        return;
      }

      if (isWebView() || !supportsNativePrompt()) {
        if (!withinCooldown(KEY("fallback"), opts.cooldownDays)) {
          setTimeout(function () { mount("fallback"); }, opts.delay);
        }
        return;
      }

      if (withinCooldown(KEY("install"), opts.cooldownDays)) return;

      window.addEventListener("beforeinstallprompt", function (e) {
        e.preventDefault();
        deferred = e;
        setTimeout(function () { if (!el) mount("install"); }, opts.delay);
      });
      window.addEventListener("appinstalled", function () {
        deferred = null;
        if (typeof opts.onInstall === "function") opts.onInstall();
        if (el) { /* swap to pin */ unmount(); setTimeout(function () { mount("pin"); }, 350); }
        else mount("pin");
      });
    }

    this.init = function (options) {
      if (initialized) return; initialized = true;
      if (options) for (var k in options) if (Object.prototype.hasOwnProperty.call(options, k)) opts[k] = options[k];
      decideAndShow();
    };
    this.show = function (s) { if (!el) mount(s || "install"); };
    this.hide = function () { unmount(); };
    this.reset = function () {
      try {
        ["install", "fallback", "pin"].forEach(function (s) { localStorage.removeItem(KEY(s)); });
        localStorage.removeItem(KEY_PIN_SHOWN);
      } catch (e) {}
    };
  }

  root.PWAInstallFloater = new PWAInstallFloater();
})(window);
