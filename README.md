# jarvis-linux

A private, fully local voice assistant for the Linux desktop. Say **"Hey Jarvis"** (or press a shortcut), ask a question or give a command, and hear the answer, all without sending your voice to the cloud.

- **Wake word**: "Hey Jarvis", detected offline with [openWakeWord](https://github.com/dscripka/openWakeWord)
- **Speech to text**: [Whisper](https://github.com/openai/whisper) `small.en` via [faster-whisper](https://github.com/SYSTRAN/faster-whisper), kept warm on the GPU
- **Brain**: `qwen2.5:3b` (or any model) through [Ollama](https://ollama.com)
- **Voice**: [Piper](https://github.com/rhasspy/piper) text-to-speech
- **Dictation mode**: speak and have the text typed into any window

Built and tested on EndeavourOS (Arch) with KDE Plasma on Wayland and a 4 GB GTX 1650. Other distros and desktops should work with small changes; see [Compatibility](#compatibility).

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

`pactl`, `wpctl`, `brightnessctl` (volume/mute/brightness subcommands only), `playerctl` (play/pause/next/previous/stop), `xdg-open` (http/https URLs only), `firefox`, `dolphin`, `konsole`, `kate`, `spectacle`, `systemsettings`.

Anything else, including `sudo`, `rm`, absolute paths and shell syntax (`;`, `|`, `$()`, redirects), is refused.

### Privacy

- Wake word detection, transcription, the language model and the voice all run on your machine. Audio is processed in memory and never saved.
- The only network request is to wttr.in, and only when you ask about the weather (it sees your IP address, which it uses to guess your city unless you set `JARVIS_CITY`).

## Install

### 1. System packages

Arch / EndeavourOS:

```bash
sudo pacman -S python uv ollama alsa-utils libpulse ydotool wl-clipboard playerctl brightnessctl
yay -S piper-tts-bin piper-voices-minimal        # AUR
# NVIDIA GPU: use ollama-cuda instead of ollama for fast replies
sudo systemctl enable --now ollama
systemctl --user enable --now ydotool             # needed for dictation typing
```

### 2. Jarvis

```bash
git clone https://github.com/<you>/jarvis-linux.git
cd jarvis-linux
./install.sh
```

The installer (no root needed) creates a Python environment in `~/.local/share/jarvis/.venv`, installs the scripts to `~/.local/bin`, downloads the wake word model, starts the user services and pulls the language model.

Options: `--no-wake` (shortcuts only, no always-on mic), `--no-cuda` (CPU-only Whisper), `--skip-model` (don't run `ollama pull`).

### 3. Keyboard shortcuts (optional)

KDE: **System Settings → Keyboard → Shortcuts → Add New → Application**, then pick **Jarvis Assistant** (e.g. `Meta+Space`) and **Jarvis Dictation** (e.g. `Meta+D`).

## Using it

- **Assist**: say "Hey Jarvis" or press your shortcut, **wait for the chime**, then speak. It stops listening after a short pause.
- **Dictate**: press the dictation shortcut and talk; each phrase is typed into the focused window. It stops after about two seconds of silence.

## Configuration

Settings live in `~/.config/jarvis/jarvis.env` (created from [`jarvis.env.example`](jarvis.env.example)). After changing them, run `systemctl --user restart jarvis-daemon jarvis-wake`.

| Variable | Default | What it does |
|---|---|---|
| `JARVIS_LLM` | `qwen2.5:3b` | Ollama model for understanding and replies |
| `JARVIS_OLLAMA_URL` | `http://localhost:11434` | Ollama server |
| `JARVIS_WHISPER` | `small.en` | Whisper model (`base.en` is faster, `distil-small.en` is a good middle ground) |
| `JARVIS_VOICE` | Piper `en_US-ryan-high` | Path to a Piper `.onnx` voice |
| `JARVIS_CITY` | *(from IP)* | City for weather questions |
| `JARVIS_WAKE_THRESHOLD` | `0.5` | Wake word sensitivity; raise if it wakes by mistake |

To allow more programs, edit `ALLOWED_CMDS` in `bin/jarvis-ctl` and re-run `./install.sh`.

## Models and licenses

| Part | Model | Size | License |
|---|---|---|---|
| Wake word | openWakeWord `hey_jarvis_v0.1` | ~1.3 MB, CPU | Apache 2.0 (code); model CC BY-NC-SA 4.0 |
| Speech to text | Whisper `small.en` | 244M params, ~670 MB VRAM | MIT |
| Language model | `qwen2.5:3b` | ~2 GB | Qwen Research License |
| Voice | Piper `en_US-ryan-high` | ~120 MB, CPU | see the voice's model card |

On a 4 GB GPU, Whisper plus a 3B model fit with a little spill-over to the CPU. Typical timing: about 2 s to transcribe, under 1 s for the model reply.

## Troubleshooting

```bash
journalctl --user -u jarvis-wake -u jarvis-daemon -f   # live logs
```

- **"Hey Jarvis" doesn't respond**: the wake listener logs a status line every 30 s (`alive: mic level …, best score …`). A mic level near 0 means the mic isn't reaching it (check your default input in system settings); a low best score while you're speaking means try speaking closer or lower `JARVIS_WAKE_THRESHOLD`.
- **"Couldn't reach the local model"**: check `systemctl status ollama` and that the model is pulled (`ollama list`). On CPU-only machines the first reply after loading can take a minute.
- **Dictation doesn't type**: make sure `ydotool` is running (`systemctl --user status ydotool`).

## Compatibility

- **Desktop**: the shortcut files and default allowlisted apps are KDE-specific (`dolphin`, `konsole`, `kate`, …). On GNOME, add `nautilus`, `gnome-terminal` etc. to `ALLOWED_CMDS` and bind shortcuts to `~/.local/bin/jarvis-ctl assist`.
- **Audio**: needs PipeWire or PulseAudio (`pactl`).
- **GPU**: optional. Without NVIDIA, Whisper falls back to `base.en` on the CPU.

## Uninstall

```bash
./uninstall.sh            # keeps the Python env and settings
./uninstall.sh --purge    # removes everything
```

## License

[MIT](LICENSE). The models are separate downloads under their own licenses (see above).
