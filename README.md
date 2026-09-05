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
dot sync-pi     Import new authored Pi files and link them from the repository
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

When Pi creates a new extension, prompt, or skill directly under `~/.pi/agent`, import it into the repository and replace it with a managed link:

```bash
./dot sync-pi
```

Review and commit the imported files after synchronization.

## Secrets and runtime state

Do not commit:

- API keys, tokens, private keys, or `.env` files
- Pi authentication, MCP authentication, sessions, history, logs, or caches
- `node_modules`
- application databases or generated state

Use environment variables, interactive login, or a private secret manager for credentials.
