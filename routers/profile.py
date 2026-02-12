from fastapi import APIRouter, Cookie, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models import User, Like, Comment
from database import get_db

router = APIRouter()


@router.get("/api/profile")
async def get_profile(
    username: str = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    if not username:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    result = await db.execute(select(User).filter(User.username == username))
    user = result.scalars().first()

    result = await db.execute(
        select(func.count(Like.id)).filter(Like.user_id == user.id)
    )
    liked_count = result.scalar() or 0

    result = await db.execute(
        select(func.count(Comment.id)).filter(Comment.user_id == user.id)
    )
    comment_count = result.scalar() or 0

    return JSONResponse({
        "user": {
            "id": user.id,
            "username": user.username
        },
        "stats": {
            "likes": liked_count,
            "comments": comment_count
        }
    })
