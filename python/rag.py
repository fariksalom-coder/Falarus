"""
rag.py — RAG yadrosi (umumiy mantiq).

Vektor bazadan qidirish + reranker bilan saralash + Ollama bilan javob generatsiyasi.
Ham CLI (sorov.py), ham API (app.py) shu moduldan foydalanadi — kod takrorlanmaydi.

Modellar bir marta yuklanadi (lazy singleton), shuning uchun ketma-ket so'rovlar tez.

Qidiruv-generatsiya oqimi (javob_ol):
  1) Gibrid qidiruv (vektor + BM25) — CANDIDATE_K ta nomzod.
  2) Cross-encoder reranker — nomzodlarni savol bilan birga baholaydi.
  3) Guardrail: eng yaxshi ball RERANK_THRESHOLD dan past bo'lsa -> "ma'lumot yo'q"
     (LLM chaqirilmaydi). Bu LLM'ning o'z-o'zini baholashidan ishonchliroq.
  4) Aks holda: eng yaxshi TOP_N bo'lak kontekst sifatida LLM'ga beriladi.
"""

import os
import re

import ollama
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.retrievers import BM25Retriever
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain_classic.retrievers import EnsembleRetriever

# multilingual-e5-base: 512 token kontekst, retrieval uchun kuchli, rus+o'zbek yaxshi.
# (Oldingi MiniLM-paraphrase faqat 128 token edi va uzun matnlarni kesib tashlardi.)
EMBEDDING_MODEL = "intfloat/multilingual-e5-base"
# Ko'p tilli cross-encoder reranker: o'zbekcha↔ruscha atama ko'prigini ushlaydi
# (mas. "fe'l tuslanishi" <-> "спряжение") — dense/BM25 o'zi uddalay olmasdi.
RERANKER_MODEL = "BAAI/bge-reranker-v2-m3"
VEKTOR_BAZA_PAPKA = "./vektor_baza"
# gemma2 (9B): eng sifatli javob (grammatik savollarni to'g'ri uddalaydi). Kichik
# modellar (2b/3b) grammatikada xato qildi. 9B GPU talab qiladi — CPU'da ~3 daqiqa,
# GPU'da ~2-5s. Env orqali almashtirsa bo'ladi: OLLAMA_MODEL=... uvicorn ...
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "gemma2")

CANDIDATE_K = 12  # gibrid qidiruv nechta nomzod bersin
TOP_N = 5  # reranker'dan keyin nechta bo'lak kontekstga kirsin
# Kalibrlangan chegara: to'g'ri savollar balli >=0.69, kursdan tashqari <=0.12.
# 0.3 ularni xavfsiz ajratadi.
RERANK_THRESHOLD = 0.3

# O'qituvchi personasi — ham savol-javob (javob_ol), ham dars tushuntirish
# (matn_tushuntir) shu ohangdan foydalanadi, javoblar bir xil jonli chiqadi.
TIZIM_PERSONA = (
    "Sen tajribali va samimiy rus tili o'qituvchisisan. O'zbek o'quvchilarga rus "
    "tilini o'rgatasan. Doim JONLI, TABIIY va ravon o'zbek tilida — xuddi o'quvchining "
    "yonida o'tirib, xotirjam tushuntirayotgandek — gaplashasan. Quruq, robotdek yoki "
    "so'zma-so'z tarjima qilingan g'aliz jumlalardan qoch; grammatik xatosiz, iliq va "
    "tushunarli yoz. Rus tilidagi so'z va misollarni asl holida (kirill alifbosida) keltir."
)

_vektor_db: Chroma | None = None
_ensemble: EnsembleRetriever | None = None
_cross_encoder: HuggingFaceCrossEncoder | None = None


def _yakunla(javob: str) -> str:
    """
    Javobni tozalaydi: num_predict cheklovi tufayli yarim uzilib qolgan oxirgi
    jumlani/ro'yxat bandini kesib tashlaydi, shunda foydalanuvchi tugallanmagan
    gap yoki osilgan "*" ko'rmaydi. Markdown belgilari ham olib tashlanadi
    (UI xom matnni ko'rsatadi — ** va * chiroyli chiqmaydi).
    """
    javob = (javob or "").strip()
    if not javob:
        return javob
    # Markdown urg'u/ro'yxat belgilarini soddalashtiramiz.
    javob = re.sub(r"\*\*|__|`", "", javob)
    javob = re.sub(r"(?m)^\s*[\*\-]\s+", "", javob)
    javob = javob.strip()
    # Oxiri tinish belgisi bilan tugamasa — oxirgi to'liq jumlagacha kesamiz.
    if javob and javob[-1] not in ".!?…\"»)":
        oxiri = max(javob.rfind(c) for c in ".!?…")
        if oxiri > 0:
            javob = javob[: oxiri + 1].rstrip()
    return javob


