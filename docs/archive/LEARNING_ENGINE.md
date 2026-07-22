# Learning Engine

> **Version 1.0 — The pedagogical core of Synaris: learning modes, adaptation strategies, and knowledge systems**

---

## Table of Contents

1. [Educational Philosophy](#educational-philosophy)
2. [Learning Modes](#learning-modes)
3. [Depth Adaptation System](#depth-adaptation-system)
4. [Pedagogical Strategies](#pedagogical-strategies)
5. [Spaced Repetition System](#spaced-repetition-system)
6. [Misconception Detection](#misconception-detection)
7. [Assessment Engine](#assessment-engine)
8. [Gamification System](#gamification-system)
9. [Knowledge Graph Integration](#knowledge-graph-integration)
10. [Study Planner Algorithm](#study-planner-algorithm)

---

## Educational Philosophy

### Foundational Principles

Synaris is built on a synthesis of proven educational research:

| Principle | Source | Application |
|---|---|---|
| **Bloom's Taxonomy** | Bloom (1956) | Questions and explanations target specific cognitive levels |
| **First Principles Thinking** | Physics tradition | Break down to fundamentals, rebuild |
| **Feynman Technique** | Richard Feynman | Explain simply to reveal gaps |
| **Active Recall** | Roediger & Karpicke | Retrieve, don't re-read |
| **Spaced Repetition** | Ebbinghaus | Optimal review intervals |
| **Socratic Method** | Plato | Guide through questions, not answers |
| **Zone of Proximal Development** | Vygotsky | Challenge at the edge of competence |
| **Growth Mindset** | Dweck | Mistakes = learning opportunities |
| **Schema Theory** | Piaget | Connect new knowledge to existing structures |
| **Cognitive Load Theory** | Sweller | Optimize information chunking |
| **Dual Coding** | Paivio | Combine verbal + visual |

### The Synaris Learning Model

```
                    ┌─────────────────────┐
                    │    ENCOUNTER        │
                    │  New concept or     │
                    │  question           │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    DIAGNOSE         │
                    │  What does the      │
                    │  learner already    │
                    │  know?              │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
           ┌─────────────────┐  ┌──────────────────┐
           │  TEACH           │  │  PRACTICE        │
           │  Explain         │  │  Apply knowledge │
           │  Connect         │  │  Active recall   │
           │  Demonstrate     │  │  Problem solving │
           └────────┬────────┘  └────────┬─────────┘
                    │                     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    VERIFY           │
                    │  Did they           │
                    │  understand?        │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
           ┌─────────────────┐  ┌──────────────────┐
           │  YES             │  │  NO              │
           │  Move forward    │  │  Diagnose why    │
           │  Deepen          │  │  Re-teach        │
           │  Connect         │  │  Simplify        │
           └─────────────────┘  └──────────────────┘
```

---

## Learning Modes

### 1. Quick Mode

**Purpose:** Fast answers for when you need the core insight immediately.

**Characteristics:**
- Response length: 1–3 sentences
- Time: ~1 second
- Best for: Reminders, definitions, quick clarifications
- Pedagogy: Minimal — just the essential insight

**When to use:**
- "What's the formula for kinetic energy?"
- "Remind me what a derivative is"
- "What's the capital of Mongolia?"

**AI prompt modifier:**
```
You are in QUICK mode.
Give the shortest possible correct answer.
1–3 sentences maximum.
Use simple language.
Prioritize accuracy over completeness.
```

---

### 2. Balanced Mode (Default)

**Purpose:** The sweet spot between speed and depth.

**Characteristics:**
- Response length: 2–4 paragraphs
- Time: ~2–3 seconds
- Best for: General learning, understanding core concepts
- Pedagogy: Explanation + one example + one analogy

**When to use:**
- "Explain entropy"
- "How does a neural network work?"
- "What caused the French Revolution?"

**AI prompt modifier:**
```
You are in BALANCED mode.
Provide a clear, complete explanation.
Include:
1. Core concept (1 paragraph)
2. Concrete example (1 paragraph)
3. An analogy or connection (1 paragraph)
Adapt to the learner's level.
Use natural language.
```

---

### 3. Deep Dive Mode

**Purpose:** Thorough understanding of complex topics.

**Characteristics:**
- Response length: Comprehensive (5+ paragraphs)
- Time: ~5–10 seconds
- Best for: Mastering difficult concepts, exam preparation
- Pedagogy: First principles → build up → multiple perspectives → applications

**Structure:**
1. **Foundation:** What you need to know first
2. **Core explanation:** The concept from first principles
3. **Formal treatment:** Equations, proofs, definitions (if applicable)
4. **Multiple perspectives:** How different fields view this concept
5. **Real-world applications:** Where this shows up in practice
6. **Edge cases:** What happens at the boundaries
7. **Common misconceptions:** What people often get wrong
8. **Open questions:** What we still don't fully understand
9. **Connections:** How this relates to other concepts
10. **Further reading:** Where to go deeper

**When to use:**
- "I want to truly understand quantum mechanics"
- "Teach me everything about the Riemann Hypothesis"
- "Deep dive into transformer architectures"

---

### 4. Expert Mode

**Purpose:** For learners who already understand the basics and want depth.

**Characteristics:**
- Assumes: Strong knowledge of fundamentals
- Language: Technical, precise, formal where appropriate
- Focus: Edge cases, formalisms, recent research, open problems
- References: Points to papers, proofs, advanced resources

**When to use:**
- "I'm a physics major, explain the path integral formulation"
- "Give me the formal proof of the Central Limit Theorem"
- "What are the current open problems in LLM alignment?"

---

### 5. Challenge Mode

**Purpose:** Push the learner with problems at the edge of their ability.

**Mechanics:**
- AI generates progressively harder problems
- Based on current mastery level + 1
- Hints available on demand
- Multiple attempts allowed
- Partial credit for good reasoning

**Scoring:**
```
Problem Difficulty = mastery_level + 0.5
Hint penalty: -10% per hint
Time bonus: +5% if solved in < 1 minute
Perfect score: 100 XP
```

---

### 6. Exam Mode

**Purpose:** Simulate real exam conditions.

**Features:**
- Timed sections
- Randomized questions from concept bank
- Auto-grading with partial credit
- Performance analytics after completion
- Comparison to benchmarks

**Question types:**
- Multiple choice
- Free response (AI-graded with rubric)
- Multi-step problems
- Essay questions

---

### 7. Tutor Mode

**Purpose:** Guided, curriculum-based learning.

**Features:**
- Structured curriculum path
- Sequential concept progression
- Periodic checkpoints and reviews
- Adaptive pacing (faster if mastering, slower if struggling)
- Project-based assessments

**Curriculum structure:**
```
Subject → Course → Unit → Module → Lesson → Concept
```

---

## Depth Adaptation System

### Automatic Depth Selection

Synaris automatically selects the appropriate depth based on:

```python
def select_depth(learner_profile, question_complexity, session_context):
    score = 0
    
    # Factor 1: User's default preference
    depth_weights = {
        "quick": 0,
        "balanced": 1,
        "deep_dive": 2,
        "expert": 3
    }
    score += depth_weights[learner_profile.preferred_depth] * 0.3
    
    # Factor 2: Question complexity (estimated by AI)
    score += question_complexity * 0.4
    
    # Factor 3: Time available (from context)
    if session_context.get("time_available_minutes", 30) < 5:
        score -= 1
    elif session_context.get("time_available_minutes", 30) > 30:
        score += 1
    
    # Factor 4: Previous engagement
    if learner_profile.curiosity_score > 0.8:
        score += 0.5
    
    # Map score to depth
    if score < 0.5: return "quick"
    elif score < 1.5: return "balanced"
    elif score < 2.5: return "deep_dive"
    else: return "expert"
```

### Manual Override

Users can always manually select the depth using buttons in the input area:

```
[Quick] [Balanced] [Deep Dive] [Expert] <--- clickable
```

Current selection is highlighted. Lasts for session or until changed.

---

## Pedagogical Strategies

### Strategy Selection

Synaris selects a pedagogical strategy based on the learner's profile and the topic:

| Strategy | Best For | Method |
|---|---|---|
| **Socratic** | Building reasoning skills | Question-guided discovery |
| **Feynman** | Deep understanding | Explain simply, identify gaps |
| **First Principles** | Foundational subjects | Break down to basics |
| **Example-Driven** | Applied subjects | Learn through cases |
| **Problem-Based** | Skill development | Learn by solving |
| **Storytelling** | History, literature | Narrative engagement |
| **Analogy** | Abstract concepts | Connect to familiar ideas |
| **Visual** | Spatial/visual learners | Diagrams, mind maps |

### Feynman Technique Implementation

```
Step 1: Explain the concept in simple language
        ↓
Step 2: Identify gaps in the explanation
        ↓
Step 3: Review and simplify
        ↓
Step 4: Use analogies and examples
        ↓
Step 5: Teach it back to the user
```

**AI prompt:**
```
Use the Feynman Technique:
1. First, explain the concept as if to someone with no background
2. Ask the learner to identify parts that are unclear
3. For unclear parts, find simpler analogies
4. Connect to everyday experiences
5. End by asking the learner to explain it back
```

### Socratic Strategy

```
Rather than explaining directly, guide the learner through questions:

User: "How does a rocket work in space if there's no air to push against?"

AI: "Great question. Let's work through it.
First, what do you know about Newton's Third Law?"
User: "Every action has an equal and opposite reaction?"
AI: "Exactly. So if the rocket expels gas in one direction..."
User: "...the rocket moves in the opposite direction!"
AI: "And does that need air to work?"
```

---

## Spaced Repetition System

### Algorithm (Modified SM-2)

```python
def calculate_next_review(mastery_level, times_correct, times_incorrect, consecutive_correct):
    # Base interval (in days)
    base_intervals = {
        "introduced": 1,
        "developing": 3,
        "familiar": 7,
        "mastered": 14,
        "can_teach": 30
    }
    
    # Get base interval for current level
    base_interval = base_intervals[mastery_level]
    
    # Modify based on performance
    if consecutive_correct >= 3:
        multiplier = 2.0  # Speed up if consistently correct
    elif times_incorrect > times_correct:
        multiplier = 0.5  # Slow down if struggling
    else:
        multiplier = 1.0
    
    # Apply confidence modifier
    confidence_modifier = 1.0
    if times_correct + times_incorrect > 0:
        accuracy = times_correct / (times_correct + times_incorrect)
        if accuracy > 0.9:
            confidence_modifier = 1.5
        elif accuracy < 0.6:
            confidence_modifier = 0.5
    
    interval = base_interval * multiplier * confidence_modifier
    return min(max(interval, 0.5), 90)  # Clamp between 12 hours and 90 days
```

### Review Queue

Concepts due for review appear in:
1. **Daily dashboard** — "Concepts to review today"
2. **Active session** — Periodic review prompts
3. **Notifications** — Optional email/in-app reminders

---

## Misconception Detection

### Detection Methods

1. **Explicit detection** — User states something incorrect:
   - "Entropy means disorder" → Detected as misconception

2. **Implicit detection** — User's questions reveal gaps:
   - "If entropy always increases, how do you freeze water?" → Possible misunderstanding of closed vs open systems

3. **Pattern detection** — Repeated errors across topics:
   - Consistently confuses correlation and causation → Flag as systemic

4. **Predictive detection** — Common misconceptions by topic:
   - Learning quantum mechanics → Pre-emptively address "particles are tiny balls"

### Misconception Response

```json
{
  "detected_misconception": {
    "concept": "entropy",
    "user_belief": "Entropy equals disorder",
    "correction": "Entropy is a measure of the number of possible microscopic configurations of a system. While it often correlates with our intuitive sense of 'disorder', the precise definition is statistical.",
    "analogy": "Think of a deck of cards. A shuffled deck has more possible arrangements (higher entropy) than a sorted deck. The cards aren't 'disordered' — there are just more ways to be shuffled.",
    "severity": "moderate",
    "follow_up_question": "Can you think of a situation where a system becomes more ordered but entropy still increases?"
  }
}
```

---

## Assessment Engine

### Question Generation

Questions are generated adaptively based on:
1. **Current concept** being studied
2. **Mastery level** of the learner
3. **Bloom's Taxonomy level** targeted
4. **Question type** (MCQ, free response, multi-step)

### Bloom's Taxonomy Levels

| Level | Example Question | Assessment |
|---|---|---|
| **Remember** | "What is the formula for...?" | Recall |
| **Understand** | "Explain why..." | Comprehension |
| **Apply** | "Solve this problem using..." | Application |
| **Analyze** | "Compare and contrast..." | Analysis |
| **Evaluate** | "Critique this argument..." | Evaluation |
| **Create** | "Design a solution for..." | Creation |

### Scoring Rubric

```python
def score_response(question_type, user_answer, correct_answer, rubric):
    if question_type == "multiple_choice":
        return 100 if user_answer == correct_answer else 0
    
    elif question_type == "free_response":
        # AI evaluates against rubric
        score = evaluate_with_rubric(user_answer, rubric)
        return score
    
    elif question_type == "multi_step":
        # Score each step independently
        step_scores = []
        for step, user_step, rubric_step in zip(steps, user_steps, rubric_steps):
            step_scores.append(score_response("free_response", user_step, None, rubric_step))
        return sum(step_scores) / len(step_scores)
```

---

## Gamification System

### XP System

| Action | XP Reward |
|---|---|
| Complete a learning session | +10 XP |
| Master a new concept | +25 XP |
| Maintain a 7-day streak | +50 XP |
| Correct a misconception | +15 XP |
| Complete a study plan task | +20 XP |
| Answer a challenge problem | +30 XP |
| Teach a concept (explain it back) | +40 XP |
| Help another learner (future) | +50 XP |

### Achievement System

| Achievement | Requirement | XP |
|---|---|---|
| First Steps | Complete first session | 10 |
| Curious Mind | Ask 10 follow-up questions | 25 |
| Deep Thinker | Complete 5 Deep Dive sessions | 50 |
| Knowledge Seeker | Master 10 concepts | 75 |
| Week Warrior | 7-day streak | 100 |
| Month Master | 30-day streak | 500 |
| Misconception Slayer | Correct 10 misconceptions | 100 |
| Study Planner | Complete first study plan | 50 |
| Challenge Accepted | Complete 10 challenge problems | 150 |
| Renaissance Mind | Study in 5 different subjects | 200 |
| Level 10 | Reach level 10 | 250 |
| Centurion | Reach level 100 | 5000 |

### Streak System

```
Streak = consecutive days with at least one learning session

Visual:
🔥 7-day streak → Fire emoji
💪 30-day streak → Muscle emoji
🌟 90-day streak → Star emoji
👑 365-day streak → Crown emoji

Streak freeze: 1 free day per month (no streak lost)
```

---

## Knowledge Graph Integration

### Graph Structure

```
[node] Entropy
    ├── [edge: prerequisite] Thermodynamics
    ├── [edge: related_to] Information Theory
    ├── [edge: application_of] Statistical Mechanics
    ├── [edge: related_to] Second Law of Thermodynamics
    └── [edge: example_of] Mixing of gases
```

### Learning Path Generation

```python
def generate_learning_path(target_concept, user_profile):
    # 1. Find the target concept in knowledge graph
    target_node = kg.get_node(target_concept)
    
    # 2. Find all prerequisite chains
    prerequisites = bfs_traverse(target_node, edge_type="prerequisite", direction="backward")
    
    # 3. Filter by user's current mastery
    needed = [c for c in prerequisites 
              if user_profile.mastery.get(c) in ("undiscovered", "introduced")]
    
    # 4. Order by dependency depth
    ordered = topological_sort(needed, edges="prerequisite")
    
    # 5. Add the target concept at the end
    ordered.append(target_concept)
    
    # 6. Add enrichment concepts
    enrichment = kg.get_related(target_concept, edge_type="related_to", limit=3)
    ordered.extend(enrichment)
    
    return ordered
```

---

## Study Planner Algorithm

### Input
- Target exam / goal (or custom)
- Date of exam
- Current mastery levels
- Available study time per week
- Preferred session length

### Algorithm

```python
def generate_study_plan(target, target_date, profile):
    # 1. Parse exam requirements
    exam_topics = get_exam_topics(target)
    
    # 2. Calculate available time
    days_until_exam = (target_date - today).days
    available_hours = days_until_exam * (profile.study_minutes_per_day / 60)
    
    # 3. Assess current state
    gaps = []
    for topic in exam_topics:
        mastery = profile.get_mastery(topic)
        if mastery in ("undiscovered", "introduced"):
            gaps.append(topic)
    
    # 4. Prioritize gaps
    gaps.sort(key=lambda t: (
        exam_topics[t].weight,  # Higher weight = higher priority
        -exam_topics[t].difficulty  # Harder topics first
    ))
    
    # 5. Allocate time
    time_per_topic = available_hours / len(gaps)
    
    # 6. Schedule sessions
    schedule = []
    current_date = today
    for topic in gaps:
        sessions_needed = ceil(time_per_topic / profile.session_length_hours)
        for i in range(sessions_needed):
            schedule.append({
                "date": current_date,
                "topic": topic,
                "type": "learn" if i == 0 else "review",
                "duration_minutes": profile.session_length_minutes
            })
            current_date += timedelta(days=1)
    
    # 7. Add spaced repetition reviews
    for topic in gaps:
        for interval in [1, 3, 7, 14]:  # Days after first session
            review_date = start_date + timedelta(days=interval)
            schedule.append({
                "date": review_date,
                "topic": topic,
                "type": "review",
                "duration_minutes": 15
            })
    
    return schedule
```
