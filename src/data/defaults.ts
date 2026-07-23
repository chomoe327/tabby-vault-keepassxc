export interface KeePassXCPluginSettings {
    enabled: boolean
    entryUrl: string
    waitForUnlock: boolean
}

export const DEFAULT_SETTINGS: KeePassXCPluginSettings = {
    enabled: true,
    entryUrl: 'tabby://vault',
    waitForUnlock: true,
}
