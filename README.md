# Potter's Duel 🧙

Real-time Harry Potter–themed card dueling game. Pick a faction, build a deck, fight 1v1 or 2v2.

**Stack:** Node.js 18 · Express · Socket.IO · MySQL 8 · Vanilla JS · WebGPU

---

## Local Setup

```bash
npm install
cp .env.example .env
mysql -u root -p < database/schema.sql
npm start              # or: npm run dev
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL connection |
| `JWT_SECRET` | Token signing key |
| `EMAIL_USER` / `EMAIL_PASSWORD` | Gmail + App Password for password reset |
| `PORT` | Server port (default `5000`) |

---

## Browser

WebGPU graphics require Chrome/Edge 113+. Canvas 2D fallback works everywhere.