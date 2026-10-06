# OLIMA AI — frontend

Angular admin panel, chat widget (`src/widget/`) va landing (`/demo/`). Backend alohida repoda: `olima-backend`.

## Lokal ishga tushirish

```bash
npm ci
npm start          # proxy.conf.json orqali /api -> http://localhost:8080
```

## Serverda deploy

Repo `/opt/olima/frontend` ga clone qilingan. Backend (`olima_net` tarmog'i) avval ko'tarilgan bo'lishi kerak.

```bash
cd /opt/olima/frontend
git pull
docker compose up -d --build
```

Konteyner `127.0.0.1:8095` da tinglaydi; host'dagi nginx HTTPS bilan shu portga proxy qiladi.
