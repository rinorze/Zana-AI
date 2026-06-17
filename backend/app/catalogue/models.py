from datetime import datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.utcnow()


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(128), index=True)
    names_json: Mapped[dict] = mapped_column(JSON, default=dict)
    description_json: Mapped[dict] = mapped_column(JSON, default=dict)
    fee: Mapped[str] = mapped_column(String(255), default="")
    duration: Mapped[str] = mapped_column(String(255), default="")
    office: Mapped[str] = mapped_column(String(255), default="")
    office_locations_json: Mapped[list] = mapped_column(JSON, default=list)
    required_documents_json: Mapped[list] = mapped_column(JSON, default=list)
    source_urls_json: Mapped[list] = mapped_column(JSON, default=list)
    last_verified: Mapped[str] = mapped_column(String(32), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)

    steps: Mapped[list["ServiceStep"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
        order_by="ServiceStep.order",
    )
    faqs: Mapped[list["ServiceFAQ"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
    )
    response_templates: Mapped[list["ResponseTemplate"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
    )


class ServiceStep(Base):
    __tablename__ = "service_steps"

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"), index=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    titles_json: Mapped[dict] = mapped_column(JSON, default=dict)
    descriptions_json: Mapped[dict] = mapped_column(JSON, default=dict)
    required_items_json: Mapped[list] = mapped_column(JSON, default=list)

    service: Mapped["Service"] = relationship(back_populates="steps")


class ServiceFAQ(Base):
    __tablename__ = "service_faqs"

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"), index=True)
    questions_json: Mapped[dict] = mapped_column(JSON, default=dict)
    answers_json: Mapped[dict] = mapped_column(JSON, default=dict)

    service: Mapped["Service"] = relationship(back_populates="faqs")


class ResponseTemplate(Base):
    __tablename__ = "response_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"), index=True)
    scenario: Mapped[str] = mapped_column(String(128), index=True)
    templates_json: Mapped[dict] = mapped_column(JSON, default=dict)
    placeholders_json: Mapped[list] = mapped_column(JSON, default=list)

    service: Mapped["Service"] = relationship(back_populates="response_templates")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(512))
    file_type: Mapped[str] = mapped_column(String(32))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    indexed: Mapped[bool] = mapped_column(Boolean, default=False)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str] = mapped_column(String(1024), unique=True)
    title: Mapped[str] = mapped_column(String(512), default="")
    last_indexed: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="pending")


class QueryLog(Base):
    __tablename__ = "query_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str] = mapped_column(String(32), index=True)
    query: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text, default="")
    found_match: Mapped[bool] = mapped_column(Boolean, default=False)
    language: Mapped[str] = mapped_column(String(8), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, index=True)
