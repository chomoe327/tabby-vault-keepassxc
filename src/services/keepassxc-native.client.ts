import { PlatformService } from 'terminus-core'
import {
    KeePassXCClient,
    KeePassXCConnectionResult,
    KeePassXCOptions,
} from './keepassxc-client.interface'
import { KeePassXCConnection } from './keepassxc-protocol'
import { diagnoseKeePassXC, isKeePassXCRunning, isKeePassXCSocketAvailable } from './keepassxc-runtime'
import {
    clearAssociation,
    loadAssociation,
    saveAssociation,
} from '../utils/association-store'

const DEFAULT_TIMEOUT_MS = 8000

export class KeePassXCNativeClient implements KeePassXCClient {
    constructor (private platform: PlatformService) {}

    async isAvailable (): Promise<boolean> {
        if (!(await isKeePassXCRunning())) {
            return false
        }
        return isKeePassXCSocketAvailable()
    }

    async associate (options: KeePassXCOptions = {}): Promise<KeePassXCConnectionResult> {
        const issue = await diagnoseKeePassXC()
        if (issue) {
            return { ok: false, message: issue }
        }

        const conn = new KeePassXCConnection()
        try {
            await conn.connect(options.socketPath, options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
            const id = await conn.associate()
            saveAssociation(this.platform, conn.dumpAssociation())
            return { ok: true, message: 'Associated as ' + id }
        } catch (e) {
            return { ok: false, message: sanitizeError(e) }
        } finally {
            conn.close()
        }
    }

    async testConnection (options: KeePassXCOptions = {}): Promise<KeePassXCConnectionResult> {
        const association = loadAssociation(this.platform)
        if (!association) {
            return { ok: false, message: 'Not associated. Click Associate in plugin settings.' }
        }

        const issue = await diagnoseKeePassXC()
        if (issue) {
            return { ok: false, message: issue }
        }

        const conn = new KeePassXCConnection()
        try {
            await conn.connect(options.socketPath, options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
            conn.loadAssociation(association)
            await conn.testAssociate(!!options.waitForUnlock)
            return { ok: true, message: 'Association valid' }
        } catch (e) {
            return { ok: false, message: sanitizeError(e) }
        } finally {
            conn.close()
        }
    }

    async getPassword (url: string, options: KeePassXCOptions = {}): Promise<string | null> {
        const association = loadAssociation(this.platform)
        if (!association) {
            return null
        }

        if (!(await this.isAvailable())) {
            return null
        }

        const conn = new KeePassXCConnection()
        try {
            await conn.connect(options.socketPath, options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
            conn.loadAssociation(association)

            if (options.waitForUnlock) {
                await conn.testAssociate(true)
            } else {
                await conn.testAssociate(false)
            }

            const logins = await conn.getLogins(url)
            if (!logins.length) {
                return null
            }
            return logins[0].password || null
        } catch (e) {
            return null
        } finally {
            conn.close()
        }
    }

    clearAssociation (): void {
        clearAssociation(this.platform)
    }
}

function sanitizeError (error: unknown): string {
    if (error instanceof Error) {
        return error.message.replace(/[\r\n]+/g, ' ').trim()
    }
    return String(error)
}
