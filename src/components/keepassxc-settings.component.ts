import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core'
import { ConfigService, PlatformService, BaseComponent } from 'terminus-core'
import { ToastrService } from 'ngx-toastr'
import { Subscription } from 'rxjs'
import Lang from '../data/lang'
import { DEFAULT_SETTINGS, KeePassXCPluginSettings } from '../data/defaults'
import { loadSettings, saveSettings } from '../utils/settings-store'
import { VaultPassphraseBridge } from '../services/vault-passphrase-bridge.service'
import { hasAssociation } from '../utils/association-store'

/** @hidden */
@Component({
    template: require('./keepassxc-settings.component.pug'),
    styles: [require('./keepassxc-settings.component.scss')],
})
export class KeePassXCSettingsComponent extends BaseComponent implements OnInit, OnDestroy {
    translate = Lang

    settings: KeePassXCPluginSettings = { ...DEFAULT_SETTINGS }
    associationStatus: 'ok' | 'fail' | 'unknown' = 'unknown'
    testing = false
    associating = false
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
        void this.refreshAssociationStatus()
    }

    ngOnDestroy (): void {
        this.configSubscription?.unsubscribe()
    }

    refreshLocale (): void {
        Lang.refreshLocale(this.platform, this.config)
    }

    async refreshAssociationStatus (): Promise<void> {
        if (!hasAssociation(this.platform)) {
            this.associationStatus = 'unknown'
            return
        }

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

    async associateWithKeePassXC (): Promise<void> {
        this.associating = true
        try {
            saveSettings(this.platform, this.settings)
            const bridge = VaultPassphraseBridge.getInstance()
            if (!bridge) {
                this.toast.error(Lang.trans('settings.associate_fail'))
                return
            }

            const result = await bridge.performAssociate(this.settings)
            if (result.ok) {
                this.toast.success(Lang.trans('settings.associate_ok'))
                this.associationStatus = 'ok'
            } else {
                this.toast.error(result.message || Lang.trans('settings.associate_fail'))
                this.associationStatus = 'fail'
            }
        } finally {
            this.associating = false
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
}
