from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

app = FastAPI(title="VIVITO VODER Gateway", version="1.1.0")
VODER_ROOT = Path(os.getenv("VODER_ROOT", "/opt/VODER")).resolve()
VODER_ENTRY = (VODER_ROOT / "src" / "voder.py").resolve()
RESULTS = (VODER_ROOT / "results").resolve()
TOKEN = os.getenv("VIVITO_VODER_TOKEN", "").strip()
MAX_BYTES = int(os.getenv("VIVITO_VODER_MAX_BYTES", str(25 * 1024 * 1024)))
PYTHON = os.getenv("VODER_PYTHON", "python")


def auth(authorization: Optional[str]) -> None:
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def ensure_ready() -> None:
    if not VODER_ENTRY.is_file():
        raise HTTPException(status_code=503, detail="VODER entrypoint not found")
    RESULTS.mkdir(parents=True, exist_ok=True)


def snapshot() -> set[Path]:
    if not RESULTS.exists():
        return set()
    return {p.resolve() for p in RESULTS.rglob("*") if p.is_file()}


def newest_created(before: set[Path], suffixes: tuple[str, ...]) -> Optional[Path]:
    candidates = [p.resolve() for p in RESULTS.rglob("*") if p.is_file() and p.resolve() not in before and p.suffix.lower() in suffixes]
    return max(candidates, key=lambda p: p.stat().st_mtime, default=None)


def run_voder(args: list[str], timeout_s: int = 180) -> subprocess.CompletedProcess[str]:
    ensure_ready()
    cmd = [PYTHON, str(VODER_ENTRY), *args]
    return subprocess.run(cmd, cwd=str(VODER_ROOT), shell=False, capture_output=True, text=True, timeout=timeout_s, check=False)


@app.get("/health")
def health(authorization: Optional[str] = Header(default=None)):
    auth(authorization)
    return {"ok": VODER_ENTRY.is_file(), "engine": "voder", "root": str(VODER_ROOT), "python": shutil.which(PYTHON) is not None, "capabilities": ["stt", "tts", "chat"]}


@app.post("/v1/transcribe")
async def transcribe(request: Request, language: Optional[str] = Query(default=None), authorization: Optional[str] = Header(default=None)):
    auth(authorization)
    ensure_ready()
    raw = await request.body()
    if not raw or len(raw) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Invalid media size")
    content_type = (request.headers.get("content-type") or "audio/wav").split(";")[0].lower()
    ext = {"audio/mpeg": ".mp3", "audio/mp4": ".m4a", "audio/webm": ".webm", "audio/ogg": ".ogg", "video/mp4": ".mp4", "video/webm": ".webm"}.get(content_type, ".wav")
    before = snapshot()
    started = time.time()
    with tempfile.TemporaryDirectory(prefix="vivito-voder-") as temp_dir:
        source = Path(temp_dir) / f"input{ext}"
        source.write_bytes(raw)
        args = ["stt", str(source), "timestamp", "dialogue"]
        if language:
            args += ["translate", f"(auto-{language})"]
        proc = run_voder(args)
    if proc.returncode != 0:
        raise HTTPException(status_code=502, detail="VODER transcription failed")
    created = newest_created(before, (".txt", ".json", ".srt", ".vtt"))
    text = ""
    if created:
        try:
            text = created.read_text(encoding="utf-8", errors="ignore").strip()
        except Exception:
            text = ""
    if not text:
        text = proc.stdout.strip()
    if not text:
        raise HTTPException(status_code=502, detail="VODER returned no transcript")
    return JSONResponse({"text": text[:200000], "model": "voder-stt", "latency_ms": int((time.time() - started) * 1000)})


class SynthesisRequest(BaseModel):
    text: str
    voice: Optional[str] = None


@app.post("/v1/synthesize")
def synthesize(body: SynthesisRequest, authorization: Optional[str] = Header(default=None)):
    auth(authorization)
    ensure_ready()
    text = body.text.strip()
    if not text or len(text) > 6000:
        raise HTTPException(status_code=400, detail="Invalid text")
    before = snapshot()
    voice = (body.voice or "female, professional, warm").strip()[:160]
    proc = run_voder(["tts", "script", text, "voice", voice])
    if proc.returncode != 0:
        raise HTTPException(status_code=502, detail="VODER synthesis failed")
    created = newest_created(before, (".wav", ".mp3", ".flac", ".m4a", ".ogg"))
    if not created:
        raise HTTPException(status_code=502, detail="VODER returned no audio")
    media = {".mp3": "audio/mpeg", ".flac": "audio/flac", ".m4a": "audio/mp4", ".ogg": "audio/ogg"}.get(created.suffix.lower(), "audio/wav")
    return FileResponse(str(created), media_type=media, headers={"X-Model-Id": "voder-tts"})


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: Optional[str] = None
    messages: list[ChatMessage]
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None


@app.post("/v1/chat/completions")
def chat_completions(body: ChatRequest, authorization: Optional[str] = Header(default=None)):
    auth(authorization)
    ensure_ready()
    user_text = "\n\n".join(m.content.strip() for m in body.messages if m.role in {"system", "user"} and m.content.strip()).strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="No prompt supplied")
    if len(user_text) > 30000:
        user_text = user_text[-30000:]
    before = snapshot()
    started = time.time()
    proc = run_voder(["eva", "ttt", "gen", user_text], timeout_s=240)
    if proc.returncode != 0:
        raise HTTPException(status_code=502, detail="VODER local LLM failed")
    text = proc.stdout.strip()
    if not text:
        created = newest_created(before, (".txt", ".json"))
        if created:
            try:
                raw = created.read_text(encoding="utf-8", errors="ignore").strip()
                if created.suffix.lower() == ".json":
                    parsed = json.loads(raw)
                    text = str(parsed.get("text") or parsed.get("response") or parsed.get("content") or "").strip()
                else:
                    text = raw
            except Exception:
                text = ""
    if not text:
        raise HTTPException(status_code=502, detail="VODER local LLM returned no answer")
    model = body.model or "voder-vadar-local"
    return JSONResponse({
        "id": f"voder-{int(time.time() * 1000)}",
        "object": "chat.completion",
        "model": model,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": text}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        "latency_ms": int((time.time() - started) * 1000),
    })
