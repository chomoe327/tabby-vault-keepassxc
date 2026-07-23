export type FallbackMode = 'modal' | 'error'

export interface KeePassXCPluginSettings {
    enabled: boolean
    entryUrl: string
    cliPath: string
    waitForUnlock: boolean
    rememberMinutes: number
    fallback: FallbackMode
    associationFile: string
}

export const DEFAULT_SETTINGS: KeePassXCPluginSettings = {
    enabled: true,
    entryUrl: 'tabby://vault',
    cliPath: '',
    waitForUnlock: true,
    rememberMinutes: 1440,
    fallback: 'modal',
    associationFile: '',
}

export const REMEMBER_MINUTE_OPTIONS = [
    { value: 0, label: { en: 'Never cache (always query KeePassXC)', zh: '不缓存（每次都查 KeePassXC）' } },
    { value: 15, label: { en: '15 minutes', zh: '15 分钟' } },
    { value: 60, label: { en: '1 hour', zh: '1 小时' } },
    { value: 240, label: { en: '4 hours', zh: '4 小时' } },
    { value: 1440, label: { en: '24 hours', zh: '24 小时' } },
]

export const FALLBACK_OPTIONS = [
    { value: 'modal' as FallbackMode, label: { en: 'Show Tabby unlock modal', zh: '显示 Tabby 解锁弹窗' } },
    { value: 'error' as FallbackMode, label: { en: 'Throw error', zh: '抛出错误' } },
]
