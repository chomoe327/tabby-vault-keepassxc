import { PlatformService } from 'terminus-core'
import { ToastrService } from 'ngx-toastr'
import Lang from '../data/lang'
import { KeePassXCPluginSettings } from '../data/defaults'
import Logger from '../utils/logger'
import { loadSettings } from '../utils/settings-store'
import {
    KeePassXCClient,
    KeePassXCConnectionResult,
    KeePassXCOptions,
} from './keepassxc-client.interface'
import { KeePassXCNativeClient } from './keepassxc-native.client'
import { hasAssociation } from '../utils/association-store'

interface TabbyVaultLike {
    getPassphrase (): Promise<string>
    forgetPassphrase? (): void
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
    private client: KeePassXCNativeClient | null = null
    private originalGetPassphrase: (() => Promise<string>) | null = null
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
        this.client = client as KeePassXCNativeClient
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

    async performAssociate (settings: KeePassXCPluginSettings): Promise<KeePassXCConnectionResult> {
        if (!this.client) {
            return { ok: false, message: 'KeePassXC client unavailable' }
        }
        return this.client.associate(this.toClientOptions(settings))
    }

    async testFetch (settings: KeePassXCPluginSettings): Promise<boolean> {
        if (!this.client) {
            return false
        }
        const password = await this.client.getPassword(settings.entryUrl, this.toClientOptions(settings))
        return !!password
    }

    async getAssociationStatus (settings: KeePassXCPluginSettings): Promise<'ok' | 'fail' | 'unknown'> {
        if (!hasAssociation(this.platform)) {
            return 'unknown'
        }
        if (!this.client) {
            return 'unknown'
        }
        const result = await this.client.testConnection(this.toClientOptions(settings))
        return result.ok ? 'ok' : 'fail'
    }

    private async resolvePassphrase (): Promise<string> {
        const settings = loadSettings(this.platform)

        if (!settings.enabled) {
            return this.callOriginal()
        }

        const password = await this.fetchFromKeePassXC(settings)
        if (password) {
            return password
        }

        return this.handleFallback()
    }

    private async fetchFromKeePassXC (settings: KeePassXCPluginSettings): Promise<string | null> {
        if (!this.client) {
            return null
        }

        const available = await this.client.isAvailable()
        if (!available) {
            this.logger.log('KeePassXC is not running or browser integration unavailable', 'warn')
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

    private async handleFallback (): Promise<string> {
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

    private toClientOptions (settings: KeePassXCPluginSettings): KeePassXCOptions {
        return {
            waitForUnlock: settings.waitForUnlock,
        }
    }
}
