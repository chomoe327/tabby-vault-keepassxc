import * as nacl from 'tweetnacl'
import * as net from 'net'
import * as fs from 'fs'
import * as os from 'os'
import { randomBytes as cryptoRandomBytes } from 'crypto'

const SERVER_NAME = 'org.keepassxc.KeePassXC.BrowserServer'
const READ_CHUNK_SIZE = 4096

export interface KeePassXCAssociation {
    name: string
    public_key: string
}

export interface KeePassXCLogin {
    name: string
    login: string
    password: string
    uuid: string
    group: string
}

function randomBytes (length: number): Uint8Array {
    return new Uint8Array(cryptoRandomBytes(length))
}

function toBase64 (data: Uint8Array): string {
    return Buffer.from(data).toString('base64')
}

function fromBase64 (data: string): Uint8Array {
    return new Uint8Array(Buffer.from(data, 'base64'))
}

function isSuccessValue (value: unknown): boolean {
    if (value === true) {
        return true
    }
    if (value === 'true') {
        return true
    }
    return false
}

function incrementNonce (nonce: Uint8Array): void {
    for (let i = nonce.length - 1; i >= 0; i--) {
        const sum = nonce[i] + 1
        nonce[i] = sum & 0xff
        if (sum <= 0xff) {
            break
        }
    }
}

export function getDefaultSocketPath (): string {
    if (process.platform === 'win32') {
        return `${SERVER_NAME}_${os.userInfo().username}`
    }

    if (process.platform === 'darwin') {
        const tmpdir = process.env.TMPDIR || '/tmp/'
        return `${tmpdir}${SERVER_NAME}`
    }

    const runtimeDir = process.env.XDG_RUNTIME_DIR
    if (runtimeDir) {
        const flatpakPath = `${runtimeDir}/app/org.keepassxc.KeePassXC/${SERVER_NAME}`
        if (fs.existsSync(flatpakPath)) {
            return flatpakPath
        }
        return `${runtimeDir}/${SERVER_NAME}`
    }

    return `/tmp/${SERVER_NAME}`
}

function connectSocket (socketPath: string, timeoutMs: number): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
        const path = process.platform === 'win32'
            ? `\\\\.\\pipe\\${socketPath}`
            : socketPath

        const socket = net.connect({ path })
        const timer = setTimeout(() => {
            socket.destroy()
            reject(new Error('KeePassXC socket connection timed out'))
        }, timeoutMs)

        socket.once('connect', () => {
            clearTimeout(timer)
            resolve(socket)
        })

        socket.once('error', (err) => {
            clearTimeout(timer)
            reject(err)
        })
    })
}

async function readRawMessage (socket: net.Socket): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []

        const onData = (chunk: Buffer) => {
            chunks.push(chunk)
            if (chunk.length < READ_CHUNK_SIZE) {
                cleanup()
                resolve(Buffer.concat(chunks))
            }
        }

        const onError = (err: Error) => {
            cleanup()
            reject(err)
        }

        const onEnd = () => {
            cleanup()
            resolve(Buffer.concat(chunks))
        }

        const cleanup = () => {
            socket.removeListener('data', onData)
            socket.removeListener('error', onError)
            socket.removeListener('end', onEnd)
        }

        socket.on('data', onData)
        socket.once('error', onError)
        socket.once('end', onEnd)
    })
}

export class KeePassXCConnection {
    private socket: net.Socket | null = null
    private secretKey: Uint8Array
    private publicKey: Uint8Array
    private nonce: Uint8Array
    private clientId: string
    private cryptoBoxKey: Uint8Array | null = null
    private serverPublicKey: Uint8Array | null = null
    private associateId: string | null = null
    private idPublicKey: Uint8Array | null = null

    constructor () {
        const keyPair = nacl.box.keyPair()
        this.secretKey = keyPair.secretKey
        this.publicKey = keyPair.publicKey
        this.nonce = randomBytes(24)
        this.clientId = toBase64(randomBytes(24))
    }

    async connect (socketPath?: string, timeoutMs = 8000): Promise<void> {
        const path = socketPath || getDefaultSocketPath()
        this.socket = await connectSocket(path, timeoutMs)

        const request = {
            action: 'change-public-keys',
            publicKey: toBase64(this.publicKey),
            nonce: toBase64(this.nonce),
            clientID: this.clientId,
        }

        await this.sendRaw(request)
        const response = await this.recvRaw<any>()

        if (!isSuccessValue(response.success)) {
            throw new Error('KeePassXC public key exchange failed')
        }

        this.serverPublicKey = fromBase64(response.publicKey)
        this.cryptoBoxKey = this.secretKey
        incrementNonce(this.nonce)
    }

