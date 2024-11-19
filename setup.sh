#!/usr/bin/env bash

# Credit to https://github.com/mathiasbynens/dotfiles for macOS customization
# Credit to https://github.com/pawelgrzybek/dotfiles for dotfiles

# Close any open System Preferences panes, to prevent them from overriding
# settings we’re about to change
osascript -e 'tell application "System Preferences" to quit'

# Ask for the administrator password upfront
sudo -v

# Keep-alive: update existing `sudo` time stamp until script has finished
while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &

#
# Color key
#

red=$'\e[1;31m'
green=$'\e[1;32m'
yellow=$'\e[1;33m'
blue=$'\e[1;34m'
magenta=$'\e[1;35m'
cyan=$'\e[1;36m'
end=$'\e[0m'

#
# Prep
#

bin_dir="/usr/local/bin"
code_dir="$HOME/code/"

printf "%s\n======================================================================\n%s" $yellow $end
printf "%s# Loading heymynameisrob/config\n%s" $yellow $end
printf "%s======================================================================\n%s" $yellow $end

#
# 1 .Setup
#

printf "%s\n# Installing Homebrew...\n%s" $yellow $end

printf "%s  - Installing Homebrew...%s"
if [[ ! -e "/usr/local/bin/brew" ]]; then
  {
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  } &> /dev/null
  printf "%s - Done!\n%s" $green $end
else
  printf "%s - Already installed\n%s" $cyan $end
fi

printf "%s\n# Installing software...\n%s" $yellow $end

# Upgrade brew
brew upgrade

# Add some taps
brew tap joedrago/repo
brew tap homebrew/cask-versions

# Install CLI
brew install git
brew install node
brew install yarn
brew install deno
brew install fd
brew install wrk

# Install software
brew install alacritty
brew install --cask docker
brew install --cask orbstack
brew install figma
brew install firefox
brew install firefox@developer-edition
brew install google-chrome
brew install google@chrome-canary
brew install imageoptim
brew install --cask rectangle
brew install raycast
brew install safari-technology-preview
brew install screen-studio
brew install slack
brew install zed
brew install --cask obsidian
brew install --cask tidal

# Install tap formulas
brew install joedrago/repo/avifenc

# Remove outdated versions from the cellar.
brew cleanup

#
# 2 .Copying dotfiles
#

printf "%s\n# Copying dotfiles...\n%s" $yellow $end

dotfiles=( bash_profile gitconfig )
for file in "${dotfiles[@]}"
do
  printf "%s  - .$file%s"
  if [[ ! -e "$HOME/.$file" ]]; then
    {
      curl https://raw.githubusercontent.com/heymynameisrob/dotfiles/master/.$file > $HOME/.$file
    } &> /dev/null
    printf "%s - Success!\n%s" $green $end
  else
    printf "%s - Already exist\n%s" $cyan $end
  fi
done

#
# Creating directories
#

printf "%s  - Creating $code_dir...%s"
if [[ ! -e "$code_dir" ]]; then
  mkdir $code_dir
  printf "%s - Success!\n%s" $green $end
else
  printf "%s - Already created\n%s" $cyan $end
fi


#
# macOS preferences
#

