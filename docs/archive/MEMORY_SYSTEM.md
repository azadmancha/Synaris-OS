# Memory System

> **Version 1.0 — How Synaris remembers, learns from, and adapts to every learner across sessions**

---

## Table of Contents

1. [Memory Architecture](#memory-architecture)
2. [Conversation Memory](#conversation-memory)
3. [Long-Term Memory](#long-term-memory)
4. [Learning Profile](#learning-profile)
5. [Knowledge State Tracking](#knowledge-state-tracking)
6. [Weak Concept Detection](#weak-concept-detection)
7. [Interest & Goal Tracking](#interest--goal-tracking)
8. [Learning Style Inference](#learning-style-inference)
9. [Memory Operations API](#memory-operations-api)

---

## Memory Architecture

### Three-Tier Memory System

```
┌─────────────────────────────────────────────────────┐
│                  WORKING MEMORY                      │
│  (Current session context, lasts 1 hour)            │
│  Storage: Redis + PostgreSQL                        │
│  Content: Current conversation, active topic,       │
│  recent messages (last N), session context          │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                SHORT-TERM MEMORY                      │
│  (Recent sessions, lasts 30 days)                   │
│  Storage: PostgreSQL                                 │
│  Content: Session summaries, key concepts,           │
│  misconceptions detected, topics explored            │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                LONG-TERM MEMORY                       │
│  (Persistent learning profile, lasts forever)       │
│  Storage: PostgreSQL + Qdrant                        │
│  Content: Learning profile, mastery levels,          │
│  goals, interests, learning style,                   │
│  knowledge graph state                               │
└─────────────────────────────────────────────────────┘
```

### Memory Consolidation

```
Session Complete
    │
    ▼
┌─────────────────────┐
│   1. Working →      │  Summarize session, extract key concepts
│   Short-term        │  Save session summary to PostgreSQL
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   2. Short-term →   │  Update mastery levels (weighted by
│   Long-term         │  interaction quality and session depth)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   3. Knowledge      │  Update concept embeddings in Qdrant
│   Graph Update      │  Strengthen/weaken edges based on usage
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   4. Profile        │  Update learning style inferences
│   Update            │  Adjust confidence scores
└─────────────────────┘
```

---

## Conversation Memory

### Structure

```json
{
  "session_id": "uuid",
  "user_id": "uuid",
  "messages": [
    {
      "role": "user",
      "content": "Explain entropy",
      "intent": "teach",
      "subject": "physics",
      "concepts": ["entropy", "thermodynamics"],
      "timestamp": "ISO8601"
    },
    {
      "role": "assistant",
      "content": "...",
      "concepts_covered": ["entropy", "second_law"],
      "evaluation_score": 0.92,
      "timestamp": "ISO8601"
    }
  ],
  "context": {
    "active_subject": "physics",
    "active_topic": "thermodynamics",
    "recent_concepts": ["entropy", "enthalpy", "gibbs_free_energy"],
    "current_explanation_depth": "deep_dive",
    "unresolved_questions": []
  }
}
```

### Retention Policy

| Memory Type | Max Age | Max Size | Consolidation Trigger |
|---|---|---|---|
| Working memory (Redis) | 1 hour | Last 50 messages | Session idle > 30 min |
| Short-term (PostgreSQL) | 30 days | Last 100 sessions | Session count > 100 |
| Long-term (PostgreSQL) | Indefinite | All sessions | Summarized monthly |

### Context Window Management

```python
def build_context_window(session, max_tokens=8000):
    """
    Build the context window for the AI from conversation memory.
    Prioritizes: current topic > recent messages > session summary > profile
    """
    context_parts = []
    tokens_used = 0
    
    # 1. Current topic context (highest priority)
    topic_context = get_topic_context(session.active_topic, session.active_subject)
    if tokens_used + topic_context.tokens < max_tokens:
        context_parts.append(topic_context.content)
        tokens_used += topic_context.tokens
    
    # 2. Recent messages (last 5-10)
    recent_messages = session.get_recent_messages(10)
    for msg in recent_messages:
        if tokens_used + msg.tokens < max_tokens:
            context_parts.append(format_message(msg))
            tokens_used += msg.tokens
    
    # 3. Session summary (if messages not enough)
    if tokens_used < max_tokens * 0.5:
        summary = session.get_summary()
        context_parts.append(f"[Session Context: {summary}]")
    
    # 4. Learning profile summary
    if tokens_used < max_tokens * 0.7:
        profile = get_profile_summary(session.user_id)
        context_parts.append(f"[Learner: {profile}]")
    
    return "\n".join(context_parts)
```

---

## Long-Term Memory

### Learning Profile

```json
{
  "user_id": "uuid",
  "metadata": {
    "created_at": "ISO8601",
    "updated_at": "ISO8601",
    "total_sessions": 142,
    "total_study_hours": 87.5,
    "current_streak": 12,
    "longest_streak": 45
  },
  "preferences": {
    "default_depth": "balanced",
    "inferred_learning_style": "visual",    // Auto-detected
    "confidence_trend": "improving",        // improving | stable | declining
    "preferred_session_length_minutes": 25
  },
  "goals": {
    "short_term": ["Master calculus derivatives", "Complete linear algebra"],
    "long_term": ["Build AI portfolio", "Contribute to open-source ML"],
    "target_exams": ["MIT admissions", "AP Calculus BC"],
    "career_interests": ["Machine Learning", "Systems Engineering"]
  },
  "state_summary": {
    "total_concepts_encountered": 342,
    "concepts_mastered": 128,
    "subjects_studied": ["Mathematics", "Physics", "Computer Science"],
    "strongest_subject": "Physics",
    "weakest_subject": "Computer Science",
    "average_depth_per_session": "balanced",
    "curiosity_score": 0.82  // 0.0-1.0 based on follow-up engagement
  }
}
```

### Knowledge State

```json
{
  "concept_mastery": [
    {
      "concept": "entropy",
      "subject": "physics",
      "mastery_level": "familiar",
      "confidence": 0.78,
      "times_encountered": 12,
      "times_correct": 8,
      "times_incorrect": 2,
      "last_reviewed": "ISO8601",
      "next_review": "ISO8601",
      "misconceptions_corrected": [
        "entropy_equals_disorder"
      ],
      "source_sessions": ["uuid1", "uuid2"],
      "prerequisites_met": true
    }
  ],
  "subject_overview": {
    "physics": {
      "overall_mastery": 0.72,
      "concepts_encountered": 98,
      "concepts_mastered": 45,
      "strongest_topics": ["classical_mechanics", "thermodynamics"],
      "weakest_topics": ["quantum_mechanics", "electromagnetism"]
    }
  }
}
```

### Interaction Memory

```json
{
  "recent_topics": [
    {
      "topic": "thermodynamics",
      "last_visited": "ISO8601",
      "times_visited": 8,
      "current_focus": "entropy"
    }
  ],
  "recurring_patterns": [
    {
      "pattern": "asks_why_before_how",
      "frequency": "often",
      "implication": "Conceptually driven learner"
    },
    {
      "pattern": "needs_visual_examples",
      "frequency": "sometimes",
      "implication": "Prefers visual + textual learning"
    }
  ],
  "memorable_interactions": [
    {
      "type": "breakthrough",
      "description": "Suddenly understood entropy after thermodynamic analogy",
      "date": "ISO8601"
    }
  ]
}
```

---

## Learning Style Inference

### Inference Algorithm

```python
def infer_learning_style(interaction_history):
    """
    Analyzes past interactions to detect learning style preferences.
    Returns probabilities for each style dimension.
    """
    style_scores = {
        "visual": 0.0,
        "textual": 0.0,
        "interactive": 0.0,
        "mixed": 0.0
    }
    
    for interaction in interaction_history:
        # Did the learner engage with visual content?
        if interaction.get("diagrams_viewed", 0) > interaction.get("text_blocks_read", 0):
            style_scores["visual"] += 1
        
        # Did the learner ask for deeper textual explanations?
        if "explain more" in interaction.get("follow_up_queries", []):
            style_scores["textual"] += 1
        
        # Did the learner engage with interactive elements?
        if "hint" in interaction.get("features_used", []):
            style_scores["interactive"] += 1
        
        # Did the learner vary their approach?
        if interaction.get("depth_changes", 0) > 2:
            style_scores["mixed"] += 0.5
    
    # Normalize
    total = sum(style_scores.values())
    if total > 0:
        for k in style_scores:
            style_scores[k] /= total
    
    dominant = max(style_scores, key=style_scores.get)
    return dominant if style_scores[dominant] > 0.4 else "mixed"
```

### Inferred Dimensions

| Dimension | Signals | Update Frequency |
|---|---|---|
| Visual vs. Textual | Engages more with diagrams vs. prose | Weekly |
| Concrete vs. Abstract | Prefers examples vs. theory | Weekly |
| Sequential vs. Holistic | Step-by-step vs. big picture | Monthly |
| Active vs. Reflective | Tries problems vs. reads explanations | Monthly |
| Deep vs. Broad | One topic deeply vs. many topics | Monthly |

---

## Weak Concept Detection

### Detection Algorithm

```python
def detect_weak_concepts(profile, threshold=0.4):
    """
    Identify concepts that need attention based on:
    1. Low mastery scores
    2. Repeated misconceptions
    3. Long time since review
    4. High error rates on quizzes
    """
    weak_concepts = []
    
    for concept in profile.concept_mastery:
        score = 0
        reasons = []
        
        # Factor 1: Low mastery level
        mastery_weights = {
            "undiscovered": 0.0,
            "introduced": 0.2,
            "developing": 0.4,
            "familiar": 0.6,
            "mastered": 0.8,
            "can_teach": 1.0
        }
        mastery_normalized = mastery_weights.get(concept.mastery_level, 0)
        score += mastery_normalized * 0.4
        
        # Factor 2: Error rate
        total_attempts = concept.times_correct + concept.times_incorrect
        if total_attempts > 0:
            error_rate = concept.times_incorrect / total_attempts
            score += (1 - error_rate) * 0.3
        
        # Factor 3: Time since last review
        if concept.next_review and concept.next_review < datetime.now():
            days_overdue = (datetime.now() - concept.next_review).days
            time_factor = min(days_overdue / 30, 1.0)
            score += (1 - time_factor) * 0.2
        
        # Factor 4: Misconception count
        misconception_count = len(concept.misconceptions_corrected)
        if misconception_count > 0:
            misconception_factor = min(misconception_count / 5, 1.0)
            score += (1 - misconception_factor) * 0.1
        
        if score < threshold:
            weak_concepts.append({
                "concept": concept.concept_name,
                "score": score,
                "reasons": reasons,
                "recommended_action": suggest_remediation(concept)
            })
    
    return sorted(weak_concepts, key=lambda x: x["score"])
```

---

## Interest & Goal Tracking

### Interest Detection

```python
def detect_interests(profile, recent_sessions):
    """
    Detect evolving interests based on:
    1. Time spent per topic
    2. Follow-up questions asked
    3. Topics revisited voluntarily
    4. Depth of exploration
    """
    interests = {}
    
    for session in recent_sessions:
        for topic in session.topics:
            if topic not in interests:
                interests[topic] = {
                    "total_time_minutes": 0,
                    "session_count": 0,
                    "follow_up_count": 0,
                    "max_depth_reached": "quick"
                }
            
            entry = interests[topic]
            entry["total_time_minutes"] += session.duration_minutes
            entry["session_count"] += 1
            entry["follow_up_count"] += session.follow_up_count
            entry["max_depth_reached"] = max_depth(
                entry["max_depth_reached"],
                session.depth_used
            )
    
    # Compute interest score
    for topic, data in interests.items():
        data["interest_score"] = (
            data["total_time_minutes"] * 0.3 +
            data["session_count"] * 0.2 +
            data["follow_up_count"] * 0.3 +
            depth_weight(data["max_depth_reached"]) * 0.2
        )
    
    return sorted(interests.items(), key=lambda x: x[1]["interest_score"], reverse=True)
```

### Goal Tracking

Goals are stored with progress metrics:

```json
{
  "goals": [
    {
      "id": "uuid",
      "type": "exam_prep",
      "target": "AP Calculus BC",
      "target_date": "2026-05-15",
      "status": "in_progress",
      "progress": 0.65,  // 0.0 to 1.0
      "milestones": [
        {"description": "Derivatives mastered", "completed": true, "date": "ISO8601"},
        {"description": "Integrals mastered", "completed": true, "date": "ISO8601"},
        {"description": "Series mastered", "completed": false}
      ],
      "predicted_score": 4,  // AP score 1-5
      "study_hours_completed": 42,
      "study_hours_estimated": 60,
      "last_updated": "ISO8601"
    }
  ]
}
```

---

## Memory Operations API

### Read Operations

```python
# Get learner profile (cached in Redis, fallback to PostgreSQL)
def get_learner_profile(user_id: str) -> LearnerProfile:
    # Check Redis cache first
    cached = redis.get(f"user:{user_id}:profile")
    if cached:
        return deserialize(cached)
    
    # Fallback to PostgreSQL
    profile = db.get_user_profile(user_id)
    
    # Cache for 5 minutes
    redis.setex(f"user:{user_id}:profile", 300, serialize(profile))
    return profile

# Get concept mastery for a subject
def get_concept_mastery(user_id: str, subject: str) -> list[ConceptMastery]:
    return db.query(ConceptMastery).filter(
        user_id=user_id,
        subject=subject
    ).all()

# Get due reviews
def get_due_reviews(user_id: str) -> list[ConceptMastery]:
    return db.query(ConceptMastery).filter(
        user_id=user_id,
        next_review_at <= datetime.now()
    ).order_by(ConceptMastery.next_review_at).all()

# Semantic search across past sessions
def search_memories(user_id: str, query: str, limit: int = 5) -> list[MemoryResult]:
    query_embedding = embed(query)
    results = qdrant.search(
        collection_name="sessions",
        query_vector=query_embedding,
        filter={"user_id": user_id},
        limit=limit
    )
    return results
```

### Write Operations

```python
# Update after every interaction
def update_after_interaction(session: Session, message: Message):
    async with db.transaction():
        # 1. Update session state
        update_session_state(session, message)
        
        # 2. Extract concepts
        concepts = extract_concepts(message)
        
        # 3. Update concept mastery
        for concept in concepts:
            update_concept_mastery(session.user_id, concept)
        
        # 4. Detect misconceptions
        misconceptions = detect_misconceptions(message)
        for mc in misconceptions:
            store_misconception(session.user_id, mc)
        
        # 5. Update learning style inference
        update_style_inference(session.user_id, session)
    
    # 6. Update embeddings (async)
    update_embeddings(session.user_id, message, concepts)
    
    # 7. Invalidate relevant caches
    invalidate_caches(session.user_id)

# Consolidate at session end
def consolidate_session(session: Session):
    # Generate session summary via AI (Reflection Agent)
    summary = generate_session_summary(session)
    
    # Update long-term memory
    update_learning_profile(session.user_id, summary)
    
    # Schedule spaced repetition reviews
    schedule_reviews(session)
    
    # Archive to short-term memory
    archive_session(session)
```

### Cache Invalidation Strategy

```python
CACHE_CONFIG = {
    "user:{id}:profile": {"ttl": 300, "invalidate_on": ["profile_update"]},
    "user:{id}:mastery:{subject}": {"ttl": 600, "invalidate_on": ["interaction"]},
    "user:{id}:due_reviews": {"ttl": 300, "invalidate_on": ["interaction"]},
    "session:{id}:context": {"ttl": 3600, "invalidate_on": ["new_message"]},
    "kg:related:{concept}": {"ttl": 3600, "invalidate_on": ["kg_update"]},
}

def invalidate_caches(user_id: str, trigger: str = None):
    for key, config in CACHE_CONFIG.items():
        if trigger in config.get("invalidate_on", []):
            pattern = key.format(id=user_id, subject="*")
            redis.delete_pattern(pattern)
```
