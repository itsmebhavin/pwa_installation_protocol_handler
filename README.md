# PWA Desktop App — Implementation Guide

Angular 21 · Standalone Components · Signals · Service Worker

---

## 1. Setup

```bash
ng new pwa-desktop-app --routing --style css
cd pwa-desktop-app
ng add @angular/pwa
npm install
```

---

## 2. Project Structure

```
src/
  app/
    components/
      dashboard/
        dashboard.ts
        dashboard.html
        dashboard.css
    services/
      install-pwa.ts
    app.ts
    app.html
    app.routes.ts
    app.config.ts
  index.html
public/
  manifest.webmanifest
  icons/           ← icon-72x72.png … icon-512x512.png
ngsw-config.json
```

---

## 3. Icons

Generate all sizes from a single 512×512 source PNG:

```bash
npx pwa-asset-generator icon-source.png public/icons \
  --manifest public/manifest.webmanifest \
  --index src/index.html
```

Or generate manually at sizes: 72, 96, 128, 144, 152, 192, 384, 512.

---

## 4. Web App Manifest

**`public/manifest.webmanifest`**

```json
{
  "name": "PWA Desktop App",
  "short_name": "PWA App",
  "description": "A Progressive Web App built with Angular",
  "theme_color": "#1976d2",
  "background_color": "#fafafa",
  "display": "standalone",
  "scope": "./",
  "start_url": "./",
  "protocol_handlers": [
    {
      "protocol": "web+pwaapp",
      "url": "/dashboard?from=%s"
    }
  ],
  "icons": [
    { "src": "icons/icon-72x72.png",   "sizes": "72x72",   "type": "image/png", "purpose": "maskable any" },
    { "src": "icons/icon-96x96.png",   "sizes": "96x96",   "type": "image/png", "purpose": "maskable any" },
    { "src": "icons/icon-128x128.png", "sizes": "128x128", "type": "image/png", "purpose": "maskable any" },
    { "src": "icons/icon-144x144.png", "sizes": "144x144", "type": "image/png", "purpose": "maskable any" },
    { "src": "icons/icon-152x152.png", "sizes": "152x152", "type": "image/png", "purpose": "maskable any" },
    { "src": "icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable any" },
    { "src": "icons/icon-384x384.png", "sizes": "384x384", "type": "image/png", "purpose": "maskable any" },
    { "src": "icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable any" }
  ]
}
```

---

## 5. index.html

**`src/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>PWA Desktop App</title>
    <base href="/" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#1976d2" />
    <link rel="icon" type="image/x-icon" href="favicon.ico" />
    <link rel="manifest" href="manifest.webmanifest" />
    <link rel="apple-touch-icon" href="icons/icon-192x192.png" />
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>
```

---

## 6. Service Worker Config

**`ngsw-config.json`**

```json
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/manifest.webmanifest", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": ["/assets/**", "/icons/**"]
      }
    }
  ]
}
```

---

## 7. App Config

**`src/app/app.config.ts`**

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
```

---

## 8. Routing

**`src/app/app.routes.ts`**

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard').then((m) => m.DashboardComponent),
  },
];
```

**`src/app/app.html`**

```html
<router-outlet />
```

---

## 9. Install PWA Service

**`src/app/services/install-pwa.ts`**

```typescript
import { Injectable, signal } from '@angular/core';

const INSTALLED_KEY = 'pwa_installed';

@Injectable({ providedIn: 'root' })
export class InstallPwaService {
  private deferredPrompt = signal<any>(null);
  public canInstall  = signal<boolean>(false);
  public isInstalled = signal<boolean>(localStorage.getItem(INSTALLED_KEY) === 'true');
  public isStandalone = signal<boolean>(globalThis.matchMedia('(display-mode: standalone)').matches);

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt.set(e);
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.canInstall.set(false);
      this.deferredPrompt.set(null);
      this.isInstalled.set(true);
      localStorage.setItem(INSTALLED_KEY, 'true');

      // Register protocol handler at runtime (belt-and-suspenders with manifest)
      try {
        navigator.registerProtocolHandler('web+pwaapp', '/dashboard?from=%s');
      } catch (_) {}
    });
  }

  async install() {
    const prompt = this.deferredPrompt();
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') this.canInstall.set(false);
  }
}
```

**Key signals:**

| Signal | Meaning |
|---|---|
| `canInstall()` | `beforeinstallprompt` fired — show install button |
| `isInstalled()` | User accepted install (persisted in localStorage) |
| `isStandalone()` | App is running as installed PWA (not in browser tab) |

---

## 10. Dashboard Component

**`src/app/components/dashboard/dashboard.ts`**

```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstallPwaService } from '../../services/install-pwa';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardComponent {
  protected installService = inject(InstallPwaService);
}
```

