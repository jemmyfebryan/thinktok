from fastapi import APIRouter, Depends, Cookie
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from models import User
from database import get_db

router = APIRouter()


class LoginRequest(BaseModel):
    username: str


@router.post("/api/login")
async def login_action(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.username == data.username))
    user = result.scalars().first()
    if not user:
        user = User(username=data.username)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    response = JSONResponse({
        "success": True,
        "user": {"id": user.id, "username": user.username}
    })
    response.set_cookie(
        key="username",
        value=user.username,
        max_age=60 * 60 * 24 * 30,  # 30 days
        httponly=False,
        samesite="lax"
    )
    return response


@router.get("/api/me")
async def get_current_user(username: str = Cookie(None), db: AsyncSession = Depends(get_db)):
    if not username:
        return JSONResponse({"user": None}, status_code=401)

    result = await db.execute(select(User).filter(User.username == username))
    user = result.scalars().first()
    if not user:
        return JSONResponse({"user": None}, status_code=401)

    return JSONResponse({
        "user": {"id": user.id, "username": user.username}
    })


@router.post("/api/logout")
async def logout():
    response = JSONResponse({"success": True})
    response.delete_cookie("username")
    return response
