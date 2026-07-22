"""
Study Plan Generation API.

Endpoints for generating, retrieving, and managing AI-powered personalized
learning paths. Study plans use the AI router to generate structured weekly
milestones tailored to the user's goals, subjects, and experience level.
"""

import json
import uuid
import re
import structlog
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.models.study_plan import StudyPlan
from app.api.dependencies import get_current_user_id, check_rate_limit
from app.ai.prompts import STUDY_PLAN_PROMPT
from app.orchestration.router import route_request
from app.security import check_input, check_output

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/study-plans", tags=["study-plans"])


# ─── Schemas ───────────────────────────────────────────────


class Milestone(BaseModel):
    week: int
    title: str
    description: str
    topics: list[str]
    estimated_hours: int
    learning_objectives: list[str]
    quiz_topic: str | None = None
    practical_exercise: str | None = None


class StudyPlanGenerate(BaseModel):
    goal: str = "curiosity"  # exam_prep, curiosity, skill_building, research
    subjects: list[str]
    experience_level: str = "beginner"  # beginner, intermediate, advanced
    duration_weeks: int = 4
    additional_goals: str | None = None  # Free-text learning goals


class StudyPlanUpdate(BaseModel):
    title: str | None = None
    status: str | None = None  # active, completed, archived


class StudyPlanResponse(BaseModel):
    id: str
    title: str
    goal: str
    subjects: list[str]
    experience_level: str
    estimated_duration_weeks: int
    milestones: list[dict[str, Any]]
    status: str
    model_used: str | None
    created_at: str
    updated_at: str
    completed_at: str | None


class StudyPlanListResponse(BaseModel):
    study_plans: list[StudyPlanResponse]
    total: int


# ─── Helpers ───────────────────────────────────────────────


def _serialize_plan(plan: StudyPlan) -> dict[str, Any]:
    """Serialize a study plan to a response dict."""
    return {
        "id": str(plan.id),
        "title": plan.title,
        "goal": plan.goal,
        "subjects": plan.subjects or [],
        "experience_level": plan.experience_level,
        "estimated_duration_weeks": plan.estimated_duration_weeks,
        "milestones": plan.milestones or [],
        "status": plan.status,
        "model_used": plan.model_used,
        "created_at": plan.created_at.isoformat(),
        "updated_at": plan.updated_at.isoformat(),
        "completed_at": plan.completed_at.isoformat() if plan.completed_at else None,
    }


def _parse_plan_json(raw_content: str) -> dict[str, Any]:
    """Parse the AI response into a structured plan dict.

    Handles markdown code blocks and raw JSON extraction.
    Returns dict with 'title' and 'milestones' keys.
    """
    content = raw_content.strip()

    # Strip markdown code blocks if present
    if content.startswith("```"):
        lines = content.split("\n")
        start = 0
        for i, line in enumerate(lines):
            if line.strip().startswith("```"):
                start = i + 1
                break
        end = len(lines)
        for i in range(len(lines) - 1, start - 1, -1):
            if lines[i].strip().startswith("```"):
                end = i
                break
        content = "\n".join(lines[start:end]).strip()

    # Try to parse JSON
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(0))
            except json.JSONDecodeError:
                raise ValueError("AI response did not contain valid JSON")
        else:
            raise ValueError("AI response did not contain valid JSON")

    title = data.get("title", "Personalized Study Plan")
    milestones = data.get("milestones", [])

    if not milestones or not isinstance(milestones, list):
        raise ValueError("AI response missing 'milestones' array")

    # Validate and normalize milestones
    validated_milestones = []
    for i, m in enumerate(milestones):
        validated_milestones.append({
            "week": m.get("week", i + 1),
            "title": m.get("title", f"Week {i + 1}"),
            "description": m.get("description", ""),
            "topics": m.get("topics", []),
            "estimated_hours": m.get("estimated_hours", 5),
            "learning_objectives": m.get("learning_objectives", []),
            "quiz_topic": m.get("quiz_topic"),
            "practical_exercise": m.get("practical_exercise"),
        })

    return {"title": title, "milestones": validated_milestones}


# ─── Endpoints ─────────────────────────────────────────────


