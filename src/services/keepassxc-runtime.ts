import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import { getDefaultSocketPath } from './keepassxc-protocol'

const execFileAsync = promisify(execFile)

export async function isKeePassXCRunning (): Promise<boolean> {
    try {
        if (process.platform === 'win32') {
            const { stdout } = await execFileAsync('tasklist', ['/FI', 'IMAGENAME eq KeePassXC.exe'], {
                timeout: 2000,
                encoding: 'utf8',
            })
            return stdout.includes('KeePassXC.exe')
        }

        const processName = process.platform === 'darwin' ? 'KeePassXC' : 'keepassxc'
        await execFileAsync('pgrep', ['-x', processName], { timeout: 2000 })
        return true
    } catch (e) {
        return false
    }
}

export function isKeePassXCSocketAvailable (): boolean {
    if (process.platform === 'win32') {
        return true
    }
    return fs.existsSync(getDefaultSocketPath())
}

export async function diagnoseKeePassXC (): Promise<string | null> {
    if (!(await isKeePassXCRunning())) {
        return 'KeePassXC is not running. Please start KeePassXC first.'
    }

    if (!isKeePassXCSocketAvailable()) {
        return 'Browser Integration is unavailable. Enable it in KeePassXC → Settings → Browser Integration.'
    }

    return null
}
