#!/usr/bin/env bash
# Remove jarvis-linux for the current user.
#   ./uninstall.sh [--purge]   (--purge also deletes the Python env, voices and your settings)
set -euo pipefail

JARVIS_HOME="${JARVIS_HOME:-$HOME/.local/share/jarvis}"
CONF="${XDG_CONFIG_HOME:-$HOME/.config}"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"

if systemctl --user show-environment >/dev/null 2>&1; then
  systemctl --user disable --now jarvis-wake.service jarvis-daemon.service 2>/dev/null || true
  rm -f "$CONF/systemd/user/jarvis-wake.service" "$CONF/systemd/user/jarvis-daemon.service"
  systemctl --user daemon-reload
fi
pkill -f "$HOME/.local/bin/jarvis-wake" 2>/dev/null || true
pkill -f "$HOME/.local/bin/jarvis-daemon" 2>/dev/null || true
rm -f "$CONF/autostart/jarvis-daemon.desktop" "$CONF/autostart/jarvis-wake.desktop"
rm -f "$HOME/.local/bin/jarvis-ctl" "$HOME/.local/bin/jarvis-daemon" "$HOME/.local/bin/jarvis-wake"
rm -f "$DATA/applications/jarvis-assist.desktop" "$DATA/applications/jarvis-dictate.desktop"

# GNOME shortcuts added by install.sh
if command -v gsettings >/dev/null 2>&1 &&
   gsettings list-schemas 2>/dev/null | grep -qx org.gnome.settings-daemon.plugins.media-keys; then
  base=/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings
  list=$(gsettings get org.gnome.settings-daemon.plugins.media-keys custom-keybindings)
  for id in jarvis-assist jarvis-dictate; do
    gsettings reset-recursively "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$base/$id/" 2>/dev/null || true
    list=$(sed -e "s|, '$base/$id/'||; s|'$base/$id/', ||; s|'$base/$id/'||" <<<"$list")
  done
  [[ $list == "[]" ]] && list="@as []"
  gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings "$list" 2>/dev/null || true
fi

if [[ "${1:-}" == --purge ]]; then
  rm -rf "$JARVIS_HOME" "$CONF/jarvis"
  echo "Removed Jarvis, its Python environment, voices and settings."
else
  echo "Removed Jarvis. Kept $JARVIS_HOME and $CONF/jarvis (use --purge to delete them)."
fi
echo "Ollama and its models are untouched; remove the model with: ollama rm ${JARVIS_LLM:-qwen2.5:3b}"
