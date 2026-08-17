"""
tts.py — Matnни ovozga aylantirish. Ikki dvigatel (TTS_ENGINE env bilan tanlanadi):

  - "edge" (default agar o'rnatilgan): Microsoft Edge neyron ovozlari (Azure sifati),
     API kaliti kerak emas, ONLINE. O'zbek: uz-UZ-MadinaNeural. Lotin o'zbekchani
     to'g'ridan-to'g'ri o'qiydi. Chiqish: MP3.
  - "mms": Meta MMS-TTS, OFFLINE (facebook/mms-tts-uzb-script_cyrillic + mms-tts-rus).
     O'zbek modeli kirill kutadi — lotinni kirillga o'giramiz. Chiqish: WAV.

ovoz_yarat() -> (baytlar, mime_turi).
"""

import asyncio
import io
import os
import re
import threading

ENGINE = os.environ.get("TTS_ENGINE", "mms").lower()

# Edge (neyron) ovoz nomlari — env orqali almashtirsa bo'ladi.
_EDGE_VOICE = {
    "uz": os.environ.get("EDGE_UZ_VOICE", "uz-UZ-MadinaNeural"),
    "ru": os.environ.get("EDGE_RU_VOICE", "ru-RU-SvetlanaNeural"),
}

_REPO = {
    "uz": "facebook/mms-tts-uzb-script_cyrillic",
    "ru": "facebook/mms-tts-rus",
}

_MODELS: dict[str, tuple] = {}
_LOAD_LOCK = threading.Lock()

# Lotin -> kirill (o'zbek). Digraflar avval, keyin bitta harflar.
_DIGRAF = [
    ("o‘", "ў"), ("o'", "ў"), ("g‘", "ғ"), ("g'", "ғ"),
    ("sh", "ш"), ("ch", "ч"), ("yo", "ё"), ("yu", "ю"), ("ya", "я"), ("ts", "ц"),
]
_HARF = {
    "a": "а", "b": "б", "d": "д", "e": "е", "f": "ф", "g": "г", "h": "ҳ",
    "i": "и", "j": "ж", "k": "к", "l": "л", "m": "м", "n": "н", "o": "о",
    "p": "п", "q": "қ", "r": "р", "s": "с", "t": "т", "u": "у", "v": "в",
    "x": "х", "y": "й", "z": "з", "'": "ъ", "‘": "ъ", "’": "ъ",
}


def _lotin_kirill(matn: str) -> str:
    """Lotin o'zbekchani kirillga o'giradi (kirill/tinish/raqam o'zgarmaydi)."""
    s = matn.lower()
    for lat, cyr in _DIGRAF:
        s = s.replace(lat, cyr)
    return "".join(_HARF.get(ch, ch) for ch in s)


# ---------------------------------------------------------------------------
# Edge (neyron, online) — API kaliti kerak emas.
# ---------------------------------------------------------------------------
async def _edge_baytlar(matn: str, voice: str) -> bytes:
    import edge_tts

    comm = edge_tts.Communicate(matn, voice)
    audio = bytearray()
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
    return bytes(audio)


def _edge_ovoz(matn: str, til: str) -> bytes:
    voice = _EDGE_VOICE.get(til, _EDGE_VOICE["uz"])
    return asyncio.run(_edge_baytlar(matn, voice))


def _mp3_to_wav(mp3_baytlar: bytes) -> bytes:
    """
    Edge MP3'ni WAV (16-bit PCM, mono, 24kHz) ga o'giradi. Sabab: litsenziyali
    kodeksiz brauzerlar (mas. Linux'даги Chromium) MP3'ni ijro eta olmaydi
    (MediaError kod 4), WAV/PCM esa hamma joyда ishlaydi.
    """
    import wave

    import miniaudio

    dec = miniaudio.decode(
        mp3_baytlar,
        output_format=miniaudio.SampleFormat.SIGNED16,
        nchannels=1,
        sample_rate=24000,
    )
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(24000)
        w.writeframes(dec.samples.tobytes())
    return buf.getvalue()


# ---------------------------------------------------------------------------
# MMS (offline) — modellar dangasa yuklanadi, WAV chiqaradi.
# ---------------------------------------------------------------------------
def _model(til: str):
    if til not in _MODELS:
        from transformers import AutoTokenizer, VitsModel

        with _LOAD_LOCK:
            if til not in _MODELS:
                repo = _REPO[til]
                model = VitsModel.from_pretrained(repo)
                tok = AutoTokenizer.from_pretrained(repo)
                _MODELS[til] = (model, tok)
    return _MODELS[til]


def _bolaklar(matn: str, maxlen: int = 200):
    """Matnni jumlalarga (kerak bo'lsa qismlarga) ajratadi — VITS uzun matnни uddalamaydi."""
    for jumla in re.split(r"(?<=[.!?…])\s+", matn.strip()):
        jumla = jumla.strip()
        while len(jumla) > maxlen:
            yield jumla[:maxlen]
            jumla = jumla[maxlen:]
        if jumla:
            yield jumla


def _mms_ovoz(matn: str, til: str) -> bytes:
    import numpy as np
    import scipy.io.wavfile as wav
    import torch

    if til == "uz":
        matn = _lotin_kirill(matn)
    model, tok = _model(til)
    qismlar = []
    for bolak in _bolaklar(matn):
        inp = tok(bolak, return_tensors="pt")
        with torch.no_grad():
            w = model(**inp).waveform
        qismlar.append(w.squeeze().cpu().numpy())
    if not qismlar:
        raise ValueError("ovoz yaratilmadi")
    audio = np.concatenate(qismlar)
    pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)
    buf = io.BytesIO()
    wav.write(buf, model.config.sampling_rate, pcm)
    return buf.getvalue()


def ovoz_yarat(matn: str, til: str = "uz", maxbelgi: int = 900) -> tuple[bytes, str]:
    """
    Matndan ovoz yaratadi. til: 'uz' yoki 'ru'.
    Qaytaradi: (audio_baytlari, mime_turi). Edge -> MP3, MMS -> WAV.
    """
    if til not in ("uz", "ru"):
        til = "uz"
    matn = (matn or "").strip()[:maxbelgi]
    if not matn:
        raise ValueError("bo'sh matn")

    if ENGINE == "edge":
        # Edge MP3 -> WAV (kodeksiz brauzerlar uchun universal).
        return _mp3_to_wav(_edge_ovoz(matn, til)), "audio/wav"
    return _mms_ovoz(matn, til), "audio/wav"
