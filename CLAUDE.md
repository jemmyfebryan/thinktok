# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ThinkTok is a TikTok-style interface for consuming Wikipedia content. Users scroll through vertically-snapped cards featuring random Wikipedia articles with images, summaries, and related topics. The app supports liking, commenting, and user profiles.

## Tech Stack

- **Backend**: FastAPI with SQLAlchemy ORM
- **Frontend**: HTMX + Tailwind CSS (via CDN) + Jinja2 templates
- **Database**: SQLite (`thinktok.db`)
- **Content**: Wikipedia API (using `wikipedia-api` and `wikipedia` packages)

## Development Commands

### Running the Server
```bash
# Using Poetry (recommended)
poetry run uvicorn main:app --reload

# Or directly with uvicorn if using venv
uvicorn main:app --reload
```

### Installing Dependencies
```bash
poetry install
```

## Architecture

### Single-File Structure (`main.py`)

All application logic is currently contained in `main.py`. The file is organized into sections:

1. **Configuration** (lines 9-11): Database URL, template directory
2. **Database Setup** (lines 13-50): SQLAlchemy models, engine, session factory
3. **Helpers** (lines 52-67): `get_wiki_content()` fetches Wikipedia articles
4. **Routes** (lines 69-191): Full-page routes and HTMX partials

### Database Models

- `User`: Simple username-based auth (no passwords)
- `UserInterest`: Tracks user interests by category/tag with scores (not fully implemented yet)
- `Comment`: Comments on Wikipedia pages, linked to users
- `Like`: Tracks which pages each user has liked (for toggle functionality)

### Frontend Architecture

The app uses **HTMX partial updates** for dynamic interactions without page refreshes:

- **Likes**: `/toggle_like` returns only the button HTML (swapped via `hx-swap="outerHTML"`)
- **Comments**: `/comments/{page_title}` returns the comment list; `/post_comment` returns a single comment to append
- **Partials directory**: Contains reusable HTML fragments for HTMX responses

### Key UI Pattern: Scroll Snap Feed

The TikTok-style vertical scrolling is achieved via CSS scroll snapping in `templates/feed.html`:

- `#feed-container`: `scroll-snap-type: y mandatory` with `overflow-y: scroll`
- `.video-card`: `scroll-snap-align: start` with `height: 100%`
- Body has `overflow: hidden` to prevent double-scrolling

### Wikipedia Content Fetching

Two Wikipedia libraries are used:
- `wikipedia` (in `main.py`): Main content fetching with `wikipedia.random()` and `wikipedia.page()`
- `wikipediaapi` (in `dev/get_related.py`): Alternative with more control, currently for development

### Authentication

Cookie-based simple authentication:
- Login creates/gets user by username, sets `username` cookie
- No password or session tokens (very basic)
- All routes check `username: str = Cookie(None)` and redirect to `/login` if missing

## HTMX Partial Response Pattern

When adding new interactive features, follow the existing pattern:

1. Create a route returning `HTMLResponse`
2. Return a `TemplateResponse` with only the partial HTML
3. Use `hx-swap="outerHTML"` or similar to replace the target element
4. Pass `request` parameter to templates (required by Jinja2Templates)

## Template Structure

```
templates/
├── feed.html          # Main scrollable feed page
├── login.html         # Login page
├── profile.html       # User profile with stats
├── index.html         # (unused, legacy)
└── partials/
    ├── like_button.html      # Like/unlike button with state
    ├── comment_list.html     # Full comment list + post form
    └── single_comment.html   # Individual comment for appending
```

## Database Location

SQLite database is at `./thinktok.db` in the project root. Use `sqlite3 thinktok.db` for direct inspection.
