from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, DateTime, and_
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone


def utc_now():
    """Get current UTC datetime"""
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)


class WikiContent(Base):
    """Cached Wikipedia content"""
    __tablename__ = "wiki_content"
    content_id = Column(String, primary_key=True, index=True)
    title = Column(String, index=True)
    summary = Column(Text)
    image_url = Column(String, nullable=True)
    related_links = Column(Text)  # JSON array
    categories = Column(Text)  # JSON array
    created_at = Column(DateTime, default_factory=utc_now)
    last_accessed = Column(DateTime, default_factory=utc_now)
    access_count = Column(Integer, default=0)


class UserInterest(Base):
    __tablename__ = "user_interests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    category_or_tag = Column(String)
    score = Column(Float, default=0.0)
    last_updated = Column(DateTime, default_factory=utc_now)


class View(Base):
    __tablename__ = "views"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    content_id = Column(String, ForeignKey("wiki_content.content_id"), index=True)
    view_duration = Column(Float, default=0.0)
    timestamp = Column(DateTime, default_factory=utc_now)


class Share(Base):
    __tablename__ = "shares"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    content_id = Column(String, ForeignKey("wiki_content.content_id"))
    timestamp = Column(DateTime, default_factory=utc_now)


class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    content_id = Column(String, ForeignKey("wiki_content.content_id"), index=True)
    text = Column(Text)
    user = relationship("User")
    content = relationship("WikiContent")


class Like(Base):
    __tablename__ = "likes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    content_id = Column(String, ForeignKey("wiki_content.content_id"))
