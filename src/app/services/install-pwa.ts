import { Injectable, signal } from '@angular/core';

const INSTALLED_KEY = 'pwa_installed';

@Injectable({ providedIn: 'root' })
export class InstallPwaService {
  private deferredPrompt = signal<any>(null);
  public canInstall = signal<boolean>(false);
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
    });
  }

  async install() {
    const prompt = this.deferredPrompt();
    if (!prompt) return;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === 'accepted') {
      this.canInstall.set(false);
    }
  }
}
