# Neon Tab

A playful neon start page (the new version of `firefox_test`) made with HTML, CSS, Bootstrap 5 and vanilla JavaScript. A tiny PHP file fakes the "prove you're not a bot" check.

## Features

- **Bot Buster gate:** pick a player name, then beat 3 quiz rounds with 3 lives.
- **Fake PHP verification:** `api/verify.php` checks hard-coded answers. It is not real security.
- **Start page:** Google search box, 5 shortcut tiles, live clock, daily joke/quote, and quests (to-do list).
- **XP and levels:** finishing a quest gives +10 XP. Every 50 XP is a new level.
- Saves your name, quests and XP in the browser (`localStorage`).

## Run it

With PHP installed (needed for the verification file):

```bash
php -S localhost:8000
```

Then open http://localhost:8000.

Without PHP (for example on GitHub Pages) the game still works in offline demo mode using answers stored in `assets/js/app.js`.

## Project structure

```
index.html
assets/
  css/style.css
  js/app.js
api/
  verify.php
```

## Notes

- Bootstrap and the fonts load from a CDN, so you need an internet connection.
- The correct answers live in `api/verify.php` (`$ANSWERS`) and in `OFFLINE_ANSWERS` in `app.js`. Change both if you edit the questions.
