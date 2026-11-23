# jarvis-linux

A private, fully local voice assistant for the Linux desktop. Say **"Hey Jarvis"** (or press a shortcut), ask a question or give a command, and hear the answer, all without sending your voice to the cloud.

- **Wake word**: "Hey Jarvis", detected offline with [openWakeWord](https://github.com/dscripka/openWakeWord)
- **Speech to text**: [Whisper](https://github.com/openai/whisper) `small.en` via [faster-whisper](https://github.com/SYSTRAN/faster-whisper), kept warm on the GPU
- **Brain**: `qwen2.5:3b` (or any model) through [Ollama](https://ollama.com)
- **Voice**: [Piper](https://github.com/rhasspy/piper) text-to-speech
- **Dictation mode**: speak and have the text typed into any window

Works on any modern Linux desktop (Wayland or X11, systemd or not). Developed on EndeavourOS with KDE Plasma and a 4 GB GTX 1650; the installer is also tested on Ubuntu and Fedora. See [Compatibility](#compatibility).

## What it can do

| You say | Jarvis |
|---|---|
| "Set volume to 40 percent" / "mute" / "brightness down" | changes it |
| "Pause" / "next song" / "play the previous track" | controls whatever media is playing (MPRIS via `playerctl`) |
| "Open Firefox" / "open dolphin" | launches the app |
| "What time is it?" / "what's the date?" | answers instantly |
| "What's the weather like?" / "will it rain tomorrow?" | answers from a live [wttr.in](https://wttr.in) forecast |
| "How are you?" / "tell me a fun fact" | short spoken chat reply (no memory between questions) |
| "Delete all my files" | refuses: only allowlisted programs can run |

## How it works

```
 "Hey Jarvis"            Meta+Space                 Meta+D
      │                      │                         │
 jarvis-wake ──────► jarvis-ctl assist          jarvis-ctl dictate
 (always listening)          │                         │
                      record one command        record phrase by phrase
                             │                         │
                      jarvis-daemon (Whisper on GPU) ◄─┘
                             │ text                    │ text
                       execute_action            typed into the
                             │                   focused window (ydotool)
            ┌────────────────┼──────────────────┐
       quick commands   time and date    everything else
       (volume, media,  (answered        → LLM via Ollama
        brightness)      directly)         (+ weather for weather questions)
            └────────────────┼──────────────────┘
                             │
                  allowlist check → run command
                             │
                  reply shown on screen + spoken by Piper
```

| Component | File | Runs as |
|---|---|---|
| Wake word listener | `bin/jarvis-wake` | `jarvis-wake.service` (user) |
| Speech-to-text daemon | `bin/jarvis-daemon` | `jarvis-daemon.service` (user), Unix socket in `$XDG_RUNTIME_DIR` |
| Assistant / dictation UI | `bin/jarvis-ctl` | launched per request (wake word or shortcut) |

### Safety

The language model never gets a shell. Its suggested command is split with `shlex` and run directly, and only if the program is on the allowlist (`ALLOWED_CMDS` in `bin/jarvis-ctl`):

- controls: `pactl`, `wpctl`, `brightnessctl` (volume/mute/brightness subcommands only), `playerctl` (play/pause/next/previous/stop), `xdg-open` (http/https URLs only)
- apps: common browsers, file managers, terminals, editors, screenshot and settings tools (KDE, GNOME, Xfce, Cinnamon, MATE), **only the ones actually installed**. Add more with `JARVIS_EXTRA_APPS`.

Anything else, including `sudo`, `rm`, absolute paths and shell syntax (`;`, `|`, `$()`, redirects), is refused.

### Privacy

- Wake word detection, transcription, the language model and the voice all run on your machine. Audio is processed in memory and never saved.
- The only network request is to wttr.in, and only when you ask about the weather (it sees your IP address, which it uses to guess your city unless you set `JARVIS_CITY`).

## Install

```bash
git clone https://github.com/Saroj-Pedada/jarvis-linux.git
cd jarvis-linux
./install.sh --deps
```

`--deps` installs the system packages with your package manager (pacman, apt, dnf or zypper, using `sudo`) and Ollama if it's missing. Leave it out if you'd rather install them yourself.

The rest needs no root. The installer:

1. installs [uv](https://docs.astral.sh/uv/) if needed and creates a Python 3.12 environment in `~/.local/share/jarvis/.venv` (your system Python version doesn't matter)
2. installs the Python packages, plus CUDA libraries if an NVIDIA GPU is found
3. downloads the "Hey Jarvis" wake word model and the Piper voice
4. installs `jarvis-ctl`, `jarvis-daemon` and `jarvis-wake` to `~/.local/bin`
5. starts the background services (systemd user services, or desktop autostart on systems without systemd)
6. adds keyboard shortcuts on GNOME, pulls the language model, and runs `jarvis-ctl doctor`

| Option | Effect |
|---|---|
| `--deps` | also install system packages and Ollama (uses sudo) |
| `--no-wake` | no always-on mic; shortcuts only |
| `--no-cuda` | CPU-only Whisper even with an NVIDIA GPU |
| `--no-ollama` | don't install Ollama or pull a model (e.g. it runs on another machine: set `JARVIS_OLLAMA_URL`) |
| `--skip-model` | don't run `ollama pull` |
| `--no-shortcuts` | don't add GNOME shortcuts |

Re-run `./install.sh` any time to update after a `git pull`. Your settings are kept.

### Keyboard shortcuts

| Desktop | How |
|---|---|
| GNOME | added automatically: `Super+J` (assist), `Super+Shift+J` (dictate) |
| KDE Plasma | System Settings → Keyboard → Shortcuts → Add New → Application → **Jarvis Assistant** / **Jarvis Dictation** |
| Others (Xfce, Cinnamon, Sway, Hyprland, …) | bind a key to `~/.local/bin/jarvis-ctl assist` and `~/.local/bin/jarvis-ctl dictate` |

Example for Sway / Hyprland:

```
bindsym $mod+j exec ~/.local/bin/jarvis-ctl assist          # sway
bind = SUPER, J, exec, ~/.local/bin/jarvis-ctl assist       # hyprland
```

### Check it works

```bash
jarvis-ctl doctor
```

This checks the mic, speaker, speech-to-text daemon, Ollama and model, voice, typing tool, volume/media/brightness control and which apps Jarvis can open, and tells you how to fix anything missing.

## Using it

- **Assist**: say "Hey Jarvis" or press your shortcut, **wait for the chime**, then speak. It stops listening after a short pause.
- **Dictate**: press the dictation shortcut and talk; each phrase is typed into the focused window. It stops after about two seconds of silence.

## Configuration

Settings live in `~/.config/jarvis/jarvis.env` (created from [`jarvis.env.example`](jarvis.env.example)). After changing them, run `systemctl --user restart jarvis-daemon jarvis-wake` (or log out and back in without systemd).

| Variable | Default | What it does |
|---|---|---|
| `JARVIS_LLM` | `qwen2.5:3b` | Ollama model for understanding and replies |
| `JARVIS_OLLAMA_URL` | `http://localhost:11434` | Ollama server |
| `JARVIS_WHISPER` | `small.en` | Whisper model on the GPU (`base.en` is faster, `distil-small.en` is a good middle ground) |
| `JARVIS_WHISPER_CPU` | `base.en` | Whisper model used when there's no NVIDIA GPU |
| `JARVIS_VOICE` | `~/.local/share/jarvis/voices/en_US-ryan-high.onnx` | Path to a Piper `.onnx` voice ([voice list](https://huggingface.co/rhasspy/piper-voices)) |
| `JARVIS_EXTRA_APPS` | *(none)* | Extra apps Jarvis may open, comma-separated, e.g. `obsidian,thunderbird` |
| `JARVIS_CITY` | *(from IP)* | City for weather questions |
| `JARVIS_WAKE_THRESHOLD` | `0.5` | Wake word sensitivity; raise if it wakes by mistake |

To try another voice: `~/.local/share/jarvis/.venv/bin/python -m piper.download_voices en_GB-alan-medium --download-dir ~/.local/share/jarvis/voices`, then point `JARVIS_VOICE` at it.

## Models and licenses

| Part | Model | Size | License |
|---|---|---|---|
| Wake word | openWakeWord `hey_jarvis_v0.1` | ~1.3 MB, CPU | Apache 2.0 (code); model CC BY-NC-SA 4.0 |
| Speech to text | Whisper `small.en` | 244M params, ~670 MB VRAM | MIT |
| Language model | `qwen2.5:3b` | ~2 GB | Qwen Research License |
| Voice | Piper `en_US-ryan-high` | ~120 MB, CPU | Piper is GPL-3.0 (used as a separate library); voice: see its model card |

On a 4 GB GPU, Whisper plus a 3B model fit with a little spill-over to the CPU. Typical timing: about 2 s to transcribe, under 1 s for the model reply.

## Troubleshooting

Start with `jarvis-ctl doctor`. Then:

```bash
journalctl --user -u jarvis-wake -u jarvis-daemon -f   # live logs (systemd)
```

- **"Hey Jarvis" doesn't respond**: the wake listener logs a status line every 30 s (`alive: mic level …, best score …`). A mic level near 0 means the mic isn't reaching it (check your default input device); a low best score while you're speaking means speak closer or lower `JARVIS_WAKE_THRESHOLD`.
- **"Couldn't reach the local model"**: check `systemctl status ollama` and `ollama list`. On CPU-only machines the first reply after loading can take a minute.
- **Dictation doesn't type**: `ydotool` needs its daemon (`systemctl --user enable --now ydotool`, or `ydotoold` on some distros) and access to `/dev/uinput`. On Sway/Hyprland, `wtype` works without that; on X11, `xdotool`.
- **The overlay doesn't appear (Ubuntu/Debian)**: install Qt's runtime libraries: `sudo apt install libxcb-cursor0 libegl1` (included in `--deps`).

## Compatibility

| | Supported |
|---|---|
| Distros | Arch / EndeavourOS / Manjaro, Debian / Ubuntu / Mint / Pop!_OS, Fedora, openSUSE; others with the [manual packages](#manual-system-packages) |
| Desktops | KDE Plasma, GNOME, Xfce, Cinnamon, MATE, Sway, Hyprland, … |
| Display | Wayland and X11 |
| Init | systemd (user services) or anything else (XDG autostart) |
| Audio | PipeWire or PulseAudio |
| GPU | NVIDIA (CUDA) for fastest Whisper; AMD/Intel/none fall back to CPU. Ollama uses AMD GPUs too via ROCm |

### Manual system packages

If you don't use `--deps`, install the equivalents of: PortAudio, `pactl` (pulseaudio-utils / libpulse) or `wpctl`, `playerctl`, `brightnessctl`, a typing tool (`ydotool`, `wtype` or `xdotool`), `wl-clipboard`/`xclip`, `curl`, the Qt xcb/EGL runtime libraries, and [Ollama](https://ollama.com/download).

## Uninstall

```bash
./uninstall.sh            # keeps the Python env and settings
./uninstall.sh --purge    # removes everything
```

## License

[MIT](LICENSE). The models are separate downloads under their own licenses (see above).