**`src/app/components/dashboard/dashboard.html`** (key parts)

```html
<div class="page">
  <header class="topbar">
    <div class="topbar-brand">
      <img src="icons/icon-96x96.png" alt="App icon" class="brand-icon" />
      <span class="brand-name">PWA Desktop App</span>
    </div>

    <!-- Show install button if installable -->
    @if (installService.canInstall()) {
      <button class="install-btn" (click)="installService.install()">
        Install as App
      </button>
    }

    <!-- Show "App Installed" chip if installed but opened in browser -->
    @if (installService.isInstalled() && !installService.isStandalone()) {
      <div class="installed-chip" title="Open it from your taskbar, dock, or Start Menu">
        ✓ App Installed
      </div>
    }
  </header>

  <main class="content">
    <!-- Install prompt banner -->
    @if (installService.canInstall()) {
      <div class="install-banner">
        <div class="install-banner-text">
          <strong>Install for a better experience</strong>
          <span>Run as a standalone desktop app — no browser UI, faster launch, works offline.</span>
        </div>
        <button class="install-banner-btn" (click)="installService.install()">
          Install Now
        </button>
      </div>
    }

    <!-- App content -->
    <section class="welcome">
      <h1>Your Dashboard</h1>
      <p>Welcome! Your app content goes here.</p>
    </section>
  </main>
</div>
```

---

## 11. angular.json — Assets

Ensure only `public/` is in the assets array (not `src/manifest.webmanifest`):

```json
"assets": [
  { "glob": "**/*", "input": "public" }
],
```

---

## 12. Build & Serve

```bash
# Production build (service worker is only active in prod)
ng build

# Serve with no caching (important for manifest updates)
npx http-server dist/pwa-desktop-app/browser -p 8080 --cors -c-1
```

Open `http://localhost:8080` in Chrome.

---

## 13. Install the PWA

1. Open `http://localhost:8080`
2. Chrome shows install prompt in address bar **or** click the "Install as App" button
3. Confirm install → app opens as a standalone window
4. Chrome registers the `web+pwaapp://` protocol with the OS at install time

---

## 14. Custom Protocol Handler (`web+pwaapp://`)

Allows any other app (Electron, another PWA, browser) to launch this PWA.

### How it works

1. Manifest declares `protocol_handlers` (Step 4 above)
2. Chrome registers `web+pwaapp://` with the OS when the PWA is installed
3. Any app that opens a `web+pwaapp://` URI causes Chrome to launch the PWA

### Test in Chrome address bar

```
web+pwaapp://hello
```

Chrome prompts: "Open PWA Desktop App?" → opens the PWA at `/dashboard?from=web%2Bpwaapp%3A%2F%2Fhello`

### Test from browser console

```javascript
window.location.href = 'web+pwaapp://test-payload';
```

### Verify registration

Go to `chrome://settings/content/handlers` — `web+pwaapp` should appear under "Allowed."

### Launch from Electron

```javascript
const { shell } = require('electron');
shell.openExternal('web+pwaapp://launched-from-electron');
```

### Launch from another PWA

```javascript
window.location.href = 'web+pwaapp://launched-from-other-pwa';
// or
window.open('web+pwaapp://launched-from-other-pwa');
```

### Read the incoming payload in Angular

In `dashboard.ts`, inject `ActivatedRoute` and read the `from` query param:

```typescript
import { ActivatedRoute } from '@angular/router';

export class DashboardComponent {
  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['from']) {
        console.log('Launched via protocol handler from:', params['from']);
      }
    });
  }
}
```

---

## 15. Protocol Handler — Troubleshooting

| Symptom | Fix |
|---|---|
| `web+pwaapp://` not opening anything | PWA was installed before `protocol_handlers` was added — uninstall + reinstall |
| Not in `chrome://settings/content/handlers` | Same as above — reinstall |
| Prompt appears but PWA doesn't open | Check if a different app has claimed the protocol |
| Works in address bar, not console | `window.location.href` in console may be blocked by CSP |

**Reinstall steps:**
1. `chrome://apps` → right-click → Remove from Chrome
2. `ng build`
3. `npx http-server dist/pwa-desktop-app/browser -p 8080 --cors -c-1`
4. Open `http://localhost:8080` → reinstall
5. Verify at `chrome://settings/content/handlers`

---

## 16. UX State Summary

| User state | What they see |
|---|---|
| First visit, installable | Install button in topbar + install banner in content |
| Already installed, opened in browser | "App Installed" green chip with tooltip |
| Running as standalone PWA | Neither — no install UI shown |
| Launched via `web+pwaapp://` | Dashboard loads with `?from=<payload>` in URL |
