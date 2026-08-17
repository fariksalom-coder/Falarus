"""
sorov.py — RAG so'rovi uchun buyruq qatori (CLI) vositasi.

Asosiy mantiq rag.py da. Bu fayl faqat terminaldan sinash uchun.

Ishlatish:
    ./venv/bin/python sorov.py "Rus tilida o'tgan zamon qanday yasaladi?"
"""

import sys

from rag import javob_ol

if __name__ == "__main__":
    savol = " ".join(sys.argv[1:]) or "Rus tilida o'tgan zamon qanday yasaladi?"
    print(f"SAVOL: {savol}\n")

    natija = javob_ol(savol)
    print(natija["javob"])

    print("\n--- Manbalar (darslikdan) ---")
    for i, manba in enumerate(natija["manbalar"], 1):
        print(f"[{i}] {manba[:120]}...")
