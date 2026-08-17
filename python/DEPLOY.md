# FalaRus AI — Ishlab chiqarish deploy qo'llanmasi

AI backend (Ollama + RAG) **alohida serverga** o'rnatiladi. Ishlab turgan FalaRus
ilovasi (82.115.50.76) ga TEGILMAYDI — u faqat `RAG_API_URL` orqali shu AI serverga ulanadi.

## 0. Server talablari

| Variant | Model | Javob vaqti | Baho |
|---|---|---|---|
| **GPU (NVIDIA T4/RTX, 8GB+ VRAM)** | gemma2:9b | ~2-5s | ✅ Tavsiya |
| CPU, 16GB+ RAM | gemma2:9b | ~200s | ⚠️ Juda sekin |
| CPU, 8-16GB RAM | gemma2:2b | ~40s | ⚠️ Sifat past |

Bu 4GB prod serverга SIG'MAYDI — shuning uchun alohida server.

---

## 1. Ollama + model

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma2          # GPU bo'lsa avtomatik ishlatiladi
# GPU: nvidia drayver + nvidia-container-toolkit o'rnatilgan bo'lsin
```

## 2. Kod va ma'lumotni ko'chirish

Mahalliy `python/` papkani va SQL darsliklarni AI serverga ko'chiring:

```bash
# mahalliy mashinadan (misol):
scp -r python/ ubuntu@AI_SERVER_IP:/opt/falarus-ai/
scp ~/Downloads/daily_*.sql ubuntu@AI_SERVER_IP:/opt/falarus-ai/sql/
```

## 3. Python muhiti

```bash
cd /opt/falarus-ai/python
sudo apt install -y python3-venv        # yoki mavjud bo'lsa o'tkazib yuboring
python3 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
```

## 4. Vektor bazani qurish (bir marta)

```bash
SQL_DIR=/opt/falarus-ai/sql ./venv/bin/python sql_kirit.py
# -> vektor_baza/ hosil bo'ladi (embedding + reranker modellari ilk marta yuklanadi)
```

## 5. systemd xizmati (doimiy ishlashi uchun)

`/etc/systemd/system/falarus-ai.service`:

```ini
[Unit]
Description=FalaRus RAG API
After=network.target ollama.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/falarus-ai/python
# 127.0.0.1 — faqat ichki; tashqi ulanish faqat firewall orqali (6-qadam)
ExecStart=/opt/falarus-ai/python/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now falarus-ai
sudo systemctl status falarus-ai
```

## 6. ⚠️ XAVFSIZLIK — portni faqat prod serverga ochish

Python API'da autentifikatsiya YO'Q (auth Express qatlamida). Shuning uchun 8000-port
**faqat prod server (82.115.50.76)** uchun ochiq bo'lishi shart, internetga EMAS:

```bash
sudo ufw allow from 82.115.50.76 to any port 8000 proto tcp
sudo ufw deny 8000
sudo ufw enable
```

Tekshiruv (prod serverdan):
```bash
curl -X POST http://AI_SERVER_IP:8000/savol \
     -H "Content-Type: application/json" \
     -d '{"savol": "Rus tilida o'\''tgan zamon qanday yasaladi?"}'
```

---

## 7. Prod serverni ulash (yengil, ehtiyotkorlik bilan)

Prod serverда (82.115.50.76) faqat:
1. `RAG_API_URL=http://AI_SERVER_IP:8000` muhit o'zgaruvchisini qo'shish
2. Yangilangan kodni tortib olish + qayta build/restart (mavjud deploy usuli bilan)

Bu qadamlar ilovaning HOZIRGI deploy usuliga bog'liq (pm2 / docker / systemd) —
avval read-only tekshiruvda aniqlanadi, keyin xavfsiz bajariladi.

## Yangilash (darsliklar o'zgarganda)

```bash
# yangi SQL fayllarni ko'chirib:
SQL_DIR=/opt/falarus-ai/sql ./venv/bin/python sql_kirit.py
sudo systemctl restart falarus-ai
```
