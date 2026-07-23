import { PlatformService } from 'terminus-core'
import { KeePassXCAssociation } from '../services/keepassxc-protocol'

const fs = require('fs')
const path = require('path')
const os = require('os')

const ASSOCIATION_FILENAME = 'tabby-vault-keepassxc-association.json'
const LEGACY_ASSOCIATION_PATH = path.join(os.homedir(), '.config', 'keepassxc-proxy-getpw', 'association.json')

export function getAssociationPath (platform: PlatformService): string {
    return path.join(path.dirname(platform.getConfigPath()), ASSOCIATION_FILENAME)
}

export function loadAssociation (platform: PlatformService): KeePassXCAssociation | null {
    const associationPath = getAssociationPath(platform)
    const parsed = readAssociationFile(associationPath)
    if (parsed) {
        return parsed
    }

    const legacy = readAssociationFile(LEGACY_ASSOCIATION_PATH)
    if (legacy) {
        saveAssociation(platform, legacy)
        return legacy
    }

    return null
}

export function saveAssociation (platform: PlatformService, association: KeePassXCAssociation): void {
    const associationPath = getAssociationPath(platform)
    fs.writeFileSync(associationPath, JSON.stringify(association, null, 2) + '\n', 'utf8')
}

export function clearAssociation (platform: PlatformService): void {
    const associationPath = getAssociationPath(platform)
    if (fs.existsSync(associationPath)) {
        fs.unlinkSync(associationPath)
    }
}

export function hasAssociation (platform: PlatformService): boolean {
    return loadAssociation(platform) !== null
}

function readAssociationFile (filePath: string): KeePassXCAssociation | null {
    try {
        if (!fs.existsSync(filePath)) {
            return null
        }
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<KeePassXCAssociation>
        if (parsed?.name && parsed?.public_key) {
            return {
                name: parsed.name,
                public_key: parsed.public_key,
            }
        }
    } catch (e) {
        // ignore invalid association files
    }
    return null
}
