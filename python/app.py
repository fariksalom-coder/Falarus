"""
app.py — FalaRus RAG API (FastAPI).

RAG mantig'ini HTTP endpoint sifatida ochadi, shunda FalaRus backend/frontend
uni chaqira oladi. Embedding modeli va vektor bazasi server ishga tushganda
BIR MARTA yuklanadi (lifespan), keyingi so'rovlar tez ishlaydi.

Ishga tushirish:
    ./venv/bin/uvicorn app:app --reload --port 8000

Sinash:
    curl -X POST http://localhost:8000/savol \
         -H "Content-Type: application/json" \
         -d '{"savol": "Rus tilida o'\''tgan zamon qanday yasaladi?"}'
"""

import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import cache
from rag import get_retriever, javob_ol, matn_tushuntir
from tts import ENGINE as TTS_ENGINE, ovoz_yarat

# gemma2:9b bu 4 yadroli serverда bir vaqtда faqat BITTA javob yoza oladi (generatsiya
# barcha yadroni band qiladi). Shuning uchun so'rovlarni navbatga solamiz: bir vaqtда
# 1 tasi ishlaydi. Agar navbat 80 soniyaда bo'shamasa — "band" (503) qaytaramiz, shunda
# foydalanuvchi 3 daqiqa osilib timeout ko'rmaydi, balki aniq "qayta urining" xabarini oladi.
_AI_GATE = threading.Semaphore(1)
_GATE_TIMEOUT_S = 80


def _navbat_bilan(fn, *args):
    band_emas = _AI_GATE.acquire(timeout=_GATE_TIMEOUT_S)
    if not band_emas:
        raise HTTPException(status_code=503, detail="AI hozir band, biroz kutib qayta urinib ko'ring")
    try:
        return fn(*args)
    finally:
        _AI_GATE.release()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Server ishga tushganda embedding modeli + baza + BM25 retriever'ni
    # oldindan yuklaymiz, shunda birinchi so'rov ham tez bo'ladi.
    print("Vektor baza, embedding modeli va gibrid retriever yuklanmoqda...")
    get_retriever()
    print("Tayyor. API ishlayapti.")
    yield


app = FastAPI(title="FalaRus RAG API", version="1.0.0", lifespan=lifespan)

# FalaRus frontend (Vite dev / Vercel) boshqa origin'dan chaqiradi — CORS kerak.
# Ishlab chiqarishda allow_origins ni aniq domenlaringiz bilan cheklang.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev
        "http://localhost:3000",  # Express dev
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SavolRequest(BaseModel):
    savol: str = Field(..., min_length=1, description="O'quvchining savoli")


class JavobResponse(BaseModel):
    javob: str
    manbalar: list[str]


class TushuntirRequest(BaseModel):
    mavzu: str = Field("", description="Dars mavzusi/sarlavhasi (ixtiyoriy)")
    matn: str = Field(..., min_length=1, description="Tushuntiriladigan material")
    turi: str = Field("dars", description="'dars' (grammatika) yoki 'matn' (o'qish matni)")
    faqat_kesh: bool = Field(
        False,
        description="True: faqat keshdan ber, bo'lmasa 204 (hisoblamaydi). Avto-ko'rsatish uchun.",
    )


class TushuntirResponse(BaseModel):
    javob: str


@app.get("/")
def health():
    return {"status": "ok", "service": "FalaRus RAG API"}


@app.post("/savol", response_model=JavobResponse)
def savol(req: SavolRequest):
    return _navbat_bilan(javob_ol, req.savol)


@app.post("/tushuntir", response_model=TushuntirResponse)
def tushuntir(req: TushuntirRequest):
    # Kesh: shu dars uchun tushuntirish oldin hisoblangan bo'lsa — darrov qaytaramiz.
    key = cache.kalit("tushuntir", req.turi, req.mavzu.strip(), req.matn.strip())
    keshda = cache.matn_ol(key)
    if keshda is not None:
        return {"javob": keshda}
    if req.faqat_kesh:
        # Keshda yo'q va hisoblash so'ralmagan — 204 (avto-ko'rsatish tugmani qoldiradi).
        return Response(status_code=204)
    # Retrieval'siz: material allaqachon ma'lum, LLM shuni tushuntiradi.
    natija = _navbat_bilan(matn_tushuntir, req.mavzu, req.matn, req.turi)
    cache.matn_saqla(key, natija["javob"])
    return natija


class OvozRequest(BaseModel):
    matn: str = Field(..., min_length=1, description="O'qiladigan matn")
    til: str = Field("uz", description="'uz' (o'zbek) yoki 'ru' (rus)")


@app.post("/ovoz")
def ovoz(req: OvozRequest):
    # Kesh: shu matn ovozi oldin yaratilgan bo'lsa — darrov qaytaramiz.
    key = cache.kalit("ovoz", req.til, req.matn.strip())
    keshda = cache.audio_ol(key)
    if keshda is not None:
        data, mime = keshda
        return Response(content=data, media_type=mime)

    if TTS_ENGINE == "edge":
        # Edge — online, CPU yengil: navbatga solmaymiz, tinglash tez bo'lsin.
        data, mime = ovoz_yarat(req.matn, req.til)
    else:
        # MMS — offline, CPU'ni band qiladi: LLM bilan bitta navbatда serialize.
        data, mime = _navbat_bilan(ovoz_yarat, req.matn, req.til)
    cache.audio_saqla(key, data, mime)
    return Response(content=data, media_type=mime)
