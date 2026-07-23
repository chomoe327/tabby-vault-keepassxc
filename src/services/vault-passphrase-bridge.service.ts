import { PlatformService } from 'terminus-core'
import { ToastrService } from 'ngx-toastr'
import Lang from '../data/lang'
import { KeePassXCPluginSettings } from '../data/defaults'
import Logger from '../utils/logger'
import { loadSettings } from '../utils/settings-store'
import { KeePassXCClient } from './keepassxc-client.interface'

interface TabbyVaultLike {
    getPassphrase (): Promise<string>
    forgetPassphrase? (): void
    isOpen? (): boolean
}

interface CachedPassphrase {
    value: string
    expiresAt: number
}

function serializeAsync<T> (fn: () => Promise<T>): () => Promise<T> {
    let chain: Promise<T> = Promise.resolve(null as unknown as T)
    return () => {
        const run = chain.then(() => fn())
        chain = run.catch(() => null as unknown as T)
        return run
    }
}

export class VaultPassphraseBridge {
    private static instance: VaultPassphraseBridge | null = null

    private vault: TabbyVaultLike | null = null
    private client: KeePassXCClient | null = null
    private originalGetPassphrase: (() => Promise<string>) | null = null
    private cache: CachedPassphrase | null = null
    private rememberTimer: ReturnType<typeof setTimeout> | null = null
    private lastServedAt = 0
    private retryWindowMs = 5000
    private serializedFetch: (() => Promise<string>) | null = null
    private logger: Logger

    constructor (
        private platform: PlatformService,
        private toast: ToastrService,
    ) {
        this.logger = new Logger(platform)
        VaultPassphraseBridge.instance = this
    }

    static getInstance (): VaultPassphraseBridge | null {
        return VaultPassphraseBridge.instance
    }

    install (vault: TabbyVaultLike, client: KeePassXCClient, _settings: KeePassXCPluginSettings): void {
        this.vault = vault
        this.client = client
        this.originalGetPassphrase = vault.getPassphrase.bind(vault)

        const fetchPassphrase = async (): Promise<string> => {
            return this.resolvePassphrase()
        }
        this.serializedFetch = serializeAsync(fetchPassphrase)
        vault.getPassphrase = () => this.serializedFetch!()
    }

    async preflightCheck (client: KeePassXCClient, settings: KeePassXCPluginSettings): Promise<void> {
        if (!settings.enabled) {
            return
        }

        const result = await client.testConnection(this.toClientOptions(settings))
        if (!result.ok) {
            this.logger.log('Preflight check failed: ' + result.message, 'warn')
            this.toast.warning(Lang.trans('settings.preflight_warn', { message: result.message }), undefined, {
                timeOut: 8000,
            })
        }
    }

    clearCache (): void {
        this.clearRememberTimer()
        this.cache = null
        this.lastServedAt = 0
        if (this.vault?.forgetPassphrase) {
            this.vault.forgetPassphrase()
        }
    }

    async testFetch (settings: KeePassXCPluginSettings): Promise<boolean> {
        if (!this.client) {
            return false
        }
        const password = await this.client.getPassword(settings.entryUrl, this.toClientOptions(settings))
        return !!password
    }

    async getAssociationStatus (settings: KeePassXCPluginSettings): Promise<'ok' | 'fail' | 'unknown'> {
        if (!this.client) {
            return 'unknown'
        }
        const result = await this.client.testConnection(this.toClientOptions(settings))
        return result.ok ? 'ok' : 'fail'
    }

    reloadSettings (): KeePassXCPluginSettings {
        return loadSettings(this.platform)
    }

    private async resolvePassphrase (): Promise<string> {
        const settings = loadSettings(this.platform)

        if (!settings.enabled) {
            return this.callOriginal()
        }

        if (this.isRetryAfterFailure()) {
            this.logger.log('Passphrase requested again shortly after previous attempt; clearing cache and falling back', 'warn')
            this.clearCache()
            return this.handleFallback(settings)
        }

        const cached = this.getCachedPassphrase(settings)
        if (cached) {
            this.lastServedAt = Date.now()
            return cached
        }

        const password = await this.fetchFromKeePassXC(settings)
        if (password) {
            this.setCachedPassphrase(password, settings)
            this.lastServedAt = Date.now()
            return password
        }

        return this.handleFallback(settings)
    }

    private isRetryAfterFailure (): boolean {
        if (!this.cache || !this.lastServedAt) {
            return false
        }
        return Date.now() - this.lastServedAt < this.retryWindowMs
    }

    private getCachedPassphrase (settings: KeePassXCPluginSettings): string | null {
        if (!this.cache) {
            return null
        }
        if (settings.rememberMinutes <= 0) {
            return null
        }
        if (Date.now() >= this.cache.expiresAt) {
            this.clearCache()
            return null
        }
        return this.cache.value
    }

    private setCachedPassphrase (password: string, settings: KeePassXCPluginSettings): void {
        this.clearRememberTimer()
        if (settings.rememberMinutes <= 0) {
            this.cache = null
            return
        }
        const expiresAt = Date.now() + settings.rememberMinutes * 60 * 1000
        this.cache = { value: password, expiresAt }
        this.rememberTimer = setTimeout(() => {
            this.logger.log('Remember timeout reached; clearing cached passphrase')
            this.clearCache()
        }, settings.rememberMinutes * 60 * 1000)
    }

    private clearRememberTimer (): void {
        if (this.rememberTimer) {
            clearTimeout(this.rememberTimer)
            this.rememberTimer = null
        }
    }

    private async fetchFromKeePassXC (settings: KeePassXCPluginSettings): Promise<string | null> {
        if (!this.client) {
            return null
        }

        const available = await this.client.isAvailable()
        if (!available) {
            this.logger.log('KeePassXC is not running', 'warn')
            this.toast.warning(Lang.trans('settings.keepassxc_not_running'), undefined, { timeOut: 6000 })
            return null
        }

        const password = await this.client.getPassword(settings.entryUrl, this.toClientOptions(settings))
        if (!password) {
            this.logger.log('KeePassXC returned no password for URL: ' + settings.entryUrl, 'warn')
            this.toast.warning(Lang.trans('settings.no_matching_entry'), undefined, { timeOut: 6000 })
        }
        return password
    }

    private async handleFallback (settings: KeePassXCPluginSettings): Promise<string> {
        if (settings.fallback === 'error') {
            throw new Error(Lang.trans('settings.fetch_failed'))
        }

        this.logger.log('Falling back to Tabby unlock modal', 'info')
        this.toast.info(Lang.trans('settings.fetch_failed'), undefined, { timeOut: 5000 })
        return this.callOriginal()
    }

    private async callOriginal (): Promise<string> {
        if (!this.originalGetPassphrase) {
            throw new Error('Vault passphrase provider unavailable')
        }
        return this.originalGetPassphrase()
    }

    private toClientOptions (settings: KeePassXCPluginSettings) {
        return {
            cliPath: settings.cliPath,
            waitForUnlock: settings.waitForUnlock,
            associationFile: settings.associationFile,
        }
    }
}
