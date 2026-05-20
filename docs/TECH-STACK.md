# Technology stack (Race01 / Potter's Duel)

This project is built to match the competition constraints:

## Allowed and used

| Layer | Technology | Notes |
|-------|------------|--------|
| Markup | HTML5 | Single-page app in `client/index.html` |
| Styles | CSS3 | `client/style.css` — no Sass/Less/Tailwind/Bootstrap |
| Client logic | Vanilla JavaScript (ES6+) | `client/js/*.js` — no React/Vue/Angular |
| Server | Node.js + JavaScript | `server/*.js` — authoritative game logic |
| Database | MySQL | `database/schema.sql`, `mysql2` driver |
| Real-time | Socket.IO | Matchmaking and live duels (npm package, not a UI framework) |
| HTTP API | Express | REST auth, profile, cards catalog |
| Graphics | WebGPU + Canvas 2D fallback | Browser APIs via `client/js/renderer.js` |
| Audio | Web Audio API | `client/js/sound-manager.js` |

JSX is not required for this project; the UI is plain HTML.

## Theme

Harry Potter–inspired characters (approved alternative to Marvel).

## Not used

- TypeScript, Python, PHP
- React, Vue, Angular, Svelte
- Tailwind, Bootstrap, Sass/Less
- Prisma, Sequelize, MongoDB
- Webpack/Vite build step (static files served as-is)

## External services (optional)

- Google Fonts (typography CDN)
- YouTube IFrame API (optional background music in settings)

For offline judging, fonts can be self-hosted and background music disabled.

## Existing database: add `alias` column

```bash
mysql -u root -p potters_duel < database/migrate-alias.sql
```
