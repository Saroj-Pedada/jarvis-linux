#!/usr/bin/env bash
# Install jarvis-linux for the current user.
#   ./install.sh [--deps] [--no-wake] [--no-cuda] [--skip-model] [--no-shortcuts]
#     --deps          also install system packages (and Ollama) with sudo
#     --no-wake       don't run the always-on "Hey Jarvis" listener
#     --no-cuda       CPU-only Whisper even if an NVIDIA GPU is present
#     --skip-model    don't run `ollama pull`
#     --no-shortcuts  don't add keyboard shortcuts (GNOME only; KDE is manual)
#     --no-ollama     don't install Ollama or pull a model (e.g. Ollama runs on another machine)
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="$HOME/.local/bin"
JARVIS_HOME="${JARVIS_HOME:-$HOME/.local/share/jarvis}"
VENV="$JARVIS_HOME/.venv"
CONF_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/jarvis"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
APP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
AUTOSTART_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/autostart"
LLM="${JARVIS_LLM:-qwen2.5:3b}"
VOICE="${JARVIS_VOICE_NAME:-en_US-ryan-high}"
PYTHON_VERSION="${JARVIS_PYTHON:-3.12}"

DEPS=0 WAKE=1 CUDA=auto PULL=1 SHORTCUTS=1 OLLAMA=1
for arg in "$@"; do
  case "$arg" in
    --deps) DEPS=1 ;;
    --no-wake) WAKE=0 ;;
    --no-cuda) CUDA=0 ;;
    --skip-model) PULL=0 ;;
    --no-shortcuts) SHORTCUTS=0 ;;
    --no-ollama) OLLAMA=0 PULL=0 ;;
    -h|--help) sed -n 2,9p "$0"; exit 0 ;;
    *) echo "Unknown option: $arg (see --help)" >&2; exit 1 ;;
  esac
done

say()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*" >&2; }
have() { command -v "$1" >/dev/null 2>&1; }
SUDO=""; [[ $EUID -ne 0 ]] && SUDO="sudo"
ORIG_PATH="$PATH"
export PATH="$BIN_DIR:$PATH"

# 1. System packages -------------------------------------------------------------
# Runtime needs: PortAudio (mic/speaker), pactl or wpctl (volume), playerctl (media),
# brightnessctl (laptops), a typing tool for dictation, Qt's X11/Wayland libraries.
if have pacman; then
  PM=pacman
  PKGS=(curl python xdg-utils portaudio libpulse playerctl brightnessctl ydotool wtype xdotool wl-clipboard xclip
        libxkbcommon xcb-util-cursor libglvnd fontconfig)
elif have apt-get; then
  PM=apt
  PKGS=(curl ca-certificates xdg-utils libportaudio2 pulseaudio-utils playerctl brightnessctl ydotool wtype xdotool
        wl-clipboard xclip libxcb-cursor0 libxkbcommon0 libxkbcommon-x11-0 libegl1 libgl1 libfontconfig1
        libdbus-1-3 libxcb-icccm4 libxcb-keysyms1 libxcb-shape0 libxcb-xinerama0)
elif have dnf; then
  PM=dnf
  PKGS=(curl xdg-utils portaudio pulseaudio-utils playerctl brightnessctl ydotool wtype xdotool wl-clipboard xclip
        xcb-util-cursor libxkbcommon libxkbcommon-x11 mesa-libEGL mesa-libGL fontconfig dbus-libs)
elif have zypper; then
  PM=zypper
  PKGS=(curl xdg-utils portaudio pulseaudio-utils playerctl brightnessctl ydotool wtype xdotool wl-clipboard xclip
        libxcb-cursor0 libxkbcommon0 libxkbcommon-x11-0 Mesa-libEGL1 Mesa-libGL1 fontconfig libdbus-1-3)
else
  PM=unknown
  PKGS=()
fi

pm_install() {  # install packages, skipping ones this distro doesn't have
  case "$PM" in
    pacman) $SUDO pacman -S --needed --noconfirm "$@" ;;
    apt)    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "$@" ;;
    dnf)    $SUDO dnf install -y "$@" ;;
    zypper) $SUDO zypper --non-interactive install --no-recommends "$@" ;;
  esac
}

