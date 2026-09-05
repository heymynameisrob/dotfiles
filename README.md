# dotfiles

Personal macOS and Pi development configuration. This repository is the source of truth for authored configuration. GNU Stow links files from `home/` into `$HOME`.

## Structure

```text
.
├── dot                       Management command
├── home/                     Mirrors the home directory
│   ├── .claude/              Claude configuration
│   ├── .config/              Application configuration
│   ├── .pi/agent/            Pi package, extensions, skills, prompts, and themes
│   ├── .bash_profile
│   └── .gitconfig
└── packages/Brewfile         Homebrew packages and applications
```

Pi source and dotfiles now have one owner. The former `pi-config` package is stored at `home/.pi/agent/`. Authentication, sessions, logs, caches, and other generated Pi state must not be committed.

The active OpenCode configuration remains unmanaged because it contains a local credential. `examples/opencode.json` is a sanitized reference that reads `CONTEXT7_API_KEY` from the environment.

## First migration

The old repositories and active home files can contain different versions. Do not run `dot stow` until conflicts are reviewed.

```bash
cd ~/code/dotfiles
./dot check-stow
```

For each reported conflict:

1. Compare the active file with its source under `home/`.
2. Keep the required content in the repository source.
3. Back up and remove the active regular file.
4. Run `./dot check-stow` again.

When no unexpected conflicts remain:

```bash
./dot stow
./dot pi
./dot doctor
```

Keep `~/code/pi-config` unchanged until Pi starts correctly and all resources are available from `~/.pi/agent`.

Remove any old `PI_CODING_AGENT_DIR` entry that points to `~/code/pi-config/.pi`. Pi should use its normal `~/.pi/agent` directory after migration.

## Commands

```text
dot init        Install Brew packages, Pi dependencies, and links
dot update      Pull and refresh packages, dependencies, and links
dot packages    Install packages from packages/Brewfile
dot pi          Install Pi dependencies with npm ci
dot sync        Apply repository files without removing unmanaged home files
dot sync-pi     Compatibility alias for dot sync
dot stow        Link home/ into $HOME
dot unstow      Remove repository-managed links
dot check-stow  report conflicts without changing files
dot doctor      Check tools, old Pi paths, and link status
```

## Adding configuration

Place a file under `home/` at the same relative path that it uses under `$HOME`.

Examples:

```text
home/.config/ghostty/config  -> ~/.config/ghostty/config
home/.config/zed/keymap.json -> ~/.config/zed/keymap.json
home/.pi/agent/skills/       -> ~/.pi/agent/skills/
```

Run `./dot check-stow` and then `./dot stow`.

Apply repository files to the home directory and replace conflicting managed files with links:

```bash
./dot sync
```

The repository is the source of truth. The command only changes paths that have a corresponding file under `home/`. It does not remove other files from the home directory. Backup files and Zed's `prompts` directory are ignored. `./dot sync-pi` remains as a compatibility alias for `./dot sync`.

The complete `extensions`, `prompts`, and `skills` directories under `~/.pi/agent` link to their matching directories under `home/.pi/agent`. Content installed by Pi on this machine is therefore created directly in the repository. Review and commit new authored files after installation. Generated `node_modules` content and known Cubic runtime skill links remain ignored by Git.

## Secrets and runtime state

Do not commit:

- API keys, tokens, private keys, or `.env` files
- Pi authentication, MCP authentication, sessions, history, logs, or caches
- `node_modules`
- application databases or generated state

Use environment variables, interactive login, or a private secret manager for credentials.
