import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'terminus-settings'
import { KeePassXCSettingsComponent } from './components/keepassxc-settings.component'
import Lang from './data/lang'

@Injectable()
export class KeePassXCSettingsTabProvider extends SettingsTabProvider {
    id = 'tabby-vault-keepassxc'
    icon = 'key'
    title = Lang.trans('common.menu_title')

    getComponentType (): any {
        return KeePassXCSettingsComponent
    }
}
