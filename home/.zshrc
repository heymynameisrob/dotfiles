# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:$HOME/.local/bin:/usr/local/bin:$PATH

# Path to your Oh My Zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Set name of the theme to load --- if set to "random", it will
# load a random theme each time Oh My Zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
ZSH_THEME="robbyrussell"

# Set list of themes to pick from when loading at random
# Setting this variable when ZSH_THEME=random will cause zsh to load
# a theme from this variable instead of looking in $ZSH/themes/
# If set to an empty array, this variable will have no effect.
# ZSH_THEME_RANDOM_CANDIDATES=( "robbyrussell" "agnoster" )

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion.
# Case-sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"

# Uncomment one of the following lines to change the auto-update behavior
# zstyle ':omz:update' mode disabled  # disable automatic updates
# zstyle ':omz:update' mode auto      # update automatically without asking
# zstyle ':omz:update' mode reminder  # just remind me to update when it's time

# Uncomment the following line to change how often to auto-update (in days).
# zstyle ':omz:update' frequency 13

# Uncomment the following line if pasting URLs and other text is messed up.
# DISABLE_MAGIC_FUNCTIONS="true"

# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"

# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"

# Uncomment the following line to display red dots whilst waiting for completion.
# You can also set it to another string to have that shown instead of the default red dots.
# e.g. COMPLETION_WAITING_DOTS="%F{yellow}waiting...%f"
# Caution: this setting can cause issues with multiline prompts in zsh < 5.7.1 (see #5765)
# COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# You can set one of the optional three formats:
# "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# or set a custom format using the strftime function format specifications,
# see 'man strftime' for details.
# HIST_STAMPS="mm/dd/yyyy"

# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

# Which plugins would you like to load?
# Standard plugins can be found in $ZSH/plugins/
# Custom plugins may be added to $ZSH_CUSTOM/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(git)

source $ZSH/oh-my-zsh.sh

# User configuration

# export MANPATH="/usr/local/man:$MANPATH"

# You may need to manually set your language environment
# export LANG=en_US.UTF-8

# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='nvim'
# fi

# Compilation flags
# export ARCHFLAGS="-arch $(uname -m)"

# Set personal aliases, overriding those provided by Oh My Zsh libs,
# plugins, and themes. Aliases can be placed here, though Oh My Zsh
# users are encouraged to define aliases within a top-level file in
# the $ZSH_CUSTOM folder, with .zsh extension. Examples:
# - $ZSH_CUSTOM/aliases.zsh
# - $ZSH_CUSTOM/macos.zsh
# For a full list of active aliases, run `alias`.
#
# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"

export NVM_DIR="$HOME/.nvm"
export PATH="$NVM_DIR/versions/node/v24.19.0/bin:$PATH"
function nvm() {
  unset -f nvm
  . "/opt/homebrew/opt/nvm/nvm.sh" --no-use
  nvm "$@"
}

# pnpm
export PNPM_HOME="/Users/robn8n/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

source /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh
export PATH="$HOME/go/bin:$PATH"

# Pomodoro timer
wo () {
  local duration="${1:-45}"
  echo "work ($duration min)" | lolcat
  timer ${duration}m
  say "work session done"
}

br () {
  local duration="${1:-10}"
  echo "break ($duration min)" | lolcat
  timer ${duration}m
  say "break session done"
}

export PATH="/Users/robn8n/.local/bin:$PATH"X

# Shell shortcuts
alias ll='ls -al'
alias editgit='code ~/.gitconfig'
alias editbash='code ~/.bash_profile'
alias editzsh='code ~/.zshrc'
alias resource='source ~/.bash_profile && echo "Done!"'
alias ios='open /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app'

# Alias for micro
alias micro='./micro'
alias code='tmux has-session -t code 2>/dev/null && tmux resize-pane -t code:0.0 -x 40 \; attach -t code || tmux new-session -s code -c "$PWD" "bontree" \; split-window -h -c "$PWD" "opencode" \; select-pane -t 0 \; resize-pane -x 40'
alias n8n-rebuild="$HOME/.config/n8n/n8n-rebuild.sh"
alias n8n-env='cat "$HOME/.config/n8n/.env"'
alias n8n="cd ~/code/n8n/packages/frontend && pnpm dev:fe"
n8n_fe() {
  (cd /Users/robn8n/code/n8n && if command -v nvm >/dev/null 2>&1; then nvm exec 24 pnpm dev:fe; else pnpm dev:fe; fi)
}

n8n_fe_ent() {
  (set -a; source "$HOME/.config/n8n/.env"; set +a; cd "$N8N_REPO_DIR" && if command -v nvm >/dev/null 2>&1; then nvm exec "$N8N_NODE_VERSION" pnpm dev:fe; else pnpm dev:fe; fi)
}

alias n8n-fe="$HOME/.config/n8n/n8n-fe.sh"
alias n8n-fe-ent='n8n_fe_ent'
alias n8n-storybook="$HOME/.config/n8n/n8n-sb.sh"
alias n8n-sb="$HOME/.config/n8n/n8n-sb.sh"
n8n_kill() {
  local pids pgids
  pids="$(lsof -tiTCP:5678 -tiTCP:8080 -sTCP:LISTEN)"

  if [[ -z "$pids" ]]; then
    echo "No n8n servers are listening on ports 5678 or 8080."
    return
  fi

  pgids="$(for pid in ${(f)pids}; do ps -o pgid= -p "$pid"; done | tr -d ' ' | sort -u)"
  for pgid in ${(f)pgids}; do
    kill -TERM -- "-$pgid"
  done
}
alias n8n-kill='n8n_kill'


# Added by git-ai installer on Thu  3 Sep 2026 09:21:36 BST
export PATH="/Users/robn8n/.git-ai/bin:$PATH"

# cubic
export PATH="/Users/robn8n/.cubic/bin":$PATH