    loadAssociation (association: KeePassXCAssociation): void {
        this.associateId = association.name
        this.idPublicKey = fromBase64(association.public_key)
    }

    dumpAssociation (): KeePassXCAssociation {
        if (!this.associateId || !this.idPublicKey) {
            throw new Error('Not associated with KeePassXC')
        }
        return {
            name: this.associateId,
            public_key: toBase64(this.idPublicKey),
        }
    }

    async associate (): Promise<string> {
        const idKeyPair = nacl.box.keyPair()
        const request = {
            action: 'associate',
            key: toBase64(this.publicKey),
            idKey: toBase64(idKeyPair.publicKey),
        }

        const response = await this.sendEncrypted<{ id: string }>(request)
        this.associateId = response.id
        this.idPublicKey = idKeyPair.publicKey
        return response.id
    }

    async testAssociate (triggerUnlock: boolean): Promise<boolean> {
        if (!this.associateId || !this.idPublicKey) {
            throw new Error('Not associated with KeePassXC')
        }

        const request = {
            action: 'test-associate',
            id: this.associateId,
            key: toBase64(this.idPublicKey),
        }

        await this.sendEncrypted(request, triggerUnlock)
        return true
    }

    async getLogins (url: string): Promise<KeePassXCLogin[]> {
        if (!this.associateId || !this.idPublicKey) {
            throw new Error('Not associated with KeePassXC')
        }

        const request = {
            action: 'get-logins',
            url,
            keys: [{
                id: this.associateId,
                key: toBase64(this.idPublicKey),
            }],
        }

        const response = await this.sendEncrypted<{ count?: number | string, entries?: KeePassXCLogin[] }>(request)
        if (!response.count || Number(response.count) === 0) {
            return []
        }
        return response.entries || []
    }

    close (): void {
        if (this.socket) {
            this.socket.destroy()
            this.socket = null
        }
    }

    private async sendRaw (payload: unknown): Promise<void> {
        if (!this.socket) {
            throw new Error('Not connected to KeePassXC')
        }

        const data = Buffer.from(JSON.stringify(payload), 'utf8')
        await new Promise<void>((resolve, reject) => {
            this.socket!.write(data, (err) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve()
            })
        })
    }

    private async recvRaw<T> (): Promise<T> {
        if (!this.socket) {
            throw new Error('Not connected to KeePassXC')
        }

        const data = await readRawMessage(this.socket)
        if (data.length === 0) {
            throw new Error('KeePassXC closed the connection')
        }
        return JSON.parse(data.toString('utf8')) as T
    }

    private async sendEncrypted<T> (payload: unknown, triggerUnlock = false): Promise<T> {
        if (!this.serverPublicKey || !this.cryptoBoxKey) {
            throw new Error('KeePassXC encryption is not ready')
        }

        const plaintext = Buffer.from(JSON.stringify(payload), 'utf8')
        const ciphertext = nacl.box(
            plaintext,
            this.nonce,
            this.serverPublicKey,
            this.cryptoBoxKey,
        )

        if (!ciphertext) {
            throw new Error('Failed to encrypt KeePassXC message')
        }

        const action = (payload as { action?: string }).action || ''
        const envelope: Record<string, string> = {
            action,
            message: toBase64(ciphertext),
            nonce: toBase64(this.nonce),
            clientID: this.clientId,
        }

        if (triggerUnlock) {
            envelope.triggerUnlock = 'true'
        }

        await this.sendRaw(envelope)
        incrementNonce(this.nonce)
        return this.recvEncrypted<T>()
    }

    private async recvEncrypted<T> (): Promise<T> {
        const response = await this.recvRaw<any>()

        if (response.error) {
            throw new Error(response.error || 'KeePassXC returned an error')
        }

        if (!this.serverPublicKey || !this.cryptoBoxKey) {
            throw new Error('KeePassXC encryption is not ready')
        }

        const serverNonce = fromBase64(response.nonce)
        const ciphertext = fromBase64(response.message)
        const plaintext = nacl.box.open(
            ciphertext,
            serverNonce,
            this.serverPublicKey,
            this.cryptoBoxKey,
        )

        if (!plaintext) {
            throw new Error('Failed to decrypt KeePassXC response')
        }

        const decoded = JSON.parse(Buffer.from(plaintext).toString('utf8')) as T & { success?: unknown }
        if (!isSuccessValue(decoded.success)) {
            throw new Error('KeePassXC response was not successful')
        }

        return decoded
    }
}
