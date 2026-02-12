from fastapi import APIRouter, Request, Cookie, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from models import User, Like, Comment
from database import get_db
from services.recommendation_service import get_personalized_feed
from services.wiki_service import get_or_create_wiki_content

router = APIRouter()


@router.get("/api/feed")
async def get_feed(
    exclude: str = "",
    username: str = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    if not username:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    result = await db.execute(select(User).filter(User.username == username))
    user = result.scalars().first()
    if not user:
        return JSONResponse({"error": "User not found"}, status_code=401)

    exclude_ids = set([t.strip() for t in exclude.split(',') if t.strip()]) if exclude else set()
    feed_items = await get_personalized_feed(db, user.id, count=5, exclude=exclude_ids)

    for item in feed_items:
        result = await db.execute(
            select(Like).filter(
                and_(Like.user_id == user.id, Like.content_id == item['content_id'])
            )
        )
        is_liked = result.scalars().first() is not None

        result = await db.execute(
            select(func.count(Comment.id)).filter(Comment.content_id == item['content_id'])
        )
        comment_count = result.scalar() or 0

        item['is_liked'] = is_liked
        item['comment_count'] = comment_count

    return JSONResponse({
        "items": feed_items
    })


@router.get("/api/load_more")
async def load_more(
    exclude: str = "",
    username: str = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    if not username:
        return JSONResponse({"items": []})

    result = await db.execute(select(User).filter(User.username == username))
    user = result.scalars().first()
    if not user:
        return JSONResponse({"items": []})

    exclude_ids = set([t.strip() for t in exclude.split(',') if t.strip()]) if exclude else set()
    feed_items = await get_personalized_feed(db, user.id, count=3, exclude=exclude_ids)

    if not feed_items:
        for _ in range(10):
            item = await get_or_create_wiki_content(db)
            if item and item['content_id'] not in exclude_ids:
                feed_items.append(item)
                break

    if not feed_items:
        return JSONResponse({"items": []})

    for item in feed_items:
        result = await db.execute(
            select(Like).filter(
                and_(Like.user_id == user.id, Like.content_id == item['content_id'])
            )
        )
        is_liked = result.scalars().first() is not None

        result = await db.execute(
            select(func.count(Comment.id)).filter(Comment.content_id == item['content_id'])
        )
        comment_count = result.scalar() or 0

        item['is_liked'] = is_liked
        item['comment_count'] = comment_count

    return JSONResponse({
        "items": feed_items
    })
