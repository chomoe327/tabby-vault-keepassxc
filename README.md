# tabby-vault-keepassxc

Tabby plugin that automatically unlocks **Tabby Vault** using [KeePassXC](https://keepassxc.org/) Browser Integration — no external CLI, works on **macOS, Windows, and Linux**.

[中文说明](#中文说明)

## Features

- Native KeePassXC Browser Integration protocol (NaCl + local socket/pipe)
- No Rust / `keepassxc-proxy-getpw` CLI required
- Associate directly from Tabby settings
- Falls back to Tabby unlock modal on failure
- Cross-platform: macOS, Windows, Linux (including Flatpak socket path)

## Requirements

- Tabby with Vault enabled (encrypted config)
- KeePassXC with **Settings → Browser Integration → Enable browser integration**
- A KeePassXC entry whose **URL** matches the plugin setting (default `tabby://vault`) and whose **password** is your Tabby Vault master passphrase

> **Important:** Your Tabby Vault passphrase must **not** be the same as your KeePassXC database master password.

## Install from Tabby plugin market (Windows / any platform)

1. Open Tabby → **Settings → Plugins**
2. Search for `tabby-vault-keepassxc`
3. Install and restart Tabby

Or install via npm:

```bash
# Windows
cd "%APPDATA%\tabby\plugins"
npm install tabby-vault-keepassxc

# macOS
cd ~/Library/Application\ Support/tabby/plugins
npm install tabby-vault-keepassxc
```

## macOS local development

```bash
cd tabby-vault-keepassxc
pnpm install
pnpm run deploy:local-tabby
```

Restart Tabby. Settings appear under **Settings → Tabby Vault KeePassXC**.

## Setup

1. Enable Browser Integration in KeePassXC
2. Create a KeePassXC entry with URL `tabby://vault` and password = Tabby Vault passphrase
3. In Tabby: **Settings → Tabby Vault KeePassXC**
4. Click **Associate with KeePassXC** and approve the prompt in KeePassXC
5. Click **Test fetch** to verify
6. Restart Tabby

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Enable plugin | on | Master toggle |
| Entry URL | `tabby://vault` | KeePassXC URL match |
| Wait for unlock | on | Prompt to unlock KeePassXC when database is locked |
| Remember passphrase | 24 hours | In-memory cache (0 = always query KeePassXC) |
| Fallback | Tabby modal | On failure: show modal or throw error |

**Plugin settings:** `{tabbyConfigDir}/tabby-vault-keepassxc-settings.json`  
**Association keys:** `{tabbyConfigDir}/tabby-vault-keepassxc-association.json`  
**Logs:** `{tabbyConfigDir}/tabby-vault-keepassxc/`

## Verification

1. KeePassXC Browser Integration enabled
2. KeePassXC entry with URL `tabby://vault` and correct password
3. Plugin settings → **Associate with KeePassXC** → success
4. **Test fetch** → success
5. Restart Tabby → no Vault modal when KeePassXC is running
6. Quit KeePassXC → restart Tabby → falls back to Tabby unlock modal

## Publish to npm

```bash
pnpm install
pnpm run build
npm publish --access public
```

## License

MIT

---

## 中文说明

Tabby 插件：通过 KeePassXC Browser Integration 原生协议自动获取 Vault 主密码，支持 macOS / Windows / Linux，无需 CLI。

### 安装

- **Windows**：Tabby → Settings → Plugins → 搜索 `tabby-vault-keepassxc`
- **macOS 本地测试**：`pnpm run deploy:local-tabby`

### 配置

1. KeePassXC 开启 Browser Integration  
2. 创建 URL=`tabby://vault` 条目  
3. 设置页 **与 KeePassXC Associate**  
4. **测试取密码**  
5. 重启 Tabby  