printf "%s\n# Adjusting macOS...\n%s" $yellow $end
{
  # Dock
  #
  # System Preferences > Dock > Size:
  defaults write com.apple.dock tilesize -int 36
  # System Preferences > Mission Control > Automatically rearrange Spaces based on most recent use
  defaults write com.apple.dock mru-spaces -bool false
  # Clear out the dock of default icons
  defaults delete com.apple.dock persistent-apps
  defaults delete com.apple.dock persistent-others
  # Don’t show recent applications in Dock
  defaults write com.apple.dock show-recents -bool false

  # Finder
  #
  # Hide desktop icons
  defaults write com.apple.finder CreateDesktop false
  # View as columns
  defaults write com.apple.finder FXPreferredViewStyle -string "Nlsv"
  # Organise by date modified
  defaults write com.apple.finder FXArrangeGroupViewBy -string "Date Modified"
  # Show path bar
  defaults write com.apple.finder ShowPathbar -bool true
  # Finder: show status bar
  defaults write com.apple.finder ShowStatusBar -bool true
  # Set sidebar icon size to small
  defaults write NSGlobalDomain NSTableViewDefaultSizeMode -int 1
  # When performing a search, search the current folder by default
  defaults write com.apple.finder FXDefaultSearchScope -string "SCcf"
  # Prevent .DS_Store files
  defaults write com.apple.desktopservices DSDontWriteNetworkStores -bool true
  # Set Desktop as the default location for new Finder windows
  # For other paths, use `PfLo` and `file:///full/path/here/`
  defaults write com.apple.finder NewWindowTarget -string "PfDe"
  defaults write com.apple.finder NewWindowTargetPath -string "file://${HOME}/Desktop/"

  # Show all filename extensions
  defaults write NSGlobalDomain AppleShowAllExtensions -bool true

  # Show wraning before changing an extension
  defaults write com.apple.finder FXEnableExtensionChangeWarning -bool false

  # Save & Print
  #
  # Expand save and print modals by default
  defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode -bool true
  defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode2 -bool true
  defaults write NSGlobalDomain PMPrintingExpandedStateForPrint -bool true
  defaults write NSGlobalDomain PMPrintingExpandedStateForPrint2 -bool true

  # System Preferences
  #
  # Disable LCD font smoothing (default 4)
  defaults -currentHost write -globalDomain AppleFontSmoothing -int 0
  # Hot corner: Bottom right, put display to sleep
  defaults write com.apple.dock wvous-br-corner -int 10
  defaults write com.apple.dock wvous-br-modifier -int 0
  # Require password immediately after sleep or screen saver begins
  defaults write com.apple.screensaver askForPassword -int 1
  defaults write com.apple.screensaver askForPasswordDelay -int 0
  # Enable tap to click for trackpad
  defaults write com.apple.driver.AppleBluetoothMultitouch.trackpad Clicking -bool true
  # Disable keyboard autocorrect
  defaults write NSGlobalDomain NSAutomaticSpellingCorrectionEnabled -bool false
  # Disable Dashboard
  defaults write com.apple.dashboard mcx-disabled -bool true
  # Don’t show Dashboard as a Space
  defaults write com.apple.dock dashboard-in-overlay -bool true

  # Safari
  #
  # Press Tab to highlight each item on a web page
  defaults write com.apple.Safari WebKitTabToLinksPreferenceKey -bool true
  defaults write com.apple.Safari com.apple.Safari.ContentPageGroupIdentifier.WebKit2TabsToLinks -bool true
  # Show the full URL in the address bar (note: this still hides the scheme)
  defaults write com.apple.Safari ShowFullURLInSmartSearchField -bool true
  # Enable Safari’s debug menu
  defaults write com.apple.Safari IncludeInternalDebugMenu -bool true
  # Enable the Develop menu and the Web Inspector in Safari
  defaults write com.apple.Safari IncludeDevelopMenu -bool true
  defaults write com.apple.Safari WebKitDeveloperExtrasEnabledPreferenceKey -bool true
  defaults write com.apple.Safari com.apple.Safari.ContentPageGroupIdentifier.WebKit2DeveloperExtrasEnabled -bool true
  # Enable “Do Not Track”
  defaults write com.apple.Safari SendDoNotTrackHTTPHeader -bool true

  # Disable the annoying line marks in Terminal
  defaults write com.apple.Terminal ShowLineMarks -int 0

  #Ask Siri
  defaults write com.apple.Siri SiriPrefStashedStatusMenuVisible -bool false
  defaults write com.apple.Siri VoiceTriggerUserEnabled -bool false

  # Text expander shortcuts
  defaults write NSGlobalDomain NSUserDictionaryReplacementItems -array \
    '{on=1;replace=";shrug";with="¯\_(ツ)_/¯";}' \
    '{on=1;replace=";flip";with="(╯°□°)╯︵ ┻━┻";}' \
    '{on=1;replace=";->";with="→";}' \
    '{on=1;replace=";!NI";with="JW 75 58 55 D";}' \
    '{on=1;replace=";!NI";with="JW 75 58 55 D";}' \
    '{on=1;replace="cmd";with="⌘";}'

  # Restart Finder and Dock (though many changes need a restart/relog)
  killall Finder
  killall Dock

} &> /dev/null
printf "%sDone!\n%s" $green $end

printf "%s  - Installing global npm packages $code_dir...%s"
npm install -g @tailwindcss/language-server
npm install -g imageoptim-cli
npm install -g prettier
npm install -g typescript
npm install -g typescript-language-server
npm install -g eslint
npm install -g shadcn@latest

#
# All done!
#

printf "%s\nWoohoo, all done!\n%s" $green $end