class E5Embeddings(HuggingFaceEmbeddings):
    """E5 modellari talab qiladigan 'query:' / 'passage:' prefikslarini qo'shadi."""

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return super().embed_documents([f"passage: {t}" for t in texts])

    def embed_query(self, text: str) -> list[float]:
        return super().embed_query(f"query: {text}")


def get_embeddings() -> E5Embeddings:
    """Embedding modelini yaratadi — kiritish va so'rov bir xil konfiguratsiyadan foydalanadi."""
    return E5Embeddings(model_name=EMBEDDING_MODEL)


def get_db() -> Chroma:
    """Vektor bazani (va embedding modelini) bir marta yuklaydi, keshlaydi."""
    global _vektor_db
    if _vektor_db is None:
        _vektor_db = Chroma(
            persist_directory=VEKTOR_BAZA_PAPKA,
            embedding_function=get_embeddings(),
        )
    return _vektor_db


def _build():
    """Gibrid retriever (vektor + BM25) va cross-encoder'ni bir marta quradi."""
    global _ensemble, _cross_encoder
    if _ensemble is None:
        db = get_db()
        vektor_r = db.as_retriever(search_kwargs={"k": CANDIDATE_K})

        # BM25 uchun bazadagi barcha hujjatlarni xotiraga o'qiymiz.
        stored = db.get(include=["documents", "metadatas"])
        docs = [
            Document(page_content=t, metadata=m or {})
            for t, m in zip(stored["documents"], stored["metadatas"])
        ]
        # preprocess_func: lowercase + so'zlarga ajratish. Standart BM25 katta-kichik
        # harfni farqlagani uchun "iltimos" (so'rov) va "Iltimos" (hujjat) mos kelmasdi.
        bm25_r = BM25Retriever.from_documents(
            docs, preprocess_func=lambda t: re.findall(r"\w+", t.lower())
        )
        bm25_r.k = CANDIDATE_K

        _ensemble = EnsembleRetriever(retrievers=[vektor_r, bm25_r], weights=[0.5, 0.5])
        _cross_encoder = HuggingFaceCrossEncoder(model_name=RERANKER_MODEL)
    return _ensemble, _cross_encoder


def get_retriever():
    """Modellarni oldindan yuklash uchun (app.py lifespan chaqiradi)."""
    _build()


def javob_ol(savol: str) -> dict:
    """
    Savolga darsliklar asosida javob qaytaradi.

    Qaytaradi: {"javob": str, "manbalar": list[str]}
      - javob    : AI generatsiya qilgan javob (faqat darslik asosida)
      - manbalar : javob uchun ishlatilgan darslik bo'laklari (reranker tartiblagan)
    """
    ensemble, cross_encoder = _build()

    nomzodlar = ensemble.invoke(savol)
    if not nomzodlar:
        return {"javob": "Bu haqda darslikda ma'lumot yo'q.", "manbalar": []}

    # Cross-encoder bilan qayta baholab, kamayish tartibida saralaymiz.
    ballar = cross_encoder.score([(savol, d.page_content) for d in nomzodlar])
    tartiblangan = sorted(zip(nomzodlar, ballar), key=lambda x: x[1], reverse=True)

    # Guardrail: eng yaxshi ball past bo'lsa — savol kursdan tashqari.
    if tartiblangan[0][1] < RERANK_THRESHOLD:
        return {"javob": "Bu haqda darslikda ma'lumot yo'q.", "manbalar": []}

    top = [d for d, _ in tartiblangan[:TOP_N]]
    manbalar = [d.page_content for d in top]
    kontekst = "\n\n".join(manbalar)

    # Persona system message'da: model o'zini jonli o'qituvchi kabi tutadi, quruq
    # "robot" javob emas. Kurs ichidaligini reranker chegarasi allaqachon hal qildi.
    tizim = TIZIM_PERSONA + " Faqat berilgan darslik matniga tayan, o'zingdan ma'lumot to'qima."
    foydalanuvchi = f"""Quyidagi darslik matnidan foydalanib, o'quvchining savoliga tabiiy
o'zbek tilida javob ber. MAKSIMUM 4-5 qisqa jumla. Bitta-ikkita misol yetadi.
Ro'yxat, sarlavha, yulduzcha (*) yoki markdown ISHLATMA — oddiy, jonli matn yoz.
Gapingni albatta oxirigacha yetkaz.

DARSLIK MATNI:
{kontekst}

SAVOL: {savol}"""

    response = ollama.chat(
        model=OLLAMA_MODEL,
        messages=[
            {"role": "system", "content": tizim},
            {"role": "user", "content": foydalanuvchi},
        ],
        # temperature biroz yuqori: javob jonliroq, tabiiyroq chiqadi (0 — quruq/qotib qoladi).
        # num_predict: javob uzunligini cheklaydi (uzun bemaqsad matnlarning oldini oladi).
        # num_ctx 2048: prefill tez + xotira yengil (kontekst 5 bo'lakdan iborat, sig'adi).
        options={"temperature": 0.4, "num_predict": 220, "num_ctx": 2048},
    )
    return {"javob": _yakunla(response["message"]["content"]), "manbalar": manbalar}


