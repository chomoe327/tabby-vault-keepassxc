import { execFile } from 'child_process'
import { promisify } from 'util'
import { KeePassXCClient, KeePassXCConnectionResult, KeePassXCOptions } from './keepassxc-client.interface'

const execFileAsync = promisify(execFile)
const fs = require('fs')
const os = require('os')
const path = require('path')

const DEFAULT_TIMEOUT_MS = 8000
const DEFAULT_ASSOCIATION_FILE = path.join(os.homedir(), '.config', 'keepassxc-proxy-getpw', 'association.json')

function resolveCliPath (cliPath?: string): string | null {
    if (cliPath && cliPath.trim()) {
        return cliPath.trim()
    }

    const candidates = [
        'keepassxc-proxy-getpw',
        path.join(os.homedir(), '.cargo', 'bin', 'keepassxc-proxy-getpw'),
        '/usr/local/bin/keepassxc-proxy-getpw',
        '/opt/homebrew/bin/keepassxc-proxy-getpw',
    ]

    for (const candidate of candidates) {
        if (candidate === 'keepassxc-proxy-getpw') {
            return candidate
        }
        if (fs.existsSync(candidate)) {
            return candidate
        }
    }

    return 'keepassxc-proxy-getpw'
}

function buildArgs (url: string, options: KeePassXCOptions): string[] {
    const args: string[] = []
    if (!options.waitForUnlock) {
        args.push('--no-wait-unlock')
    }
    const associationFile = options.associationFile?.trim()
    if (associationFile) {
        args.push('-a', associationFile)
    }
    args.push(url)
    return args
}

function sanitizeError (message: string): string {
    return message.replace(/[\r\n]+/g, ' ').trim()
}

async function isKeePassXCRunning (): Promise<boolean> {
    try {
        const platform = process.platform
        if (platform === 'darwin') {
            await execFileAsync('pgrep', ['-x', 'keepassxc'], { timeout: 2000 })
            return true
        }
        if (platform === 'linux') {
            await execFileAsync('pgrep', ['-x', 'keepassxc'], { timeout: 2000 })
            return true
        }
        if (platform === 'win32') {
            const { stdout } = await execFileAsync('tasklist', ['/FI', 'IMAGENAME eq KeePassXC.exe'], {
                timeout: 2000,
                encoding: 'utf8',
            })
            return stdout.includes('KeePassXC.exe')
        }
    } catch (e) {
        return false
    }
    return false
}

export class KeePassXCCliClient implements KeePassXCClient {
    async isAvailable (): Promise<boolean> {
        const running = await isKeePassXCRunning()
        if (!running) {
            return false
        }
        const cli = resolveCliPath()
        if (!cli) {
            return false
        }
        if (cli !== 'keepassxc-proxy-getpw' && !fs.existsSync(cli)) {
            return false
        }
        return true
    }

    async getPassword (url: string, options: KeePassXCOptions = {}): Promise<string | null> {
        const cli = resolveCliPath(options.cliPath)
        if (!cli) {
            return null
        }

        const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
        const args = buildArgs(url, options)

        try {
            const { stdout } = await execFileAsync(cli, args, {
                timeout,
                encoding: 'utf8',
                maxBuffer: 1024 * 1024,
            })
            const password = stdout.replace(/\r?\n$/, '')
            return password.length > 0 ? password : null
        } catch (e) {
            return null
        }
    }

    async testConnection (options: KeePassXCOptions = {}): Promise<KeePassXCConnectionResult> {
        const cli = resolveCliPath(options.cliPath)
        if (!cli) {
            return { ok: false, message: 'CLI not found' }
        }

        if (cli !== 'keepassxc-proxy-getpw' && !fs.existsSync(cli)) {
            return { ok: false, message: 'CLI not found at ' + cli }
        }

        const running = await isKeePassXCRunning()
        if (!running) {
            return { ok: false, message: 'KeePassXC is not running' }
        }

        const associationFile = options.associationFile?.trim() || DEFAULT_ASSOCIATION_FILE
        if (!fs.existsSync(associationFile)) {
            return { ok: false, message: 'Association file not found. Run keepassxc-proxy-getpw once to associate.' }
        }

        try {
            await execFileAsync(cli, ['--version'], { timeout: 3000, encoding: 'utf8' })
            return { ok: true, message: 'CLI reachable, association file present' }
        } catch (e: any) {
            return { ok: false, message: sanitizeError(e?.message || String(e)) }
        }
    }
}

export { resolveCliPath, DEFAULT_ASSOCIATION_FILE }
