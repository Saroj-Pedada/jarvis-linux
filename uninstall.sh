#!/usr/bin/env bash
# Remove jarvis-linux for the current user.
#   ./uninstall.sh [--purge]   (--purge also deletes the Python env and your settings)
set -euo pipefail

JARVIS_HOME="${JARVIS_HOME:-$HOME/.local/share/jarvis}"

systemctl --user disable --now jarvis-wake.service jarvis-daemon.service 2>/dev/null || true
rm -f "$HOME/.config/systemd/user/jarvis-wake.service" "$HOME/.config/systemd/user/jarvis-daemon.service"
systemctl --user daemon-reload
rm -f "$HOME/.local/bin/jarvis-ctl" "$HOME/.local/bin/jarvis-daemon" "$HOME/.local/bin/jarvis-wake"
rm -f "$HOME/.local/share/applications/jarvis-assist.desktop" "$HOME/.local/share/applications/jarvis-dictate.desktop"

if [[ "${1:-}" == --purge ]]; then
  rm -rf "$JARVIS_HOME" "$HOME/.config/jarvis"
  echo "Removed Jarvis, its Python environment and settings."
else
  echo "Removed Jarvis. Kept $JARVIS_HOME and ~/.config/jarvis (use --purge to delete them)."
fi
echo "Ollama models are untouched; remove one with: ollama rm qwen2.5:3b"
