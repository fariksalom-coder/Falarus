# FalaRus RAG API

O'zbek tilida so'zlaydigan, **haqiqiy 182 kunlik darsliklaringiz** asosida rus tili o'rgatadigan
offline AI o'qituvchi. Retrieval-Augmented Generation (RAG): AI faqat sizning kursingiz asosida
javob beradi, "to'qib chiqarmaydi".

## Arxitektura

```
Savol
  │
  ├─▶ 1) Gibrid qidiruv (vektor e5-base + BM25)  → 12 nomzod
  ├─▶ 2) Cross-encoder reranker (bge-reranker-v2-m3) → qayta saralash
  ├─▶ 3) Guardrail: eng yaxshi ball < 0.3 bo'lsa → "ma'lumot yo'q" (kursdan tashqari)
  └─▶ 4) Ollama (gemma2:9b) → top 5 bo'lak asosida o'zbekcha javob
```

## Fayllar

| Fayl | Vazifasi |
|---|---|
| `sql_kirit.py` | Supabase SQL eksportlarini o'qib, kun bo'yicha guruhlab Chroma bazasiga yuklaydi |
| `rag.py` | Yadro: embeddings, gibrid retriever, reranker, guardrail, javob generatsiyasi |
| `sorov.py` | CLI: terminaldan savol berish |
| `app.py` | FastAPI: `POST /savol` → `{javob, manbalar}` |
| `chat.py` | Oddiy Ollama yordamchisi (RAGsiz) |

## O'rnatish

```bash
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
```

Ollama va modellar kerak:
```bash
ollama pull gemma2        # generatsiya (9B — GPU tavsiya etiladi)
# embedding (e5-base) va reranker (bge-reranker-v2-m3) ilk ishga tushishda avtomatik yuklanadi
```

## Ishlatish

```bash
# 1. Bazani qurish (darsliklar o'zgarganda qayta):
SQL_DIR=/path/to/sql ./venv/bin/python sql_kirit.py

# 2a. CLI orqali sinash:
./venv/bin/python sorov.py "Rus tilida o'tgan zamon qanday yasaladi?"

# 2b. API serverni ishga tushirish:
./venv/bin/uvicorn app:app --port 8000
curl -X POST http://localhost:8000/savol -H "Content-Type: application/json" \
     -d '{"savol": "Rus tilida vaqtga qarab qanday salomlashiladi?"}'
```

## ⚠️ MUHIM: GPU talabi

Generatsiya modeli `gemma2:9b` sifat uchun tanlangan (kichik modellar rus grammatikasini
buzadi). Lekin 9B model **GPU talab qiladi**:

- **CPU'da:** ~1-3 daqiqa/javob — faqat sinov/demo uchun.
- **GPU'da:** ~2-5 soniya/javob — prod uchun.

Modelni env orqali almashtirsa bo'ladi:
```bash
OLLAMA_MODEL=llama3.2:3b ./venv/bin/uvicorn app:app --port 8000
```

## FalaRus (Express) backendiga ulash

`server/services/ragService.ts` orqali `POST /savol` chaqiriladi. `RAG_API_URL` env
o'zgaruvchisi bilan API manzili beriladi. Batafsil integratsiya kodi loyihada.
