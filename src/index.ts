import { Injector, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { SettingsTabProvider } from 'terminus-settings'
import { PlatformService } from 'terminus-core'
import { ToastrService } from 'ngx-toastr'
import { KeePassXCSettingsTabProvider } from './settings'
import { KeePassXCSettingsComponent } from './components/keepassxc-settings.component'
import { ToggleComponent } from './components/toggle.component'
import { CheckboxComponent } from './components/checkbox.component'
import { KeePassXCCliClient } from './services/keepassxc-cli.client'
import { VaultPassphraseBridge } from './services/vault-passphrase-bridge.service'
import { loadSettings } from './utils/settings-store'
import Logger from './utils/logger'

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        NgbModule,
    ],
    providers: [
        { provide: SettingsTabProvider, useClass: KeePassXCSettingsTabProvider, multi: true },
    ],
    entryComponents: [
        KeePassXCSettingsComponent,
    ],
    declarations: [
        KeePassXCSettingsComponent,
        ToggleComponent,
        CheckboxComponent,
    ],
})
export default class TabbyVaultKeePassXCModule {
    private bridge: VaultPassphraseBridge | null = null

    constructor (
        private injector: Injector,
        private platform: PlatformService,
        private toast: ToastrService,
    ) {
        this.bootstrapSync()
    }

    private bootstrapSync (): void {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const core = require('terminus-core')
            if (!core.VaultService) {
                return
            }

            const vault = this.injector.get(core.VaultService)
            const settings = loadSettings(this.platform)
            const client = new KeePassXCCliClient()
            this.bridge = new VaultPassphraseBridge(this.platform, this.toast)
            this.bridge.install(vault, client, settings)
            void this.bridge.preflightCheck(client, settings)
        } catch (e) {
            const logger = new Logger(this.platform)
            logger.log('Failed to install vault passphrase bridge: ' + String(e), 'error')
        }
    }
}
