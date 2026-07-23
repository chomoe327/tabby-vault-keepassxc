import { PlatformService } from 'terminus-core'

const fs = require('fs')
const path = require('path')

interface LogEntry {
    level: string
    time: string
    message: string
}

export default class Logger {
    private platform: PlatformService

    constructor (platform: PlatformService) {
        this.platform = platform
    }

    private getLogDir (): string {
        return path.dirname(this.platform.getConfigPath()) + '/tabby-vault-keepassxc'
    }

    getCurrentLoggerFile (): string {
        const moment = new Date()
        const date = [
            String(moment.getDate()).padStart(2, '0'),
            String(moment.getMonth() + 1).padStart(2, '0'),
            moment.getFullYear(),
        ].join('-')
        return this.getLogDir() + '/' + date + '.log'
    }

    private ensureLogDir (): void {
        const dir = this.getLogDir()
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
    }

    log (content: string, level = 'info'): void {
        try {
            this.ensureLogDir()
            const entry: LogEntry = {
                level,
                time: new Date().toLocaleString(),
                message: content,
            }
            fs.appendFileSync(this.getCurrentLoggerFile(), JSON.stringify(entry) + '\n', 'utf8')
        } catch (e) {
            console.error('[tabby-vault-keepassxc]', content)
        }
    }
}
