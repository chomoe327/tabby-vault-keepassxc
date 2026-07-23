import { ConfigService, PlatformService } from 'terminus-core'
import { isChineseLocale } from '../utils/locale-helper'

type Bilingual = { en: string, zh: string }

let currentIsZh = false

const Lang = {
    lang: {
        common: {
            menu_title: { en: 'Tabby Vault KeePassXC', zh: 'Tabby Vault KeePassXC' },
        },
        settings: {
            title: { en: 'Tabby Vault KeePassXC', zh: 'Tabby Vault KeePassXC' },
            sub_title: {
                en: 'Automatically fetch Tabby Vault passphrase from KeePassXC Browser Integration on startup.',
                zh: 'Tabby 启动时通过 KeePassXC Browser Integration 自动获取 Vault 主密码。',
            },
            enabled: { en: 'Enable plugin', zh: '启用插件' },
            entry_url: { en: 'KeePassXC entry URL', zh: 'KeePassXC 条目 URL' },
            entry_url_hint: {
                en: 'Create a KeePassXC entry with this URL and your Tabby Vault passphrase as the password.',
                zh: '在 KeePassXC 中创建 URL 匹配此值的条目，密码设为 Tabby Vault 主密码。',
            },
            wait_for_unlock: { en: 'Wait for KeePassXC unlock', zh: 'KeePassXC 锁库时等待解锁' },
            wait_for_unlock_hint: {
                en: 'When enabled, KeePassXC prompts you to unlock the database (e.g. Touch ID). When disabled, fails immediately.',
                zh: '启用时 KeePassXC 会提示解锁数据库（如 Touch ID）；禁用时立即失败并回退。',
            },
            save: { en: 'Save settings', zh: '保存设置' },
            saved: { en: 'Settings saved.', zh: '设置已保存。' },
            associate: { en: 'Associate with KeePassXC', zh: '与 KeePassXC Associate' },
            associate_ok: { en: 'Successfully associated with KeePassXC.', zh: '已成功与 KeePassXC associate。' },
            associate_fail: { en: 'Association failed. Ensure KeePassXC is running and approve the prompt.', zh: 'Associate 失败。请确认 KeePassXC 已运行并在弹窗中批准。' },
            test_fetch: { en: 'Test fetch', zh: '测试取密码' },
            test_fetch_ok: { en: 'Successfully fetched passphrase from KeePassXC.', zh: '已成功从 KeePassXC 获取主密码。' },
            test_fetch_fail: { en: 'Failed to fetch passphrase. Check KeePassXC, URL, and association.', zh: '获取主密码失败。请检查 KeePassXC、URL 和 associate 状态。' },
            association_status: { en: 'Association status', zh: 'Associate 状态' },
            association_ok: { en: 'Associated and reachable', zh: '已 associate 且可连接' },
            association_unknown: { en: 'Not associated yet', zh: '尚未 associate' },
            association_fail: { en: 'Not associated or KeePassXC unavailable', zh: '未 associate，或 KeePassXC / Browser Integration 不可用' },
            keepassxc_not_running: {
                en: 'KeePassXC is not running or Browser Integration is disabled.',
                zh: 'KeePassXC 未运行，或未开启 Browser Integration。',
            },
            no_matching_entry: {
                en: 'No matching KeePassXC entry for URL. Check entry URL setting.',
                zh: 'KeePassXC 中无匹配 URL 的条目，请检查 URL 设置。',
            },
            fetch_failed: {
                en: 'KeePassXC fetch failed. Falling back to Tabby unlock modal.',
                zh: 'KeePassXC 取密码失败，已回退到 Tabby 解锁弹窗。',
            },
            preflight_warn: {
                en: 'KeePassXC integration may not work: {message}',
                zh: 'KeePassXC 集成可能无法正常工作：{message}',
            },
        },
    },

    refreshLocale (platform: PlatformService, config?: ConfigService): void {
        currentIsZh = isChineseLocale(platform, config)
    },

    isChinese (): boolean {
        return currentIsZh
    },

    trans: (key: string, vars?: Record<string, string | number>): string => {
        let dict: any = Lang.lang
        const objects = key.split('.')
        for (const i in objects) {
            if (typeof dict[objects[i]] !== 'undefined') {
                dict = dict[objects[i]]
            }
        }

        let text = ''
        if (typeof dict === 'string') {
            text = dict
        } else if (dict && typeof dict.en === 'string' && typeof dict.zh === 'string') {
            text = currentIsZh ? dict.zh : dict.en
        }

        if (vars) {
            for (const [name, value] of Object.entries(vars)) {
                text = text.replace(`{${name}}`, String(value))
            }
        }

        return text
    },

    transOption (option: { label: Bilingual }): string {
        return currentIsZh ? option.label.zh : option.label.en
    },
}

export default Lang
