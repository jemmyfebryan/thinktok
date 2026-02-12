from fastapi import APIRouter, Cookie, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from models import User, View, WikiContent
from database import get_db
from services.recommendation_service import update_interest_scores

router = APIRouter()


class TrackViewRequest(BaseModel):
    content_id: str
    view_duration: float


@router.post("/api/track_view")
async def track_view(
    data: TrackViewRequest,
    username: str = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).filter(User.username == username))
    user = result.scalars().first()
    if not user:
        return JSONResponse({"success": False})

    if data.view_duration > 1.0:
        result = await db.execute(
            select(WikiContent).filter(WikiContent.content_id == data.content_id)
        )
        content = result.scalars().first()

        new_view = View(user_id=user.id, content_id=data.content_id, view_duration=data.view_duration)
        db.add(new_view)

        if content:
            weight_multiplier = min(data.view_duration * 0.1, 2.0)
            await update_interest_scores(db, user.id, {
                'title': content.title,
                'related': [],
                'categories': []
            }, weight_multiplier)

        await db.commit()

    return JSONResponse({"success": True})
