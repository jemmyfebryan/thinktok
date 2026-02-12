import random
from typing import List, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from models import UserInterest
from datetime import datetime, timezone
from services.wiki_service import get_or_create_wiki_content


async def update_interest_scores(db: AsyncSession, user_id: int, content, weight_multiplier: float = 1.0):
    """Update user interest scores based on content categories and links"""
    try:
        related = content.get('related', [])
        categories = content.get('categories', [])
        tags = categories[:10] + related[:5]
    except:
        tags = []

    for tag in tags[:15]:
        tag = tag[:50]
        result = await db.execute(
            select(UserInterest).filter(
                and_(UserInterest.user_id == user_id, UserInterest.category_or_tag == tag)
            )
        )
        interest = result.scalars().first()

        if interest:
            interest.score += weight_multiplier
            interest.last_updated = datetime.now(timezone.utc)
        else:
            new_interest = UserInterest(user_id=user_id, category_or_tag=tag, score=weight_multiplier)
            db.add(new_interest)

    await db.commit()


async def get_personalized_feed(db: AsyncSession, user_id: int, count: int = 5, exclude: Set[str] = None) -> List[dict]:
    """Generate feed based on user interests"""
    if exclude is None:
        exclude = set()

    result = await db.execute(
        select(UserInterest).filter(UserInterest.user_id == user_id)
        .order_by(UserInterest.score.desc()).limit(20)
    )
    interests = result.scalars().all()

    feed_items = []
    seen_ids = set(exclude)
    attempts = 0
    max_attempts = count * 10

    while len(feed_items) < count and attempts < max_attempts:
        attempts += 1

        if interests and len(feed_items) < int(count * 0.4) and attempts % 3 != 0:
            interest = random.choice(interests)
            item = await get_or_create_wiki_content(db, interest.category_or_tag)
        else:
            item = await get_or_create_wiki_content(db)

        if item and item['content_id'] not in seen_ids:
            feed_items.append(item)
            seen_ids.add(item['content_id'])

    return feed_items
