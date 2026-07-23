export interface KeePassXCOptions {
    cliPath?: string
    waitForUnlock?: boolean
    associationFile?: string
    timeoutMs?: number
}

export interface KeePassXCConnectionResult {
    ok: boolean
    message: string
}

export interface KeePassXCClient {
    getPassword (url: string, options: KeePassXCOptions): Promise<string | null>
    testConnection (options: KeePassXCOptions): Promise<KeePassXCConnectionResult>
    isAvailable (): Promise<boolean>
}
