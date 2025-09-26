import { OverlayService } from '@/services/OverlayService';

type VersionInfo = {
  checkedAt: string;
  localVersion: {
    version: string;
    builtAt?: string;
  };
  latestVersion?: string;
  publishedAt?: string;
  releaseUrl?: string;
  hasUpdate: boolean;
  raw?: {
    tag?: string;
    name?: string;
    notes?: string;
    prerelease?: boolean;
  };
};

type CheckOptions = {
  force?: boolean;
  silent?: boolean;
};

export class UpdateService {
  private static instance: UpdateService;

  private status: VersionInfo | null = null;
  private checkingPromise: Promise<VersionInfo> | null = null;
  private lastNotifiedVersion: string | null = null;

  static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  getStatus(): VersionInfo | null {
    return this.status;
  }

  async initialize(): Promise<void> {
    try {
      const status = await this.checkForUpdates({ silent: true });
      this.maybeNotify(status);
    } catch (error) {
      console.warn('ND Super Nodes: update check failed to initialize', error);
    }
  }

  async checkForUpdates(options: CheckOptions = {}): Promise<VersionInfo> {
    const { force = false, silent = false } = options;

    if (this.checkingPromise) {
      return this.checkingPromise;
    }

    if (!force && this.status) {
      if (!silent) {
        this.maybeNotify(this.status, { showUpToDate: true });
      }
      return this.status;
    }

    this.checkingPromise = this.fetchStatus(force)
      .then((status) => {
        this.status = status;
        if (!silent) {
          this.maybeNotify(status, { showUpToDate: true });
        } else {
          this.maybeNotify(status);
        }
        return status;
      })
      .catch((error) => {
        console.warn('ND Super Nodes: update check failed', error);
        if (!silent) {
          OverlayService.getInstance().showToast('ND Super Nodes update check failed. See console for details.', 'warning');
        }
        throw error;
      })
      .finally(() => {
        this.checkingPromise = null;
      });

    return this.checkingPromise;
  }

  openReleasePage(): void {
    const url = this.status?.releaseUrl || 'https://github.com/HenkDz/nd-super-nodes/releases/latest';
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      OverlayService.getInstance().showToast('Unable to open release page. Copy URL from console.', 'warning');
      console.warn('ND Super Nodes release URL:', url, error);
    }
  }

  private async fetchStatus(force: boolean): Promise<VersionInfo> {
    const url = force ? '/super_lora/version?force=1' : '/super_lora/version';
    const response = await fetch(url, { cache: force ? 'reload' : 'no-store' });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const payload = (await response.json()) as VersionInfo;
    return payload;
  }

  private maybeNotify(status: VersionInfo, options: { showUpToDate?: boolean } = {}): void {
    if (!status) {
      return;
    }
    const latestVersion = status.latestVersion || status.localVersion?.version;
    const alreadyNotified = latestVersion && latestVersion === this.lastNotifiedVersion;

    if (status.hasUpdate) {
      if (alreadyNotified) {
        return;
      }
      this.lastNotifiedVersion = latestVersion || null;
      const messageParts = [
        `🚀 ND Super Nodes v${latestVersion} available`,
        'Run update.ps1 / update.sh in your node folder to upgrade.',
      ];
      OverlayService.getInstance().showToast(messageParts.join('\n'), 'info');
      console.info('ND Super Nodes: Update available', status);
      return;
    }

    if (options.showUpToDate && !alreadyNotified) {
      this.lastNotifiedVersion = latestVersion || null;
      OverlayService.getInstance().showToast('ND Super Nodes is up to date.', 'success');
    }
  }
}