@router.post("/generate", response_model=StudyPlanResponse, status_code=201)
async def generate_study_plan(
    request: StudyPlanGenerate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
    _: int = Depends(check_rate_limit),
):
    """Generate a personalized study plan using AI.

    Takes the user's learning goals, subjects, and experience level,
    then generates a structured plan with weekly milestones.
    """
    user_id_str = str(user_id)

    # Build the prompt with user context
    subjects_str = ", ".join(request.subjects)
    goals_text = f"Primary goal: {request.goal}"
    if request.additional_goals:
        goals_text += f"\nAdditional goals: {request.additional_goals}"

    prompt_text = STUDY_PLAN_PROMPT.format(
        goals=goals_text,
        subjects=subjects_str,
        experience_level=request.experience_level,
        duration_weeks=request.duration_weeks,
    )

    # ── Input Security Check ───────────────────────────────
    input_result = await check_input(prompt_text, user_id=user_id_str)
    if input_result.blocked:
        raise HTTPException(
            status_code=400,
            detail={
                "message": input_result.message,
                "code": "content_blocked",
                "category": input_result.categories[0] if input_result.categories else "unknown",
            },
        )

    # ── Generate Plan via AI ───────────────────────────────
    ai_response = await route_request(
        prompt=prompt_text,
        system_prompt="You are a personalized learning path designer. Generate structured study plans in JSON format. Return ONLY valid JSON, no other text.",
        mode="balanced",
    )

    # ── Output Security Check ──────────────────────────────
    output_result = await check_output(
        ai_response.content,
        user_id=user_id_str,
        session_id="",
    )
    if output_result.blocked:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "The generated plan was flagged by content safety filters.",
                "code": "content_blocked",
            },
        )

    # ── Parse AI Response ──────────────────────────────────
    try:
        parsed = _parse_plan_json(ai_response.content)
    except ValueError as e:
        logger.error("Failed to parse study plan JSON from AI", error=str(e))
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Failed to generate valid study plan. Please try again.",
                "code": "parse_error",
            },
        )

    # ── Create Study Plan Record ───────────────────────────
    plan = StudyPlan(
        id=uuid.uuid4(),
        user_id=user_id,
        title=parsed["title"],
        goal=request.goal,
        subjects=request.subjects,
        experience_level=request.experience_level,
        estimated_duration_weeks=request.duration_weeks,
        milestones=parsed["milestones"],
        status="active",
        model_used=ai_response.model_used,
    )
    db.add(plan)
    await db.flush()
    await db.commit()

    logger.info(
        "Study plan generated",
        plan_id=str(plan.id),
        goal=request.goal,
        subjects=subjects_str,
        week_count=len(parsed["milestones"]),
    )

    return StudyPlanResponse(**_serialize_plan(plan))


@router.get("", response_model=StudyPlanListResponse)
async def list_study_plans(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
    limit: int = 10,
    offset: int = 0,
):
    """List all study plans for the current user."""
    result = await db.execute(
        select(StudyPlan)
        .where(StudyPlan.user_id == user_id)
        .order_by(desc(StudyPlan.created_at))
        .offset(offset)
        .limit(limit)
    )
    plans = result.scalars().all()

    return StudyPlanListResponse(
        study_plans=[StudyPlanResponse(**_serialize_plan(p)) for p in plans],
        total=len(plans),
    )


@router.get("/{plan_id}", response_model=StudyPlanResponse)
async def get_study_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Get a specific study plan with full milestone details."""
    result = await db.execute(
        select(StudyPlan).where(
            StudyPlan.id == plan_id,
            StudyPlan.user_id == user_id,
        )
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=404, detail="Study plan not found")

    return StudyPlanResponse(**_serialize_plan(plan))


@router.patch("/{plan_id}", response_model=StudyPlanResponse)
async def update_study_plan(
    plan_id: uuid.UUID,
    request: StudyPlanUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Update a study plan's title or status."""
    result = await db.execute(
        select(StudyPlan).where(
            StudyPlan.id == plan_id,
            StudyPlan.user_id == user_id,
        )
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=404, detail="Study plan not found")

    if request.title is not None:
        plan.title = request.title
    if request.status is not None:
        valid_statuses = {"active", "completed", "archived"}
        if request.status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": f"Invalid status. Must be one of: {', '.join(sorted(valid_statuses))}",
                    "code": "invalid_status",
                },
            )
        plan.status = request.status
        if request.status == "completed" and not plan.completed_at:
            plan.completed_at = datetime.now(timezone.utc)

    plan.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.commit()

    logger.info(
        "Study plan updated",
        plan_id=str(plan.id),
        status=plan.status,
    )

    return StudyPlanResponse(**_serialize_plan(plan))
