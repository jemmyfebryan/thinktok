from fastapi import APIRouter, Cookie, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from models import Like, Comment, WikiContent, User
from database import get_db
from services.recommendation_service import update_interest_scores

router = APIRouter()


class ToggleLikeRequest(BaseModel):
    content_id: str


class CommentRequest(BaseModel):
    content_id: str
    text: str


@router.post("/api/toggle_like")
async def toggle_like(
    data: ToggleLikeRequest,
    username: str = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).filter(User.username == username))
    user = result.scalars().first()
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    result = await db.execute(
        select(Like).filter(
            and_(Like.user_id == user.id, Like.content_id == data.content_id)
        )
    )
    existing_like = result.scalars().first()

    is_liked = False
    content = None

    if existing_like:
        await db.delete(existing_like)
    else:
        result = await db.execute(select(WikiContent).filter(WikiContent.content_id == data.content_id))
        content = result.scalars().first()
        new_like = Like(user_id=user.id, content_id=data.content_id)
        db.add(new_like)
        is_liked = True

        if content:
            await update_interest_scores(db, user.id, {
                'title': content.title,
                'related': [],
                'categories': []
            }, weight_multiplier=10.0)

    await db.commit()

    return JSONResponse({
        "is_liked": is_liked,
        "content_id": data.content_id
    })


@router.get("/api/comments/{content_id}")
async def get_comments(
    content_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Comment).filter(Comment.content_id == content_id)
    )
    comments = result.scalars().all()

    result = await db.execute(
        select(WikiContent).filter(WikiContent.content_id == content_id)
    )
    content = result.scalars().first()

    # Fetch users for comments
    comments_data = []
    for c in comments:
        user_result = await db.execute(select(User).filter(User.id == c.user_id))
        user = user_result.scalars().first()
        comments_data.append({
            "id": c.id,
            "text": c.text,
            "user": {"username": user.username if user else "Unknown"},
            "content_id": c.content_id
        })

    return JSONResponse({
        "comments": comments_data,
        "page_title": content.title if content else "Unknown"
    })


@router.post("/api/comments")
async def post_comment(
    data: CommentRequest,
    username: str = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).filter(User.username == username))
    user = result.scalars().first()
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    result = await db.execute(
        select(WikiContent).filter(WikiContent.content_id == data.content_id)
    )
    content = result.scalars().first()
    if content:
        await update_interest_scores(db, user.id, {
            'title': content.title,
            'related': [],
            'categories': []
        }, weight_multiplier=5.0)

    new_comment = Comment(user_id=user.id, content_id=data.content_id, text=data.text)
    db.add(new_comment)
    await db.commit()

    return JSONResponse({
        "comment": {
            "id": new_comment.id,
            "text": new_comment.text,
            "user": {"username": user.username},
            "content_id": new_comment.content_id
        }
    })


@router.post("/api/share")
async def track_share(
    data: ToggleLikeRequest,
    username: str = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).filter(User.username == username))
    user = result.scalars().first()
    if not user:
        return JSONResponse({"success": False})

    result = await db.execute(
        select(WikiContent).filter(WikiContent.content_id == data.content_id)
    )
    content = result.scalars().first()

    from models import Share
    new_share = Share(user_id=user.id, content_id=data.content_id)
    db.add(new_share)

    if content:
        await update_interest_scores(db, user.id, {
            'title': content.title,
            'related': [],
            'categories': []
        }, weight_multiplier=8.0)

    await db.commit()
    return JSONResponse({"success": True})
