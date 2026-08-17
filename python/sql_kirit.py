"""
sql_kirit.py — Haqiqiy darsliklarni (Supabase SQL eksport) Vektor Bazaga yuklash.

8 ta jadval faylini o'qiydi, char-level ishonchli parser bilan qatorlarni
ajratadi, ma'lumotni KUN bo'yicha guruhlab, metadata (kun, tur, manba) bilan
Chroma bazasiga joylaydi. Eski baza o'chirilib, yangidan quriladi.

Ishlatish:
    ./venv/bin/python sql_kirit.py
    SQL_DIR=/boshqa/papka ./venv/bin/python sql_kirit.py
"""

import os
import shutil
from collections import defaultdict

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma

from rag import VEKTOR_BAZA_PAPKA, get_embeddings

SQL_DIR = os.environ.get("SQL_DIR", "/home/user/Downloads")

FILES = {
    "grammar_topics": "daily_grammar_topics_rows.sql",
    "vocab": "daily_vocab_words_rows.sql",
    "reading": "daily_reading_passages_rows.sql",
    "practice": "daily_practice_prompts_rows.sql",
    "matches": "daily_grammar_matches_rows.sql",
    "mcqs": "daily_grammar_mcqs_rows.sql",
    "sentence_arrange": "daily_grammar_sentence_arrange_rows (2).sql",
    "lexemes": "daily_reading_lexemes_rows.sql",
}


# ---------------------------------------------------------------------------
# SQL INSERT parser (char-level, ishonchli)
# ---------------------------------------------------------------------------
def _parse_value(sql: str, i: int):
    """Bitta qiymatni o'qiydi: 'string', ARRAY[...], null yoki raqam/token."""
    c = sql[i]
    if c == "'":  # single-quoted string, '' -> ' escape
        i += 1
        buf = []
        while i < len(sql):
            if sql[i] == "'":
                if i + 1 < len(sql) and sql[i + 1] == "'":
                    buf.append("'")
                    i += 2
                    continue
                i += 1
                break
            buf.append(sql[i])
            i += 1
        return "".join(buf), i
    if sql.startswith("ARRAY[", i):
        i += len("ARRAY[")
        arr = []
        while i < len(sql):
            while sql[i] in " \t\r\n":
                i += 1
            if sql[i] == "]":
                i += 1
                break
            if sql[i] == ",":
                i += 1
                continue
            val, i = _parse_value(sql, i)
            arr.append(val)
        return arr, i
    if sql[i : i + 4].lower() == "null":
        return None, i + 4
    # raqam yoki boshqa token: vergul/qavs/qavsgacha o'qiymiz
    j = i
    while j < len(sql) and sql[j] not in ",)]":
        j += 1
    return sql[i:j].strip(), j


def _parse_tuple(sql: str, i: int):
    """sql[i] == '(' ; qiymatlar ro'yxatini va keyingi indeksni qaytaradi."""
    i += 1  # '(' dan o'tamiz
    values = []
    while i < len(sql):
        while sql[i] in " \t\r\n":
            i += 1
        if sql[i] == ")":
            return values, i + 1
        val, i = _parse_value(sql, i)
        values.append(val)
        while i < len(sql) and sql[i] in " \t\r\n":
            i += 1
        if i < len(sql) and sql[i] == ",":
            i += 1
    return values, i


def parse_insert(path: str) -> list[dict]:
    """SQL faylni o'qib, har bir qatorni {ustun: qiymat} dict qilib qaytaradi."""
    with open(path, encoding="utf-8") as f:
        sql = f.read()

    lpar = sql.index("(")
    rpar = sql.index(")", lpar)
    cols = [c.strip().strip('"') for c in sql[lpar + 1 : rpar].split(",")]

    i = sql.index("VALUES", rpar) + len("VALUES")
    rows = []
    while i < len(sql):
        while i < len(sql) and sql[i] in " \t\r\n,":
            i += 1
        if i >= len(sql) or sql[i] != "(":
            break
        vals, i = _parse_tuple(sql, i)
        rows.append(dict(zip(cols, vals)))
    return rows


def path(key: str) -> str:
    return os.path.join(SQL_DIR, FILES[key])


# ---------------------------------------------------------------------------
# Har bir jadvaldan Document'lar quramiz (kun bo'yicha guruhlab)
# ---------------------------------------------------------------------------
def _group_by_day(rows, key="day_number"):
    groups = defaultdict(list)
    for r in rows:
        groups[int(r[key])].append(r)
    return dict(sorted(groups.items()))


