# PWA Install Floater

Floating glassmorphism widget that:
1. Invites Chrome/Edge users to install the site as a desktop PWA (native prompt).
2. Falls back to a faux Chrome address-bar mock-up on Safari/Firefox/WebView so users still know what to click.
3. After install, instructs users to pin the app to Taskbar (Windows) / Dock (macOS) / Launcher (Linux).

## Files

| File | Purpose |
|---|---|
| `pwa-install-floater.js` | Vanilla IIFE widget, exposes `window.PWAInstallFloater` |
| `pwa-install-floater.css` | All styles, theme via CSS variables |
| `pwa-install-floater.html` | Demo page with stage-forcing buttons |
| `../src/components/pwa-install-floater.tsx` | React 18 + TS + Tailwind version |
| `manifest.json` | PWA manifest (already present) |
| `sw.js` | Service worker with minimal fetch handler (required for Chrome install) |

## Next.js (App Router) integration

Already wired in `src/app/layout.tsx`:

```tsx
import { PWAInstallFloater } from "@/components/pwa-install-floater";

// inside <body>
<PWAInstallFloater delay={5000} locale="ka" />
```

## Vanilla integration (any site)

```html
<link rel="manifest" href="/manifest.json" />
<link rel="stylesheet" href="/pwa-install-floater.css" />
<script src="/pwa-install-floater.js"></script>
<script>
  PWAInstallFloater.init({ delay: 5000, locale: "ka" });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
</script>
```

## Public API

```ts
PWAInstallFloater.init({
  delay: 5000,            // ms before first show
  locale: "ka",           // "ka" | "en"
  cooldownDays: 7,
  forceStage: null,       // "install" | "fallback" | "pin" (testing)
  onInstall:         () => {},
  onDismiss:         (stage) => {},
  onPinAcknowledged: () => {},
});

PWAInstallFloater.show("install" | "fallback" | "pin");
PWAInstallFloater.hide();
PWAInstallFloater.reset();   // clears all cooldown keys
```

## Theming

Override on `:root` (or `.dark`):

```css
:root {
  --gr-accent-from: #4F8CFF;
  --gr-accent-to:   #6E5BFF;
  --gr-bg:          rgba(15, 18, 28, 0.85);
  --gr-text:        #E6E8EE;
  --gr-text-muted:  #9099AD;
}
```

## How stage selection works

On mount the widget checks:

1. `display-mode: standalone` → user already installed → maybe show **pin** stage once (`gameroom-pwa-pin-shown` flag prevents re-show).
2. `forceStage` option → bypass detection, show that stage immediately.
3. WebView / Safari / Firefox / no `BeforeInstallPromptEvent` → show **fallback** stage with faux Chrome address-bar pill.
4. Chromium → listen for `beforeinstallprompt`, capture it, show **install** stage after `delay` ms.
5. `appinstalled` event → swap to **pin** stage.

Dismissal writes `gameroom-pwa-dismissed-<stage>` = timestamp; re-show is suppressed for `cooldownDays`.

## Testing locally

```bash
# 1. Open the demo page directly:
http://localhost:3000/pwa-install-floater.html

# 2. To unblock beforeinstallprompt for testing, open chrome://flags
#    and enable "Bypass user engagement checks".

# 3. Reset cooldown in DevTools:
PWAInstallFloater.reset()
```

## PWA installability checklist (Chrome/Edge)

- [x] `manifest.json` linked from HTML.
- [x] Manifest has `name`, `short_name`, `start_url`, `display: standalone`, icon ≥ 192px.
- [x] Service worker registered with a `fetch` event listener.
- [x] Served over HTTPS (or `localhost`).
