import { PlatformService } from 'terminus-core'
import { DEFAULT_SETTINGS, KeePassXCPluginSettings } from '../data/defaults'

const fs = require('fs')
const path = require('path')

const SETTINGS_FILENAME = 'tabby-vault-keepassxc-settings.json'

export function getSettingsPath (platform: PlatformService): string {
    return path.join(path.dirname(platform.getConfigPath()), SETTINGS_FILENAME)
}

export function loadSettings (platform: PlatformService): KeePassXCPluginSettings {
    const defaults = { ...DEFAULT_SETTINGS }
    try {
        const settingsPath = getSettingsPath(platform)
        if (!fs.existsSync(settingsPath)) {
            return defaults
        }
        const parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as Partial<KeePassXCPluginSettings>
        return {
            ...defaults,
            ...parsed,
        }
    } catch (e) {
        return defaults
    }
}

export function saveSettings (platform: PlatformService, settings: KeePassXCPluginSettings): void {
    const settingsPath = getSettingsPath(platform)
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8')
}
