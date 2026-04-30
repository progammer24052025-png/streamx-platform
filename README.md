# StreamX

Static streaming-style website built with HTML, CSS, and vanilla JavaScript.

## Project Structure

- `Index.html` - intro/splash page that redirects to home.
- `home.html` - main browsing page.
- `style.css` - global styles and component styles.
- `script.js` - UI behavior, filtering, modal logic, validation, and image fallbacks.
- `data/catalog.js` - single source of truth for movies/anime/featured cards.
- `data/movie-db.js` - modal metadata (ratings and descriptions).
- `assets/fallback/` - local fallback images used when banners/posters are missing.
- `css/loader.css` and `js/loader.js` - splash animation and redirect behavior.

## How Content Works

1. Update card data in `data/catalog.js`.
2. Update modal descriptions/ratings in `data/movie-db.js`.
3. UI sections (Movies, Anime, Featured) are auto-rendered from `data/catalog.js`.

## Asset Notes

- Referenced media paths currently use `Posters/...` and `Banners/...`.
- If those files are missing, the app now falls back to:
  - `assets/fallback/poster.svg`
  - `assets/fallback/banner.svg`

## Local Run

- Open `Index.html` in a browser, or
- Serve as static files via any local HTTP server.

tesst our website here :  https://progammer24052025-png.github.io/streamx-platform/Index

## Quick QA Checklist

- Home slider autoplay and pagination work.
- Featured slider loops and responds at breakpoints.
- Search highlights and dims cards correctly.
- Movie modal opens from movie/anime cards.
- Newsletter and login forms show inline validation feedback.
- Missing images render fallback graphics.
