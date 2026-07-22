"""Message Feedback API.

Allows users to rate AI responses (thumbs up/down).
Stores feedback in the messages table via the evaluation_score field.
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.models.message import Message
from app.api.dependencies import get_current_user_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["feedback"])


# ─── Schemas ───────────────────────────────────────────────


class FeedbackCreate(BaseModel):
    message_id: str
    rating: str  # "positive" | "negative" | "reset"


class FeedbackResponse(BaseModel):
    message_id: str
    rating: str
    success: bool


# ─── Endpoints ─────────────────────────────────────────────


@router.post("/message", response_model=FeedbackResponse)
async def rate_message(
    request: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Rate an AI message as positive/negative or reset it."""
    msg_id = uuid.UUID(request.message_id)

    result = await db.execute(select(Message).where(Message.id == msg_id))
    message = result.scalar_one_or_none()

    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")

    # Map rating to evaluation_score
    if request.rating == "positive":
        message.evaluation_score = 1.0
    elif request.rating == "negative":
        message.evaluation_score = -1.0
    elif request.rating == "reset":
        message.evaluation_score = None
    else:
        raise HTTPException(status_code=400, detail="Invalid rating. Use: positive, negative, reset")

    await db.flush()
    await db.commit()

    logger.info(f"Feedback saved for message {msg_id}: {request.rating}")

    return FeedbackResponse(
        message_id=request.message_id,
        rating=request.rating,
        success=True,
    )


@router.get("/message/{message_id}")
async def get_message_feedback(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Get the feedback rating for a message."""
    msg_id = uuid.UUID(message_id)

    result = await db.execute(select(Message).where(Message.id == msg_id))
    message = result.scalar_one_or_none()

    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")

    rating = None
    if message.evaluation_score == 1.0:
        rating = "positive"
    elif message.evaluation_score == -1.0:
        rating = "negative"
    elif message.evaluation_score is not None and message.evaluation_score > 0:
        rating = "positive"
    elif message.evaluation_score is not None and message.evaluation_score < 0:
        rating = "negative"

    return {"message_id": message_id, "rating": rating}
