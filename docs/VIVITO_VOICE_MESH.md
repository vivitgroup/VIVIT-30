# VIVITO Voice Mesh

VIVITO's voice layer is intentionally separate from the reasoning/ERP/action brain.

## Runtime order

1. **VODER sidecar** — richest offline media pipeline: STT, TTS, dubbing, voice conversion, separation, enhancement and chained workflows.
2. **Vox** — low-latency local voice runtime with REST/WebSocket APIs for STT/TTS and live talk.
3. **audio.cpp** — portable C++ fallback with OpenAI-compatible speech/transcription endpoints and broad GGUF audio-model support.

The Next.js app never shells out to VODER. It calls a private sidecar over HTTPS. The VODER gateway is the only process allowed to invoke the VODER CLI and it uses argument arrays with `shell=False`.

## Vercel / app environment

```bash
# Preferred local/GPU sidecar
VIVITO_VODER_URL=https://voice.example.internal
VIVITO_VODER_TOKEN=<random service token>

# Optional live/streaming fallback
VIVITO_VOX_URL=https://vox.example.internal

# Optional portable fallback
VIVITO_AUDIOCPP_URL=https://audio.example.internal
VIVITO_AUDIOCPP_ASR_MODEL=qwen3-asr
VIVITO_AUDIOCPP_TTS_MODEL=pocket-tts
```

Provider order is VODER -> Vox -> audio.cpp. A provider failure falls through to the next configured provider.

## App API

Authenticated VIVIT sessions can use:

- `GET /api/vgroup/vivito/voice` — provider health/status.
- `POST /api/vgroup/vivito/voice` with multipart form data (`op=transcribe`, `file=<audio/video>`, optional `language`) — transcription.
- `POST /api/vgroup/vivito/voice` JSON `{ "op":"synthesize", "text":"...", "voice":"..." }` — speech synthesis. The response is audio bytes.

The route rejects unsupported MIME types, limits uploaded media to 25 MB, never accepts arbitrary filesystem paths, and keeps responses private/no-store.

## VODER sidecar

Install VODER on a machine with enough CPU/GPU/RAM. Then run the gateway from this repository:

```bash
cd services/vivito-voder-gateway
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt

export VODER_ROOT=/opt/VODER
export VIVITO_VODER_TOKEN='<random token>'
uvicorn server:app --host 0.0.0.0 --port 8787
```

Put the service behind TLS/private networking before connecting production VIVITO.

## Why not run VODER inside Vercel?

VODER is a Python/model/FFmpeg workload and can require large model downloads, GPU acceleration and long-running processing. It should run as a dedicated local or GPU worker, while Vercel remains the authenticated orchestration layer.

## What this does not replace

The voice mesh does **not** replace the live LLM provider, ERP grounding, conversation memory or governed action engine. Voice input should become text, then flow through the same VIVITO brain and RBAC/action path. Spoken output is only a presentation layer over the final authorized answer.

## Next production steps

- Deploy one VODER gateway worker.
- Deploy Vox and/or audio.cpp as fallback workers if desired.
- Add microphone/recording controls to the VIVITO web UI.
- Feed transcribed voice into the existing `/api/vgroup/vivito/chat` route.
- Optionally synthesize the final answer back to audio.
- Add end-to-end tests: voice -> transcript -> ERP reasoning -> governed action -> spoken response.