if ((DEPS)); then
  if [[ $PM == unknown ]]; then
    warn "Unknown package manager; install PortAudio, pactl, playerctl, ydotool/xdotool and curl yourself."
  else
    say "Installing system packages with $PM"
    [[ $PM == apt ]] && $SUDO apt-get update -qq
    if ! pm_install "${PKGS[@]}" 2>/dev/null; then
      # Some names don't exist on every release: install one at a time and report the rest.
      skipped=()
      for p in "${PKGS[@]}"; do pm_install "$p" >/dev/null 2>&1 || skipped+=("$p"); done
      ((${#skipped[@]})) && warn "Not available here (skipped): ${skipped[*]}"
    fi
  fi
fi

# uv manages Jarvis's Python, so the distro's Python version doesn't matter.
if ! have uv; then
  have curl || { warn "curl is needed to install uv. Re-run with --deps or install curl."; exit 1; }
  say "Installing uv (Python package manager) to $BIN_DIR"
  curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="$BIN_DIR" UV_NO_MODIFY_PATH=1 sh >/dev/null
fi

if ! have ollama && ((DEPS && OLLAMA)); then
  say "Installing Ollama"
  if [[ $PM == pacman ]]; then
    if have nvidia-smi; then pm_install ollama-cuda; else pm_install ollama; fi
    $SUDO systemctl enable --now ollama || true
  else
    curl -fsSL https://ollama.com/install.sh | sh
  fi
fi

# 2. Python environment ------------------------------------------------------------
say "Setting up Python environment in $VENV"
mkdir -p "$JARVIS_HOME/voices"
[[ -x "$VENV/bin/python" ]] || uv venv --python "$PYTHON_VERSION" "$VENV"
uv pip install --python "$VENV/bin/python" -r "$REPO/requirements.txt"
uv pip install --python "$VENV/bin/python" --no-deps openwakeword
if [[ $CUDA == auto ]]; then if have nvidia-smi && nvidia-smi -L >/dev/null 2>&1; then CUDA=1; else CUDA=0; fi; fi
if ((CUDA)); then
  say "NVIDIA GPU found: installing CUDA libraries for Whisper"
  uv pip install --python "$VENV/bin/python" -r "$REPO/requirements-cuda.txt"
fi

say "Downloading the wake word model and the $VOICE voice"
"$VENV/bin/python" -c "from openwakeword.utils import download_models; download_models(model_names=['hey_jarvis'])" >/dev/null 2>&1
[[ -f "$JARVIS_HOME/voices/$VOICE.onnx" ]] ||
  "$VENV/bin/python" -m piper.download_voices "$VOICE" --download-dir "$JARVIS_HOME/voices" >/dev/null 2>&1

# 3. Scripts, launchers, config -------------------------------------------------------
say "Installing scripts to $BIN_DIR"
mkdir -p "$BIN_DIR" "$APP_DIR" "$CONF_DIR"
for f in jarvis-ctl jarvis-daemon jarvis-wake; do
  sed "1s|.*|#!$VENV/bin/python|" "$REPO/bin/$f" > "$BIN_DIR/$f.tmp"
  chmod 755 "$BIN_DIR/$f.tmp" && mv "$BIN_DIR/$f.tmp" "$BIN_DIR/$f"
done
for f in jarvis-assist jarvis-dictate; do
  sed "s|@BINDIR@|$BIN_DIR|g" "$REPO/desktop/$f.desktop.in" > "$APP_DIR/$f.desktop"
done
[[ -f "$CONF_DIR/jarvis.env" ]] || cp "$REPO/jarvis.env.example" "$CONF_DIR/jarvis.env"

# 4. Background services: systemd user units, or XDG autostart without systemd -------------
if systemctl --user show-environment >/dev/null 2>&1; then
  say "Installing and starting systemd user services"
  mkdir -p "$UNIT_DIR"
  cp "$REPO/systemd/jarvis-daemon.service" "$REPO/systemd/jarvis-wake.service" "$UNIT_DIR/"
  systemctl --user daemon-reload
  systemctl --user enable jarvis-daemon.service >/dev/null 2>&1
  systemctl --user restart jarvis-daemon.service
  if ((WAKE)); then
    systemctl --user enable jarvis-wake.service >/dev/null 2>&1
    systemctl --user restart jarvis-wake.service
  else
    systemctl --user disable --now jarvis-wake.service >/dev/null 2>&1 || true
  fi
else
  say "No systemd user session: using desktop autostart instead"
  mkdir -p "$AUTOSTART_DIR"
  services=(jarvis-daemon); ((WAKE)) && services+=(jarvis-wake)
  for s in "${services[@]}"; do
    printf '[Desktop Entry]\nType=Application\nName=%s\nExec=%s\nNoDisplay=true\nX-GNOME-Autostart-enabled=true\n' \
      "$s" "$BIN_DIR/$s" > "$AUTOSTART_DIR/$s.desktop"
    pkill -f "$BIN_DIR/$s" 2>/dev/null || true
    setsid -f "$BIN_DIR/$s" >/dev/null 2>&1 < /dev/null
  done
  ((WAKE)) || rm -f "$AUTOSTART_DIR/jarvis-wake.desktop"
fi

# 5. Keyboard shortcuts ------------------------------------------------------------------
shortcut_msg="Bind shortcuts in your desktop's keyboard settings to:
    $BIN_DIR/jarvis-ctl assist     (ask / command)
    $BIN_DIR/jarvis-ctl dictate    (type what you say)"
if ((SHORTCUTS)) && [[ "${XDG_CURRENT_DESKTOP:-}" == *GNOME* ]] && have gsettings; then
  say "Adding GNOME shortcuts: Super+J (assist), Super+Shift+J (dictate)"
  base=/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings
  list=$(gsettings get org.gnome.settings-daemon.plugins.media-keys custom-keybindings)
  for entry in "jarvis-assist|<Super>j|assist" "jarvis-dictate|<Super><Shift>j|dictate"; do
    IFS='|' read -r id key mode <<<"$entry"
    path="$base/$id/"
    schema="org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$path"
    gsettings set "$schema" name "Jarvis $mode"
    gsettings set "$schema" command "$BIN_DIR/jarvis-ctl $mode"
    gsettings set "$schema" binding "$key"
    if [[ $list != *"$path"* ]]; then
      if [[ $list == "@as []" || $list == "[]" ]]; then list="['$path']"; else list="${list%]}, '$path']"; fi
    fi
  done
  gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings "$list"
  shortcut_msg="Shortcuts: Super+J (assist), Super+Shift+J (dictate). Change them in Settings -> Keyboard."
elif [[ "${XDG_CURRENT_DESKTOP:-}" == *KDE* ]]; then
  shortcut_msg="Bind shortcuts: System Settings -> Keyboard -> Shortcuts -> Add New -> Application,
  then pick \"Jarvis Assistant\" (e.g. Meta+Space) and \"Jarvis Dictation\" (e.g. Meta+D)."
fi

# 6. Language model ------------------------------------------------------------------------
if ((PULL)); then
  if have ollama; then
    say "Pulling language model $LLM (skip with --skip-model)"
    ollama pull "$LLM" || warn "Couldn't pull $LLM. Is Ollama running? (sudo systemctl enable --now ollama)"
  else
    warn "Ollama isn't installed: re-run with --deps, or see https://ollama.com/download"
  fi
fi

# 7. Check ------------------------------------------------------------------------------------
say "Checking the installation (first start downloads the Whisper model, this can take a minute)"
SOCK="${JARVIS_SOCK:-${XDG_RUNTIME_DIR:-/tmp}/jarvis.sock}"
for _ in $(seq 180); do [[ -S "$SOCK" ]] && break; sleep 1; done
"$BIN_DIR/jarvis-ctl" doctor || true

cat <<EOF

$shortcut_msg
$( ((WAKE)) && echo 'Or just say "Hey Jarvis" and wait for the chime.' )
Settings: $CONF_DIR/jarvis.env      Check again: jarvis-ctl doctor
EOF
case ":$ORIG_PATH:" in *":$HOME/.local/bin:"*) ;; *) warn "$HOME/.local/bin is not on your PATH; add it to use jarvis-ctl directly." ;; esac
