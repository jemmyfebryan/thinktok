from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from database import engine, Base
from routers import auth, feed, interactions, tracking, profile


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: cleanup if needed


# Initialize FastAPI app with lifespan
app = FastAPI(lifespan=lifespan)

templates = Jinja2Templates(directory="templates")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Register API routers
app.include_router(auth.router)
app.include_router(feed.router)
app.include_router(interactions.router)
app.include_router(tracking.router)
app.include_router(profile.router)


# SPA route - serve the app for all non-API routes
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/profile", response_class=HTMLResponse)
async def profile_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# Catch-all for client-side routing (API routes are handled first)
@app.get("/{path:path}", response_class=HTMLResponse)
async def catch_all(request: Request):
    # API routes are already handled, so this just serves the SPA
    return templates.TemplateResponse("index.html", {"request": request})
