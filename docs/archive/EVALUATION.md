# Evaluation System

> **How Synaris measures, scores, and continuously improves every response**

---

## Table of Contents

1. [Why Evaluation Matters](#why-evaluation-matters)
2. [The 10 Evaluation Dimensions](#the-10-evaluation-dimensions)
3. [Quality Gates](#quality-gates)
4. [Evaluation Pipeline](#evaluation-pipeline)
5. [Hallucination Detection](#hallucination-detection)
6. [Continuous Improvement](#continuous-improvement)

---

## Why Evaluation Matters

In traditional software, you can assert that `2 + 2 = 4`. The test either passes or fails.

In AI systems, responses are probabilistic. You can't assert what the model will say. You can only evaluate *how good* the response is.

Synaris treats evaluation as a **first-class system component** — not an afterthought. Every response is scored before delivery. If it doesn't meet quality thresholds, it's regenerated.

This is what separates Synaris from a chatbot. We know when we're uncertain.

---

## The 10 Evaluation Dimensions

Every response is scored on 10 dimensions (0.0–1.0):

| # | Dimension | Weight | Description | Passing Threshold |
|---|---|---|---|---|
| 1 | **Accuracy** | Critical | Factual correctness | ≥ 0.90 |
| 2 | **Reasoning** | Critical | Sound logic, no leaps | ≥ 0.85 |
| 3 | **Pedagogy** | High | Well-explained for learner's level | ≥ 0.75 |
| 4 | **Hallucination Risk** | Critical | Unverified claims | ≤ 0.10 (inverted) |
| 5 | **Confidence** | High | Appropriate confidence level | ≥ 0.80 |
| 6 | **Completeness** | High | Fully addresses the question | ≥ 0.80 |
| 7 | **Readability** | Medium | Clear, well-structured | ≥ 0.70 |
| 8 | **Citation Quality** | Medium | Properly referenced | ≥ 0.60 |
| 9 | **Safety** | Critical | No harmful content | ≥ 0.95 |
| 10 | **Bias** | Medium | Balanced perspectives | ≥ 0.70 |

### Dimension Details

#### 1. Accuracy
```
Score 1.0: Every claim is correct, no imprecision
Score 0.8: Minor imprecision, core accuracy maintained
Score 0.5: Contains an error
Score 0.0: Multiple errors or fundamentally wrong
```

#### 2. Reasoning
```
Score 1.0: Flawless logic, every step verified
Score 0.8: One minor logical leap
Score 0.5: Missing step or assumption not justified
Score 0.0: Circular reasoning or non-sequitur
```

#### 3. Pedagogy
```
Score 1.0: Perfectly adapted — right depth, examples, connections
Score 0.8: Good explanation, could use better examples
Score 0.5: Doesn't match learner's level
Score 0.0: Confusing or misleading explanation
```

#### 4. Hallucination Risk
```
Score 0.0: All claims verified, sources cited
Score 0.3: Most claims verified, some inference flagged
Score 0.7: Unverified claims presented as fact
Score 1.0: Fabricated information presented confidently
```

---

## Quality Gates

### Gate 1: Pre-Response (Before LLM Call)

```
Input Validation
├── Is the input meaningful? (not empty, not spam)
├── Is it educational? (not off-topic)
├── Is it safe? (no harmful requests)
└── Is the user within rate limits?
```

**Action:** Reject non-educational requests early. Don't waste LLM calls.

### Gate 2: Intra-Response (During Generation)

```
Response Monitoring
├── Is the model responding in the expected format?
├── Are there signs of prompt injection?
├── Is the response length reasonable?
└── Is it completing within timeout?
```

**Action:** Cancel and regenerate if anomalies detected.

### Gate 3: Post-Response (After Generation, Before Delivery)

```
Full Evaluation (10 Dimensions)
├── Score ≥ 0.7 on all critical dimensions → PASS → Deliver to user
├── Score 0.5-0.7 on any critical dimension → FLAG → Regenerate
├── Score < 0.5 on any dimension → FAIL → Regenerate entirely
└── Hallucination risk > 0.3 → FAIL → Regenerate with stricter constraints
```

### Gate 4: Post-Delivery (After User Receives Response)

```
User Feedback Collection
├── Thumbs up/down
├── Rating (1-5)
├── Detailed feedback (optional)
└── Implicit signals (time spent, follow-ups asked)
```

---

## Evaluation Pipeline

```
Response Generated
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│              EVALUATION PIPELINE                         │
│                                                          │
│  1. Automated Check (Rule-based)                         │
│     - Contains LaTeX? Validate syntax                    │
│     - Contains code? Validate syntax                     │
│     - Contains URLs? Validate reachable                  │
│     - Length within expected range?                      │
│     - Contains flagged keywords? (harmful content check) │
│                                                          │
│  2. DeepEval (AI-based)                                  │
│     - AnswerRelevancyMetric                              │
│     - HallucinationMetric                                │
│     - FaithfulnessMetric                                 │
│     - ToxicityMetric                                     │
│                                                          │
│  3. Custom Rubric (Synaris-specific)                     │
│     - PedagogyScore: Is it well-taught?                  │
│     - ReasoningScore: Is the logic sound?                │
│     - DepthScore: Does it match the mode?                │
│     - CompletenessScore: Everything covered?             │
│                                                          │
│  4. Comparison Check                                     │
│     - Compare against expected answer (if known)         │
│     - Cross-reference knowledge graph                    │
│     - Check for contradiction with previous responses    │
│                                                          │
└─────────────────────────┬───────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
          PASS (≥0.7)            FAIL (<0.7)
              │                       │
              ▼                       ▼
      Deliver to User         Regenerate Pipeline
              │                  │
              │           ┌──────┴──────┐
              │           │             │
              │      Retry (new params)  Fallback (simpler model)
              │           │             │
              │           ▼             ▼
              │       Re-evaluate   Direct response
              ▼           │         (with uncertainty)
       User Feedback      │
              │           ▼
              ▼      Still FAIL?
       Update Profile    │
                         ▼
              Log to evaluation database
              Flag for human review
```

---

## Hallucination Detection

### Multi-Layer Detection

```
Layer 1: Pattern-based
  - Specific numerical claims (if >3 sig figs without source → flag)
  - Claims starting with "It is well known that..." → flag
  - Confident statements about obscure topics → flag
  - Historical/scientific dates without source → flag

Layer 2: Consistency check
  - Does the response contradict itself?
  - Does it contradict earlier responses?
  - Does the math check out (for quantitative claims)?

Layer 3: Knowledge graph check
  - Are claimed relationships in the knowledge graph?
  - If not → flag as potentially novel/invented

Layer 4: Cross-model verification (for critical responses)
  - Ask a different model the same question
  - Compare responses
  - If they disagree → flag uncertainty
```

### Hallucination Response Protocol

```python
HALLUCINATION_RESPONSE = {
    "detected": {
        "immediate_regeneration": True,
        "user_message": "I want to be honest with you — I'm not confident about that answer. Let me reconsider."
    },
    "suspected": {
        "immediate_regeneration": True,
        "add_disclaimer": "I believe this is correct, but I want to note that..."
    },
    "uncertain": {
        "add_uncertainty": "This is my understanding, though I'd recommend verifying with a primary source on..."
    }
}
```

---

## Continuous Improvement

### Feedback Loop

```
User Response → Evaluation → Score → Log → Analyze → Improve

Improvement actions:
  - Low accuracy → Adjust model or prompt
  - Low pedagogy → Improve Teaching Agent prompt
  - High hallucination → Add constraints
  - Low completeness → Add requirement to prompt
```

### Evaluation Database

Every evaluation is stored:

```json
{
    "response_id": "uuid",
    "session_id": "uuid",
    "evaluation": {
        "accuracy": {"score": 0.95, "issues": [], "verdict": "pass"},
        "reasoning": {"score": 0.92, "issues": [], "verdict": "pass"},
        "pedagogy": {"score": 0.88, "issues": ["Could use more examples"], "verdict": "pass"},
        "hallucination_risk": {"score": 0.02, "verdict": "pass"},
        "overall": {"score": 0.93, "verdict": "pass"}
    },
    "model_used": "claude-sonnet",
    "prompt_version": "1.2",
    "latency_ms": 2400,
    "user_feedback": {
        "rating": 5,
        "comment": "Perfect explanation"
    },
    "timestamp": "ISO8601"
}
```

### Improvement Triggers

| Condition | Action |
|---|---|
| Accuracy < 0.8 for 3+ responses from same agent | Adjust agent prompt |
| Hallucination risk > 0.2 for any response | Flag for review, tighten constraints |
| User rating < 3 for 5+ responses | Analyze patterns, adjust approach |
| Pedagogy score declining | Review Teaching Agent prompt |
| Response time > 10s | Check model selection, optimize |
