import { ConfigService, PlatformService } from 'terminus-core'

export function getTabbyLanguage (_platform: PlatformService, config?: ConfigService): string {
    try {
        const store = (config as { store?: { language?: string } } | undefined)?.store
        if (store?.language) {
            return store.language
        }
    } catch (e) {
        // ignore
    }

    if (typeof navigator !== 'undefined' && navigator.language) {
        return navigator.language
    }

    return 'en-US'
}

export function isChineseLocale (platform: PlatformService, config?: ConfigService): boolean {
    return getTabbyLanguage(platform, config).toLowerCase().startsWith('zh')
}
