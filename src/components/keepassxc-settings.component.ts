import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core'
import { ConfigService, PlatformService, BaseComponent } from 'terminus-core'
import { ToastrService } from 'ngx-toastr'
import { Subscription } from 'rxjs'
import Lang from '../data/lang'
import { DEFAULT_SETTINGS, FALLBACK_OPTIONS, KeePassXCPluginSettings, REMEMBER_MINUTE_OPTIONS } from '../data/defaults'
import { loadSettings, saveSettings } from '../utils/settings-store'
import { VaultPassphraseBridge } from '../services/vault-passphrase-bridge.service'
import { DEFAULT_ASSOCIATION_FILE, resolveCliPath } from '../services/keepassxc-cli.client'

/** @hidden */
@Component({
    template: require('./keepassxc-settings.component.pug'),
    styles: [require('./keepassxc-settings.component.scss')],
})
export class KeePassXCSettingsComponent extends BaseComponent implements OnInit, OnDestroy {
    translate = Lang
    rememberOptions = REMEMBER_MINUTE_OPTIONS
    fallbackOptions = FALLBACK_OPTIONS

    settings: KeePassXCPluginSettings = { ...DEFAULT_SETTINGS }
    detectedCliPath = ''
    associationStatus: 'ok' | 'fail' | 'unknown' = 'unknown'
    testing = false
    saving = false

    private configSubscription: Subscription

    @HostBinding('class.content-box') true

    constructor (
        public config: ConfigService,
        private toast: ToastrService,
        private platform: PlatformService,
    ) {
        super()
    }

    ngOnInit (): void {
        this.refreshLocale()
        this.configSubscription = this.config.changed$.subscribe(() => this.refreshLocale())
        this.settings = loadSettings(this.platform)
        this.detectedCliPath = resolveCliPath(this.settings.cliPath) || 'keepassxc-proxy-getpw'
        void this.refreshAssociationStatus()
    }

    ngOnDestroy (): void {
        this.configSubscription?.unsubscribe()
    }

    refreshLocale (): void {
        Lang.refreshLocale(this.platform, this.config)
    }

    transOption (option: { label: { en: string, zh: string } }): string {
        return Lang.transOption(option)
    }

    async refreshAssociationStatus (): Promise<void> {
        const bridge = VaultPassphraseBridge.getInstance()
        if (!bridge) {
            this.associationStatus = 'unknown'
            return
        }
        this.associationStatus = await bridge.getAssociationStatus(this.settings)
    }

    associationStatusLabel (): string {
        switch (this.associationStatus) {
        case 'ok':
            return Lang.trans('settings.association_ok')
        case 'fail':
            return Lang.trans('settings.association_fail')
        default:
            return Lang.trans('settings.association_unknown')
        }
    }

    saveSettings (): void {
        this.saving = true
        try {
            saveSettings(this.platform, this.settings)
            this.toast.success(Lang.trans('settings.saved'))
        } finally {
            this.saving = false
        }
    }

    async testFetch (): Promise<void> {
        this.testing = true
        try {
            saveSettings(this.platform, this.settings)
            const bridge = VaultPassphraseBridge.getInstance()
            if (!bridge) {
                this.toast.error(Lang.trans('settings.test_fetch_fail'))
                return
            }
            const ok = await bridge.testFetch(this.settings)
            if (ok) {
                this.toast.success(Lang.trans('settings.test_fetch_ok'))
                this.associationStatus = 'ok'
            } else {
                this.toast.error(Lang.trans('settings.test_fetch_fail'))
                this.associationStatus = 'fail'
            }
        } finally {
            this.testing = false
        }
    }

    clearCachedPassphrase (): void {
        const bridge = VaultPassphraseBridge.getInstance()
        bridge?.clearCache()
        this.toast.success(Lang.trans('settings.clear_cache_ok'))
    }

    defaultAssociationHint (): string {
        return DEFAULT_ASSOCIATION_FILE
    }
}