def build_documents() -> list[Document]:
    docs: list[Document] = []

    # 1. Grammatika nazariyasi — kun boshiga bitta hujjat (eng qimmatli)
    for r in parse_insert(path("grammar_topics")):
        day = int(r["day_number"])
        content = f"Kun {day} — Grammatika mavzusi: {r['title']}\n\n{(r['theory_text'] or '').strip()}"
        docs.append(Document(page_content=content,
                             metadata={"kun": day, "tur": "grammatika"}))

    # 2. Lug'at — kun boshiga bitta hujjat
    for day, items in _group_by_day(parse_insert(path("vocab"))).items():
        items.sort(key=lambda r: int(r["sort_order"]))
        lines = "\n".join(f"{r['word_uz']} — {r['word_ru']}" for r in items)
        docs.append(Document(page_content=f"Kun {day} — Lug'at (o'zbekcha — ruscha):\n{lines}",
                             metadata={"kun": day, "tur": "lugat"}))

    # 3. Tarjima mashqlari — kun boshiga bitta hujjat
    for day, items in _group_by_day(parse_insert(path("practice"))).items():
        items.sort(key=lambda r: int(r["sort_order"]))
        lines = "\n".join(f"{r['uz_text']} → {r['ru_correct']}" for r in items)
        docs.append(Document(page_content=f"Kun {day} — Tarjima mashqlari (o'zbekcha → ruscha):\n{lines}",
                             metadata={"kun": day, "tur": "mashq"}))

    # 4. O'qish matnlari — har matn alohida hujjat
    for r in parse_insert(path("reading")):
        day = int(r["day_number"])
        sarlavha = f": {r['title']}" if r.get("title") else ""
        content = f"Kun {day} — O'qish matni{sarlavha}\n{(r['body_ru'] or '').strip()}"
        docs.append(Document(page_content=content,
                             metadata={"kun": day, "tur": "oqish"}))

    # 5. Moslashtirish juftliklari — kun boshiga bitta hujjat
    for day, items in _group_by_day(parse_insert(path("matches"))).items():
        lines = "\n".join(f"{r['left_text']} — {r['right_text']}" for r in items)
        docs.append(Document(page_content=f"Kun {day} — Moslashtirish juftliklari:\n{lines}",
                             metadata={"kun": day, "tur": "moslashtirish"}))

    # 6. Test savollari — kun boshiga bitta hujjat (savol + to'g'ri javob)
    for day, items in _group_by_day(parse_insert(path("mcqs"))).items():
        items.sort(key=lambda r: int(r["sort_order"]))
        satrlar = []
        for r in items:
            opts = [r["option_a"], r["option_b"], r["option_c"], r["option_d"]]
            togri = opts[int(r["correct_index"])]
            satrlar.append(f"Savol: {r['question_text']}\nTo'g'ri javob: {togri}")
        docs.append(Document(page_content=f"Kun {day} — Grammatika testlari:\n" + "\n\n".join(satrlar),
                             metadata={"kun": day, "tur": "test"}))

    # 7. Gap tuzish mashqlari — kun boshiga bitta hujjat
    for day, items in _group_by_day(parse_insert(path("sentence_arrange"))).items():
        items.sort(key=lambda r: int(r["sort_order"]))
        lines = "\n".join(f"{r['prompt_text']} → {r['answer_ru']}" for r in items)
        docs.append(Document(page_content=f"Kun {day} — Gap tuzish mashqlari:\n{lines}",
                             metadata={"kun": day, "tur": "gap_tuzish"}))

    # Eslatma: daily_reading_lexemes (o'qish matni lug'ati) ATAYIN indeksga
    # qo'shilmaydi. Ular har biri yuzlab ruscha so'z uyumi bo'lib, deyarli har
    # qanday so'rovga mos kelib, semantik qidiruvda shovqin yaratardi. So'z-ma'no
    # qidiruvi kerak bo'lsa, alohida to'g'ridan-to'g'ri lug'at endpoint qilinadi.

    return docs


# ---------------------------------------------------------------------------
def main():
    print("1. SQL darsliklar o'qilib, hujjatlar qurilmoqda...")
    docs = build_documents()
    turlar = defaultdict(int)
    for d in docs:
        turlar[d.metadata["tur"]] += 1
    print(f"   -> {len(docs)} ta hujjat: " + ", ".join(f"{k}={v}" for k, v in turlar.items()))

    print("2. Hujjatlar bo'laklarga ajratilmoqda...")
    # 600 belgi: E5 modelining 512 token chegarasiga xavfsiz sig'adi (hech narsa kesilmaydi).
    splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=100)
    chunks = splitter.split_documents(docs)
    print(f"   -> {len(chunks)} ta bo'lak")

    print("3. Eski baza tozalanmoqda...")
    shutil.rmtree(VEKTOR_BAZA_PAPKA, ignore_errors=True)

    print("4. Embedding modeli yuklanib, vektor bazaga joylanmoqda (biroz vaqt oladi)...")
    Chroma.from_documents(documents=chunks, embedding=get_embeddings(),
                          persist_directory=VEKTOR_BAZA_PAPKA)

    print(f"Muvaffaqiyatli! {len(chunks)} ta bo'lak '{VEKTOR_BAZA_PAPKA}' bazasiga saqlandi.")


if __name__ == "__main__":
    main()
