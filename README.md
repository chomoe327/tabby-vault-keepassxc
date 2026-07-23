# tabby-vault-keepassxc

Tabby plugin that automatically unlocks **Tabby Vault** using [KeePassXC](https://keepassxc.org/) Browser Integration — no manual passphrase prompt on startup.

[中文说明](#中文说明)

## Requirements

- Tabby with Vault enabled (encrypted config)
- KeePassXC with **Settings → Browser Integration → Enable browser integration**
- [keepassxc-proxy-getpw](https://crates.io/crates/keepassxc-proxy-getpw) CLI installed and associated with KeePassXC
- A KeePassXC entry whose **URL** matches the plugin setting (default `tabby://vault`) and whose **password** is your Tabby Vault master passphrase

> **Important:** Your Tabby Vault passphrase must **not** be the same as your KeePassXC database master password (avoids circular dependency).

## Install keepassxc-proxy-getpw

```bash
cargo install keepassxc-proxy-getpw
```

First run associates with KeePassXC (approve the prompt in KeePassXC):

```bash
keepassxc-proxy-getpw tabby://vault
```

Association is stored at `~/.config/keepassxc-proxy-getpw/association.json`.

## Install the plugin

### From source (local development)

```bash
cd tabby-vault-keepassxc
pnpm install
pnpm run build
pnpm run deploy:local-tabby
```

Restart Tabby. The plugin appears under **Settings → Tabby Vault KeePassXC**.

### Manual install

Copy the built plugin to:

```
~/Library/Application Support/tabby/plugins/node_modules/tabby-vault-keepassxc/
```

Structure:

```
tabby-vault-keepassxc/
├── package.json
└── dist/
    ├── index.js
    └── index.js.LICENSE.txt
```

## KeePassXC entry setup

1. Open KeePassXC → create or edit an entry
2. Set **URL** to `tabby://vault` (or your custom URL in plugin settings)
3. Set **Password** to your Tabby Vault master passphrase
4. Save

## Verification

1. Enable Browser Integration in KeePassXC
2. Create the KeePassXC entry as above
3. Confirm CLI works:
   ```bash
   keepassxc-proxy-getpw tabby://vault
   ```
   (Should print your Tabby Vault passphrase to stdout — do not share this output.)
4. Install the plugin and restart Tabby → **no Vault unlock modal** if everything is configured
5. Quit KeePassXC and restart Tabby → should **fall back** to Tabby’s native unlock modal

Use **Settings → Tabby Vault KeePassXC → Test fetch** to verify integration without showing the passphrase in the UI.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Enable plugin | on | Master toggle |
| Entry URL | `tabby://vault` | KeePassXC URL match |
| CLI path | auto-detect | Path to `keepassxc-proxy-getpw` |
| Wait for unlock | on | Wait for KeePassXC unlock vs fail immediately (`--no-wait-unlock`) |
| Remember passphrase | 24 hours | In-memory cache duration (0 = always query KeePassXC) |
| Fallback | Tabby modal | On failure: show modal or throw error |
| Association file | default | Custom `-a` path for CLI |

Plugin settings are stored in:

```
{tabbyConfigDir}/tabby-vault-keepassxc-settings.json
```

Logs:

```
{tabbyConfigDir}/tabby-vault-keepassxc/
```

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Tabby still shows unlock modal | KeePassXC running? CLI works? URL matches entry? Association done? |
| “Association file not found” | Run `keepassxc-proxy-getpw tabby://vault` once and approve in KeePassXC |
| “No matching entry” | Entry URL must match plugin **Entry URL** setting |
| Wrong passphrase / BAD_DECRYPT | Fix KeePassXC entry password; click **Clear cached passphrase** |
| KeePassXC locked | Enable **Wait for unlock**, or unlock KeePassXC before starting Tabby |

## Security notes

- Tabby Vault passphrase is **never** written to disk by this plugin
- Passphrase is cached **in memory only**, with configurable timeout
- Passwords are **never** logged or shown in toasts
- The CLI association file grants access to matching URLs — protect it like a key file (same risk level as KeePassXC browser integration)

## License

MIT

---

## 中文说明

Tabby 插件：启动时通过 KeePassXC **Browser Integration API**（无需浏览器扩展）自动获取 Tabby Vault 主密码。

### 前置条件

- Tabby 已启用 Vault（加密配置）
- KeePassXC 已开启「浏览器集成 / Browser Integration」
- 已安装并 associate `keepassxc-proxy-getpw`
- KeePassXC 中有 URL 为 `tabby://vault` 的条目，密码为 Tabby Vault 主密码

### 安装 CLI

```bash
cargo install keepassxc-proxy-getpw
keepassxc-proxy-getpw tabby://vault   # 首次运行需在 KeePassXC 中批准 associate
```

### 安装插件

```bash
pnpm install && pnpm run build && pnpm run deploy:local-tabby
```

重启 Tabby，在 **Settings → Tabby Vault KeePassXC** 中配置。

### 验证步骤

1. KeePassXC 开启 Browser Integration  
2. 创建 URL=`tabby://vault` 条目，密码=Tabby Vault 主密码  
3. 命令行 `keepassxc-proxy-getpw tabby://vault` 能取到密码  
4. 安装插件并重启 Tabby → 应无 Vault 弹窗  
5. 关闭 KeePassXC 后重启 Tabby → 应回退到 Tabby 解锁弹窗  

### 故障排查

见上表（英文）或设置页 **Test fetch** / **Association status**。

### 安全说明

- 不在磁盘保存 Tabby Vault 主密码  
- 不在日志/Toast 中输出明文密码  
- 进程内内存缓存，可配置超时  
- associate 文件需妥善保管  
