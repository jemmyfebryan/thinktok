import hashlib
import json
from typing import Optional
import wikipedia
from sqlalchemy.ext.asyncio import AsyncSession
from models import WikiContent
from datetime import datetime, timezone


def generate_content_id(title: str) -> str:
    """Generate a consistent content ID from Wikipedia title"""
    return hashlib.sha256(title.encode('utf-8')).hexdigest()[:16]


async def get_or_create_wiki_content(db: AsyncSession, title: str = None) -> Optional[dict]:
    """Get wiki content from cache or fetch from Wikipedia API"""
    if not title:
        title = wikipedia.random()

    content_id = generate_content_id(title)

    # Try to get from cache first
    from sqlalchemy import select
    result = await db.execute(select(WikiContent).filter(WikiContent.content_id == content_id))
    cached = result.scalars().first()

    if cached:
        cached.last_accessed = datetime.now(timezone.utc)
        cached.access_count += 1
        await db.commit()

        return {
            "content_id": cached.content_id,
            "title": cached.title,
            "summary": cached.summary,
            "image": cached.image_url,
            "related": json.loads(cached.related_links) if cached.related_links else [],
            "categories": json.loads(cached.categories) if cached.categories else []
        }

    # Not in cache, fetch from Wikipedia
    try:
        page = wikipedia.page(title, auto_suggest=False)

        new_content = WikiContent(
            content_id=content_id,
            title=page.title,
            summary=page.summary[:500] + "...",
            image_url=page.images[0] if page.images else None,
            related_links=json.dumps(page.links[:10]),
            categories=json.dumps(page.categories[:10] if hasattr(page, 'categories') else [])
        )
        db.add(new_content)
        await db.commit()

        return {
            "content_id": new_content.content_id,
            "title": new_content.title,
            "summary": new_content.summary,
            "image": new_content.image_url,
            "related": json.loads(new_content.related_links),
            "categories": json.loads(new_content.categories)
        }
    except Exception as e:
        print(f"Error fetching Wikipedia content: {e}")
        return None
