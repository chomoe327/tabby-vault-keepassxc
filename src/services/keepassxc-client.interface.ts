export interface KeePassXCOptions {
    waitForUnlock?: boolean
    timeoutMs?: number
    socketPath?: string
}

export interface KeePassXCConnectionResult {
    ok: boolean
    message: string
}

export interface KeePassXCClient {
    getPassword (url: string, options?: KeePassXCOptions): Promise<string | null>
    testConnection (options?: KeePassXCOptions): Promise<KeePassXCConnectionResult>
    associate (options?: KeePassXCOptions): Promise<KeePassXCConnectionResult>
    isAvailable (): Promise<boolean>
}
