#!/usr/bin/env bash
# Install jarvis-linux for the current user (no root needed).
#   ./install.sh [--no-wake] [--no-cuda] [--skip-model]
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="$HOME/.local/bin"
JARVIS_HOME="${JARVIS_HOME:-$HOME/.local/share/jarvis}"
VENV="$JARVIS_HOME/.venv"
UNIT_DIR="$HOME/.config/systemd/user"
APP_DIR="$HOME/.local/share/applications"
CONF_DIR="$HOME/.config/jarvis"
LLM="${JARVIS_LLM:-qwen2.5:3b}"

WAKE=1 CUDA=auto PULL=1
for arg in "$@"; do
  case "$arg" in
    --no-wake) WAKE=0 ;;
    --no-cuda) CUDA=0 ;;
    --skip-model) PULL=0 ;;
    -h|--help) sed -n 2,3p "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

say()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*"; }

# 1. System tools --------------------------------------------------------------
say "Checking system tools"
missing=()
for cmd in python3 uv ollama piper-tts aplay pactl ydotool wl-copy playerctl brightnessctl; do
  command -v "$cmd" >/dev/null || missing+=("$cmd")
done
if ((${#missing[@]})); then
  warn "Missing: ${missing[*]}"
  warn "Arch/EndeavourOS: sudo pacman -S python uv ollama alsa-utils libpulse ydotool wl-clipboard playerctl brightnessctl"
  warn "                  yay -S piper-tts-bin piper-voices-minimal   (AUR)"
  [[ " ${missing[*]} " == *" uv "* || " ${missing[*]} " == *" python3 "* ]] && { warn "python3 and uv are required."; exit 1; }
  warn "Continuing; features that need the missing tools won't work until you install them."
fi

# 2. Python environment ---------------------------------------------------------
say "Setting up Python environment in $VENV"
mkdir -p "$JARVIS_HOME"
[[ -x "$VENV/bin/python" ]] || uv venv "$VENV"
uv pip install --python "$VENV/bin/python" -r "$REPO/requirements.txt"
uv pip install --python "$VENV/bin/python" --no-deps openwakeword
if [[ "$CUDA" == auto ]]; then command -v nvidia-smi >/dev/null && CUDA=1 || CUDA=0; fi
if [[ "$CUDA" == 1 ]]; then
  say "NVIDIA GPU found: installing CUDA libraries for Whisper"
  uv pip install --python "$VENV/bin/python" -r "$REPO/requirements-cuda.txt"
fi
say "Downloading the 'Hey Jarvis' wake word model"
"$VENV/bin/python" -c "from openwakeword.utils import download_models; download_models(model_names=['hey_jarvis'])" >/dev/null

# 3. Scripts, shortcuts, config ---------------------------------------------------
say "Installing scripts to $BIN_DIR"
mkdir -p "$BIN_DIR" "$APP_DIR" "$CONF_DIR" "$UNIT_DIR"
for f in jarvis-ctl jarvis-daemon jarvis-wake; do
  sed "1s|.*|#!$VENV/bin/python|" "$REPO/bin/$f" > "$BIN_DIR/$f"
  chmod 755 "$BIN_DIR/$f"
done
for f in jarvis-assist jarvis-dictate; do
  sed "s|@BINDIR@|$BIN_DIR|g" "$REPO/desktop/$f.desktop.in" > "$APP_DIR/$f.desktop"
done
[[ -f "$CONF_DIR/jarvis.env" ]] || cp "$REPO/jarvis.env.example" "$CONF_DIR/jarvis.env"

# 4. Services ---------------------------------------------------------------------
say "Installing and starting user services"
cp "$REPO/systemd/jarvis-daemon.service" "$REPO/systemd/jarvis-wake.service" "$UNIT_DIR/"
systemctl --user daemon-reload
systemctl --user enable jarvis-daemon.service >/dev/null
systemctl --user restart jarvis-daemon.service
if ((WAKE)); then
  systemctl --user enable jarvis-wake.service >/dev/null
  systemctl --user restart jarvis-wake.service
else
  systemctl --user disable --now jarvis-wake.service >/dev/null 2>&1 || true
fi

# 5. Language model ---------------------------------------------------------------
if ((PULL)) && command -v ollama >/dev/null; then
  say "Pulling language model $LLM (skip with --skip-model)"
  ollama pull "$LLM" || warn "Couldn't pull $LLM; is the ollama service running? (sudo systemctl enable --now ollama)"
fi

cat <<EOF

Done. Last step: bind keyboard shortcuts in KDE.
  System Settings -> Keyboard -> Shortcuts -> Add New -> Application
    "Jarvis Assistant"  (e.g. Meta+Space)
    "Jarvis Dictation"  (e.g. Meta+D)
$( ((WAKE)) && echo 'Or just say "Hey Jarvis".' )
Settings: $CONF_DIR/jarvis.env    Logs: journalctl --user -u jarvis-wake -u jarvis-daemon -f
EOF