def matn_tushuntir(mavzu: str, matn: str, turi: str = "dars") -> dict:
    """
    Berilgan darslik materialini (retrieval'siz) jonli o'zbek tilida tushuntiradi.

    "Bu darsni/matnni tushuntir" tugmasi shu funksiyani chaqiradi: material allaqachon
    ma'lum, shuning uchun qidiruv/guardrail kerak emas — LLM to'g'ridan-to'g'ri tushuntiradi.

    turi:
      - "dars" (grammatika qoidasi): mohiyatni ayt, keyin qoidani misollar bilan ochib ber.
      - "matn" (o'qish matni): matn ruscha, mazmunini o'zbekcha so'zlab ber va qiyin
        so'z/iboralarni izohla (so'zma-so'z tarjima emas).

    Qaytaradi: {"javob": str}
    """
    matn = (matn or "").strip()
    if not matn:
        return {"javob": "Bu yerda tushuntirish uchun material topilmadi."}
    # Juda uzun matn (uzun o'qish parchasi) prefill'ni CPU'da daqiqalarга cho'zadi va
    # timeout beradi. Tushuntirish uchun boshidan ~1600 belgi yetarli.
    if len(matn) > 1600:
        matn = matn[:1600].rsplit(" ", 1)[0] + " …"

    qoida = (
        "MAKSIMUM 5 ta qisqa jumla. Ro'yxat, sarlavha, yulduzcha (*) yoki markdown "
        "ISHLATMA — oddiy, jonli matn yoz. Gapingni albatta oxirigacha yetkaz."
    )
    if turi == "matn":
        foydalanuvchi = f"""Quyida rus tilidagi o'qish matni berilgan. O'quvchiga o'zbek tilida
jonli tushuntir. {qoida} Avval matn umuman nima haqida ekanini ayt, so'ng eng muhim
1-2 jumla ma'nosini yetkaz va faqat qiyin so'zni qisqa izohla. So'zma-so'z tarjima qilma.

MATN SARLAVHASI: {mavzu or "(sarlavha yo'q)"}

RUS TILIDAGI MATN:
{matn}"""
    else:
        foydalanuvchi = f"""Quyidagi rus tili darsini o'quvchiga o'zbek tilida jonli va sodda
tushuntir. {qoida} Avval mavzu mohiyatini bir gap bilan ayt, keyin 1-2 misol ko'rsat.

DARS MAVZUSI: {mavzu or "(mavzu berilmagan)"}

DARS MATNI:
{matn}"""

    response = ollama.chat(
        model=OLLAMA_MODEL,
        messages=[
            {"role": "system", "content": TIZIM_PERSONA},
            {"role": "user", "content": foydalanuvchi},
        ],
        # temperature biroz balandroq: tushuntirish jonli chiqadi. num_predict cheklangan —
        # CPU'da ~3 token/s, shuning uchun javobni qisqa tutamiz (aks holda 3-4 daqiqa ketadi).
        # num_ctx 2048: kontekst oynasini kichraytirib prefill'ni tezlashtiramiz + xotira tejaydi.
        options={"temperature": 0.5, "num_predict": 220, "num_ctx": 2048},
    )
    return {"javob": _yakunla(response["message"]["content"])}
