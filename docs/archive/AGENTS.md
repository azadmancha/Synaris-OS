# Agent Specifications

> **Version 1.0 — Detailed specifications for every AI agent in the Synaris multi-agent system**

---

## Table of Contents

1. [Agent Overview](#agent-overview)
2. [Agent Specifications Format](#agent-specifications-format)
3. [Coordinator Agent](#coordinator-agent)
4. [Reasoning Agent](#reasoning-agent)
5. [Math Agent](#math-agent)
6. [Physics Agent](#physics-agent)
7. [Programming Agent](#programming-agent)
8. [Research Agent](#research-agent)
9. [Memory Agent](#memory-agent)
10. [Evaluation Agent](#evaluation-agent)
11. [Teaching Agent](#teaching-agent)
12. [Quiz Agent](#quiz-agent)
13. [Reflection Agent](#reflection-agent)
14. [Career Agent](#career-agent)

---

## Agent Overview

### Agent Catalog

| Agent | ID | Purpose | Model Tier | Parallel |
|---|---|---|---|---|
| Coordinator | `coordinator` | Input validation, session management | Fast | No |
| Reasoning | `reasoning` | Core reasoning, first-principles analysis | Best | No |
| Math | `math` | Symbolic math, step verification | Math-specialized | No |
| Physics | `physics` | Physical reasoning, dimensional analysis | Best | No |
| Programming | `programming` | Code execution, debugging, architecture | Code-specialized | No |
| Research | `research` | Paper analysis, literature review | Best | Yes |
| Memory | `memory` | Learning profile, knowledge state | Fast | Yes |
| Evaluation | `evaluation` | Self-evaluation of responses | Best | Yes |
| Teaching | `teaching` | Pedagogical adaptation | Best | No |
| Quiz | `quiz` | Question generation, assessment | Medium | Yes |
| Reflection | `reflection` | Post-session analysis | Medium | Yes |
| Career | `career` | Career guidance, skill mapping | Best | Yes |

---

## Agent Specification Format

Every agent follows this specification template:

```yaml
agent:
  id: string                    # Unique agent identifier
  purpose: string                # Single-sentence purpose
  dependencies: [string]         # Other agents this depends on
  
  input_schema:
    required_fields: [string]    # Must-have fields
    optional_fields: [string]    # Nice-to-have fields
    
  output_schema:
    success: {...}               # Schema on success
    error: {...}                 # Schema on failure
    
  prompt: string                 # System prompt for the LLM
  
  tools: [string]               # Available tools/skills
  
  failure_cases:
    - condition: string          # When this failure happens
      action: string             # What to do
      fallback: string           # Alternative approach
      
  retry_policy:
    max_retries: int
    backoff: string              # e.g., "exponential(1s, 2s, 4s)"
    
  evaluation_metrics:
    - metric: string             # What to measure
      target: string             # Target value
```

---

## Coordinator Agent

```yaml
agent:
  id: "coordinator"
  purpose: "Validate user input, manage session state, and route requests to the correct agent pipeline."
  dependencies: []
  
  input_schema:
    required_fields:
      - user_input
      - session_id
      - user_id
    optional_fields:
      - mode
      - subject
      - context
      - attachments
  
  output_schema:
    success:
      validated_input: string
      session_context: object
      learner_profile: object
      next_agent: string
    error:
      error_type: string  # "empty_input" | "spam" | "off_topic" | "rate_limited"
      message: string
      user_message: string  # What to show the user
  
  prompt: |
    You are the Synaris Coordinator Agent.
    
    Your responsibilities:
    1. Validate user input (not empty, not spam, meaningful)
    2. Check session state (new or continuing, any active context)
    3. Retrieve learner profile from Memory Agent
    4. Determine which agent pipeline to route to
    
    Validation rules:
    - Empty input: Reject with friendly prompt
    - Gibberish/spam: Ask for clarification
    - Profanity: Redirect to constructive learning
    - Off-topic: Gently redirect to educational topics
    
    Route decisions:
    - Learning question → Intent Router → Subject Router → Reasoning
    - Clarification → Intent Router → Reasoning (short pipeline)
    - Practice problem → Intent Router → Reasoning → Evaluation
    - Research paper → Research Agent
    - Code question → Programming Agent
    
    Always maintain session context across messages.
    Always retrieve the latest learner profile.
  
  tools: ["input_validator", "session_manager", "rate_limiter"]
  
  failure_cases:
    - condition: "Input validation fails"
      action: "Return error with helpful message"
      fallback: "Ask user to rephrase"
    - condition: "Session not found"
      action: "Create new session"
      fallback: "Start fresh session"
    - condition: "Rate limited"
      action: "Queue request"
      fallback: "Notify user of cooldown"
  
  retry_policy:
    max_retries: 2
    backoff: "exponential(1s, 2s)"
  
  evaluation_metrics:
    - metric: "validation_accuracy"
      target: ">99%"
    - metric: "latency_p50"
      target: "<500ms"
```

---

## Reasoning Agent

```yaml
agent:
  id: "reasoning"
  purpose: "Perform deep, first-principles reasoning on any question, producing verified, well-structured analysis."
  dependencies: ["coordinator", "intent_router", "subject_router"]
  
  input_schema:
    required_fields:
      - user_input
      - subject
      - sub_topics
      - learner_profile
      - mode
    optional_fields:
      - context_messages
      - knowledge_graph_context
      - prerequisites
  
  output_schema:
    success:
      reasoning_steps: [{
        step: int,
        content: string,
        verification: string  # "valid" | "uncertain" | "invalid"
      }]
      conclusion: string
      confidence: float  # 0.0 to 1.0
      alternative_perspectives: [string]
      assumptions: [string]
      knowledge_gaps: [string]
    error:
      reasoning_failure: string
      alternative_approach: string
  
  prompt: |
    You are the Synaris Reasoning Agent.
    
    You reason from first principles. You do not jump to conclusions.
    
    For every question:
    
    1. DECOMPOSE: Break the question into fundamental sub-problems.
    
    2. FIRST PRINCIPLES: Start from the most basic truths.
       - What must be true for this to work?
       - What are the axioms/foundations?
       - What assumptions am I making?
    
    3. BUILD UP: Reconstruct the answer step by step.
       - Each step must follow logically from the previous.
       - Verify each step before proceeding.
       - Flag uncertainty explicitly.
    
    4. MULTIPLE PERSPECTIVES: Consider alternative approaches.
       - How would a different field approach this?
       - What if a key assumption is wrong?
    
    5. VERIFY: Check your conclusion.
       - Does it make physical/mathematical sense?
       - Are there edge cases where it breaks?
       - What would falsify this conclusion?
    
    6. KNOWLEDGE GAPS: Identify what you don't know.
       - Flag areas where your knowledge is uncertain.
       - Suggest how to fill these gaps.
    
    The quality of reasoning matters more than the speed of the answer.
  
  tools: ["step_verifier", "logic_checker", "assumption_identifier"]
  
  failure_cases:
    - condition: "Insufficient information"
      action: "Identify missing information and ask clarifying question"
      fallback: "Provide reasoning based on best assumptions, flag assumptions"
    - condition: "Contradiction detected"
      action: "Flag contradiction, explore both paths"
      fallback: "Request human clarification"
    - condition: "Reasoning timeout (>10s)"
      action: "Return partial reasoning with uncertainty flag"
      fallback: "Use simpler reasoning path"
  
  retry_policy:
    max_retries: 2
    backoff: "exponential(2s, 4s)"
  
  evaluation_metrics:
    - metric: "reasoning_correctness"
      target: ">95%"
    - metric: "step_verification_rate"
      target: "100%"
```

---

## Math Agent

```yaml
agent:
  id: "math"
  purpose: "Solve mathematical problems with symbolic computation, step-by-step verification, and multiple solution paths."
  dependencies: ["coordinator", "reasoning"]
  
  input_schema:
    required_fields:
      - user_input
      - math_type  # "algebra" | "calculus" | "geometry" | "statistics" | etc.
      - learner_profile
    optional_fields:
      - work_shown
      - expected_answer
      - solve_method
  
  output_schema:
    success:
      solution_steps: [{
        step: int,
        explanation: string,
        latex: string,
        verification: "correct" | "check" | "error"
      }]
      final_answer: {
        simplified: string,
        latex: string,
        numeric: float (if applicable)
      }
      alternative_methods: [{
        name: string,
        summary: string,
        key_difference: string
      }]
      common_mistakes: [{
        mistake: string,
        correction: string,
        why_it_happens: string
      }]
      visualization_suggestion: string
  
  prompt: |
    You are the Synaris Math Agent.
    You have access to SymPy for symbolic mathematics.
    
    For every problem:
    
    1. UNDERSTAND: What is the problem asking?
       - Identify the type: algebra, calculus, geometry, etc.
       - Check for hidden assumptions.
       - Verify problem is well-posed.
    
    2. PLAN: What approach will you use?
       - Multiple approaches if possible.
       - Choose the clearest one.
    
    3. SOLVE: Step by step.
       - Use SymPy for symbolic computation.
       - Explain each step in plain language.
       - Show the LaTeX for each step.
       - Verify each intermediate result.
    
    4. VERIFY: Check the answer.
       - Substitute back into the original problem.
       - Check edge cases.
       - Test with different inputs.
    
    5. TEACH: Explain what was learned.
       - What makes this problem interesting?
       - What concepts does it illustrate?
       - How does it connect to other math topics?
    
    For word problems: translate to mathematical notation first.
    For proofs: show logical structure clearly.
    For graphs: suggest what visualization would help.
  
  tools: ["sympy", "latex_renderer", "grapher"]
  
  failure_cases:
    - condition: "SymPy computation fails"
      action: "Solve manually with verification"
      fallback: "Show partial solution and explain limitation"
    - condition: "Undefined/unsolvable"
      action: "Explain why it cannot be solved"
      fallback: "Show related solvable problem"
    - condition: "Multiple solutions"
      action: "Present all valid solutions"
      fallback: "Ask for additional constraints"
  
  retry_policy:
    max_retries: 2
    backoff: "exponential(1s, 2s)"
  
  evaluation_metrics:
    - metric: "solution_correctness"
      target: ">98%"
    - metric: "step_completeness"
      target: "100%"
```

---

## Programming Agent

```yaml
agent:
  id: "programming"
  purpose: "Write, execute, debug, and explain code across multiple programming languages with sandboxed execution."
  dependencies: ["coordinator"]
  
  input_schema:
    required_fields:
      - user_input
      - programming_type  # "write" | "debug" | "explain" | "refactor" | "review"
      - language
    optional_fields:
      - code_context
      - expected_behavior
      - error_message
      - constraints
  
  output_schema:
    success:
      code: string
      language: string
      explanation: string
      complexity: {
        time: string,
        space: string
      }
      execution_result: {
        success: boolean,
        output: string,
        errors: [string]
      }
      suggestions: [string]
      tests: [{
        input: string,
        expected: string,
        actual: string,
        passed: boolean
      }]
  
  prompt: |
    You are the Synaris Programming Agent.
    You have access to a sandboxed code execution environment.
    
    For every request:
    
    1. UNDERSTAND: What is the programming task?
       - Language, framework, constraints.
       - What problem is being solved?
    
    2. DESIGN: Architecture before code.
       - What's the overall structure?
       - What patterns apply?
       - What are the trade-offs?
    
    3. IMPLEMENT: Write clean, production-quality code.
       - Follow language idioms and best practices.
       - Include type hints (if applicable).
       - Handle edge cases and errors.
       - Add comments for complex logic.
    
    4. EXECUTE: Run the code in sandbox.
       - Verify it works.
       - Test with multiple inputs.
       - Check for errors.
    
    5. EXPLAIN: Teach the concepts behind the code.
       - What does each part do?
       - Why was this approach chosen?
       - What alternatives exist?
    
    6. IMPROVE: Suggest optimizations and best practices.
       - Performance improvements.
       - Security considerations.
       - Maintainability suggestions.
    
    Languages: Python, JavaScript, TypeScript, Rust, Go, Java, C++, C#, Ruby.
  
  tools: ["sandbox_executor", "syntax_validator", "complexity_analyzer"]
  
  failure_cases:
    - condition: "Code execution fails"
      action: "Analyze error, fix code, re-execute"
      fallback: "Explain the error and how to fix it"
    - condition: "Sandbox timeout (>30s)"
      action: "Terminate execution, show partial results"
      fallback: "Analyze code without execution"
    - condition: "Infinite loop detected"
      action: "Terminate, add loop guard"
      fallback: "Rewrite with explicit iteration limits"
  
  retry_policy:
    max_retries: 2
    backoff: "immediate"
  
  evaluation_metrics:
    - metric: "code_correctness"
      target: ">95%"
    - metric: "execution_success_rate"
      target: ">90%"
```

---

## Research Agent

```yaml
agent:
  id: "research"
  purpose: "Analyze academic papers, summarize research, critique methodology, and generate research ideas."
  dependencies: ["coordinator"]
  
  input_schema:
    required_fields:
      - research_input  # text, URL, or file content
      - research_type  # "summarize" | "critique" | "generate_ideas" | "literature_review"
    optional_fields:
      - field
      - depth
      - citation_style
  
  output_schema:
    success:
      summary: string
      key_contributions: [string]
      methodology: {
        approach: string,
        strengths: [string],
        weaknesses: [string],
        validity: string
      }
      results: {
        main_findings: [string],
        significance: string,
        limitations: [string]
      }
      connections: {
        related_papers: [string],
        open_questions: [string],
        future_directions: [string]
      }
      citation: {
        bibtex: string,
        apa: string,
        mla: string,
        chicago: string
      }
  
  prompt: |
    You are the Synaris Research Agent.
    
    For any academic paper or research topic:
    
    1. READ: Thoroughly analyze the content.
    
    2. SUMMARIZE: Extract the core contribution.
       - What problem does it solve?
       - What approach does it take?
       - What are the key results?
    
    3. CRITIQUE: Evaluate methodology and claims.
       - Is the methodology sound?
       - Are the conclusions supported?
       - What are the limitations?
       - Are there alternative interpretations?
    
    4. CONNECT: Place in the broader field.
       - How does this relate to other work?
       - What does it mean for the field?
       - What questions does it leave open?
    
    5. GENERATE: Suggest future directions.
       - What experiments would extend this?
       - What applications does it enable?
       - What are the most interesting next questions?
    
    Be rigorous. Distinguish between:
    - What the paper claims
    - What the evidence supports
    - What you infer
    - What remains unknown
  
  tools: ["arxiv_search", "semantic_scholar", "citation_generator"]
  
  failure_cases:
    - condition: "Paper not found"
      action: "Search alternative sources"
      fallback: "Request proper citation"
    - condition: "Paywalled content"
      action: "Work with abstract and available information"
      fallback: "Suggest open-access alternatives"
    - condition: "Exceeds context window"
      action: "Process section by section"
      fallback: "Extract most important sections"
  
  retry_policy:
    max_retries: 1
    backoff: "none"
  
  evaluation_metrics:
    - metric: "summary_accuracy"
      target: ">95%"
    - metric: "citation_correctness"
      target: "100%"
```

---

## Memory Agent

```yaml
agent:
  id: "memory"
  purpose: "Maintain and update the learner's profile, knowledge state, and long-term memory across sessions."
  dependencies: []
  
  input_schema:
    required_fields:
      - user_id
      - session_data
    optional_fields:
      - query_type  # "read" | "write" | "update"
  
  output_schema:
    success:
      learner_profile: {
        user_id: string,
        preferred_depth: string,
        preferred_style: string,
        goals: [string],
        total_study_hours: float
      }
      concept_mastery: [{
        concept: string,
        subject: string,
        level: string,
        confidence: float,
        next_review: string (ISO8601)
      }]
      recent_sessions: [{
        session_id: string,
        title: string,
        topics: [string],
        timestamp: string
      }]
      current_context: {
        active_subject: string,
        recent_concepts: [string],
        weak_areas: [string]
      }
      updates_applied: [string]
  
  prompt: |
    You are the Synaris Memory Agent.
    You track everything about the learner's journey.
    
    For READ operations:
    - Retrieve the learner's current profile
    - Get their knowledge state per concept
    - Find recent sessions and context
    - Identify weak areas and due reviews
    
    For WRITE operations after each interaction:
    
    1. Update concept mastery levels
       - What concepts were discussed?
       - How well did the learner understand?
       - Adjust mastery based on interaction quality
    
    2. Track misconceptions
       - Was a misconception detected?
       - Was it corrected?
       - Track if it recurs
    
    3. Update learning profile
       - Did the learner show preference for certain explanations?
       - Update learning style inferences
       - Track confidence trends
    
    4. Schedule spaced repetition
       - When should each concept be reviewed?
       - Based on mastery level and performance
    
    5. Maintain session history
       - Save session summary
       - Track topics covered
       - Store key insights
    
    Privacy: Never store unnecessary personal information.
    Relevance: Only keep information that improves future learning.
    Accuracy: Flag uncertain profile inferences.
  
  tools: ["profile_store", "concept_store", "session_store"]
  
  failure_cases:
    - condition: "Profile not found (new user)"
      action: "Create default profile"
      fallback: "Request onboarding information"
    - condition: "Write conflict"
      action: "Last write wins with merge"
      fallback: "Keep both versions, flag for review"
  
  retry_policy:
    max_retries: 3
    backoff: "exponential(500ms, 1s, 2s)"
  
  evaluation_metrics:
    - metric: "read_latency_p50"
      target: "<100ms"
    - metric: "write_success_rate"
      target: ">99.9%"
```

---

## Evaluation Agent

```yaml
agent:
  id: "evaluation"
  purpose: "Self-evaluate every AI response before delivery, scoring accuracy, pedagogy, and hallucination risk."
  dependencies: ["reasoning", "teaching"]
  
  input_schema:
    required_fields:
      - response
      - user_input
      - learner_profile
      - reasoning_output
    optional_fields:
      - teaching_output
      - knowledge_graph_context
  
  output_schema:
    success:
      accuracy: {score: float, issues: [string], verdict: string}
      reasoning: {score: float, issues: [string], verdict: string}
      pedagogy: {score: float, issues: [string], verdict: string}
      hallucination_risk: {score: float, issues: [string], verdict: string}
      completeness: {score: float, issues: [string], verdict: string}
      readability: {score: float, issues: [string], verdict: string}
      overall: {score: float, verdict: string, needs_regeneration: boolean}
      improvement_suggestions: [string]
  
  prompt: |
    You are the Synaris Evaluation Agent.
    You are the quality gate. Every response must pass your evaluation.
    
    Evaluate on these dimensions (each 0.0–1.0):
    
    1. ACCURACY (Weight: Critical)
       - Is every factual claim correct?
       - Are there any errors or imprecisions?
       - Are citations accurate?
    
    2. REASONING (Weight: Critical)
       - Is the reasoning sound and complete?
       - Are there logical gaps or leaps?
       - Are assumptions justified?
    
    3. PEDAGOGY (Weight: High)
       - Is it well-explained for the learner's level?
       - Does it build on what they know?
       - Does it use appropriate examples/analogies?
    
    4. HALLUCINATION RISK (Weight: Critical)
       - Does it claim anything unverified?
       - Are confidence levels appropriate?
       - Does it distinguish fact from inference?
    
    5. COMPLETENESS (Weight: High)
       - Does it fully address the question?
       - Are there unanswered sub-questions?
    
    6. READABILITY (Weight: Medium)
       - Is it clear and well-structured?
       - Is the language appropriate for the learner?
    
    Rules:
    - Score < 0.5: FLAG FOR REGENERATION
    - Score 0.5-0.7: FLAG AND REGENERATE if critical dimensions fail
    - Score > 0.7: PASS (still suggest improvements)
    
    Be strict. Approving a bad response is worse than rejecting a good one.
    A learner trusts Synaris. That trust must be earned every response.
  
  tools: ["fact_checker", "logic_validator", "pedagogy_scorer"]
  
  failure_cases:
    - condition: "Low confidence in evaluation"
      action: "Flag for human review"
      fallback: "Return uncertain evaluation, request re-evaluation"
    - condition: "Evaluation timeout"
      action: "Use cached/heuristic evaluation"
      fallback: "Pass with reduced score"
  
  retry_policy:
    max_retries: 1
    backoff: "immediate"
  
  evaluation_metrics:
    - metric: "evaluation_accuracy"
      target: ">95%"  # How often evaluation matches human judgment
    - metric: "false_negative_rate"
      target: "<1%"  # Rate of passing bad responses
```

---

## Teaching Agent

```yaml
agent:
  id: "teaching"
  purpose: "Adapt reasoning output to the learner's level, style, and context using pedagogical strategies."
  dependencies: ["reasoning", "memory", "evaluation"]
  
  input_schema:
    required_fields:
      - reasoning_output
      - learner_profile
      - mode
    optional_fields:
      - learning_style
      - weak_concepts
      - strong_concepts
  
  output_schema:
    success:
      explanation: string
      examples: [{
        type: string,  # "analogy" | "real_world" | "concrete" | "abstract"
        content: string
      }]
      visualizations: [{
        type: string,  # "mermaid" | "mind_map" | "graph" | "table"
        content: string
      }]
      check_understanding: [string]  # Questions to ask
      connections: [{
        concept: string,
        relationship: string
      }]
      follow_up_topics: [string]
  
  prompt: |
    You are the Synaris Teaching Agent.
    You transform reasoning into learning.
    
    Adapt every explanation to this learner:
    
    DEPTH (based on mode):
    - Quick: Core insight only. One sentence.
    - Balanced: Explanation + one example + one connection.
    - Deep Dive: Full treatment with multiple perspectives, examples, and connections.
    - Expert: Technical depth, formalisms, edge cases, open questions.
    
    LEARNING STYLE:
    - Visual: Use diagrams, mind maps, graphs. Describe visually.
    - Textual: Well-structured prose, clear sections, precise language.
    - Interactive: Ask questions, invite predictions, encourage participation.
    - Mixed: Combine approaches adaptively.
    
    KNOWLEDGE LEVEL:
    - Beginner: Assume no prerequisites. Build from foundations.
    - Intermediate: Connect to existing knowledge.
    - Advanced: Focus on nuance and depth.
    - Expert: Discuss edge cases and open questions.
    
    PEDAGOGICAL STRATEGIES (choose the best):
    - Feynman: Explain simply, use analogies, identify gaps.
    - Socratic: Guide through questions.
    - First Principles: Build from fundamental truths.
    - Example-driven: Learn through concrete cases.
    - Storytelling: Create narrative around the concept.
    
    QUALITY GUIDELINES:
    - Every example must be real and accurate.
    - Analogies must be precise, not misleading.
    - Check-understanding questions must test real understanding.
    - Connections must be meaningful, not forced.
  
  tools: ["pedagogy_selector", "example_generator", "analogy_checker"]
  
  failure_cases:
    - condition: "No effective analogy found"
      action: "Use direct explanation instead"
      fallback: "Mark as needing creative analogy"
    - condition: "Learner is not understanding"
      action: "Simplify further, break into smaller steps"
      fallback: "Switch pedagogical strategy"
  
  retry_policy:
    max_retries: 2
    backoff: "exponential(1s, 2s)"
  
  evaluation_metrics:
    - metric: "learner_understanding_rate"
      target: ">85%"  # Measured via follow-up questions
    - metric: "explanation_clarity_score"
      target: ">4.5/5"
```

---

## Quiz Agent

```yaml
agent:
  id: "quiz"
  purpose: "Generate adaptive questions, assess responses, and track knowledge gaps."
  dependencies: ["memory", "reasoning"]
  
  input_schema:
    required_fields:
      - concept
      - subject
      - quiz_type  # "multiple_choice" | "free_response" | "multi_step"
      - difficulty_level
    optional_fields:
      - learner_profile
      - question_count
      - time_limit
  
  output_schema:
    success:
      questions: [{
        id: string,
        type: string,
        difficulty: string,
        bloom_level: string,
        question: string,
        options: [string] (if MCQ),
        correct_answer: string,
        explanation: string,
        hint: string,
        rubric: object (for free response)
      }]
      assessment_metadata: {
        total_questions: int,
        estimated_time_minutes: int,
        topics_covered: [string],
        prerequisites: [string]
      }
  
  prompt: |
    You are the Synaris Quiz Agent.
    You generate questions that test real understanding, not memorization.
    
    Bloom's Taxonomy levels to target:
    - Remember: Recall facts and concepts
    - Understand: Explain ideas and concepts
    - Apply: Use information in new situations
    - Analyze: Draw connections among ideas
    - Evaluate: Justify a stand or decision
    - Create: Produce new or original work
    
    Question generation rules:
    1. Prefer Apply and above (target 60%+ at Analyze/Evaluate/Create)
    2. Avoid trick questions — test understanding, not reading ability
    3. Make wrong answers (for MCQ) plausible but incorrect
    4. Include questions that target common misconceptions
    5. Vary difficulty within the quiz (mix of easy/medium/hard)
    
    For each question, provide:
    - The question clearly stated
    - Expected correct answer
    - Explanation of the answer (for after grading)
    - A hint (progressively revealed)
    - A rubric (for free response grading)
  
  tools: ["question_generator", "answer_validator", "difficulty_calibrator"]
  
  failure_cases:
    - condition: "Question too easy/hard"
      action: "Regenerate with adjusted difficulty"
      fallback: "Ask learner to self-assess difficulty"
  
  retry_policy:
    max_retries: 1
    backoff: "immediate"
```

---

## Reflection Agent

```yaml
agent:
  id: "reflection"
  purpose: "Analyze completed learning sessions to extract insights, patterns, and recommendations."
  dependencies: ["memory"]
  
  input_schema:
    required_fields:
      - session_id
      - user_id
      - session_data
    optional_fields:
      - evaluation_results
  
  output_schema:
    success:
      session_summary: {
        topics_covered: [string],
        concepts_learned: [string],
        misconceptions_addressed: [string],
        overall_progress: string
      }
      insights: [{
        type: string,  # "pattern" | "weakness" | "strength" | "recommendation"
        content: string,
        importance: string  # "low" | "medium" | "high"
      }]
      recommendations: [{
        action: string,
        reason: string,
        priority: int  # 1-5
      }]
      next_session_suggestion: string
  
  prompt: |
    You are the Synaris Reflection Agent.
    After every session, you extract insights that make future sessions better.
    
    Analyze:
    1. What was learned? What concepts were covered?
    2. How deep was the understanding?
    3. Were there any misconceptions? Were they resolved?
    4. What patterns emerged in the learner's questions?
    5. What should be reviewed next session?
    6. What recommendations improve the learning process?
    
    Look for patterns across the session:
    - Topics the learner kept returning to
    - Types of questions asked (conceptual, procedural, curiosity-driven)
    - Where the learner struggled vs. excelled
    - Engagement level (follow-up questions asked, depth of exploration)
    
    Generate actionable recommendations for the next session.
  
  tools: ["pattern_analyzer", "session_extractor"]
  
  failure_cases:
    - condition: "Insufficient session data"
      action: "Generate partial reflection"
      fallback: "Request more sessions for meaningful analysis"
  
  retry_policy:
    max_retries: 1
    backoff: "immediate"
```

---

## Career Agent

```yaml
agent:
  id: "career"
  purpose: "Map learning progress to career paths, suggest skills to develop, and generate portfolio artifacts."
  dependencies: ["memory", "knowledge_graph"]
  
  input_schema:
    required_fields:
      - user_id
      - career_type  # "path_suggestion" | "skill_gap_analysis" | "portfolio_gen"
    optional_fields:
      - target_career
      - current_skills
      - interests
  
  output_schema:
    success:
      career_paths: [{
        title: string,
        relevance_to_interests: float,
        required_skills: [string],
        your_match: float,
        suggested_focus: [string]
      }]
      skill_gaps: [{
        skill: string,
        importance: string,
        how_to_learn: string,
        estimated_time: string
      }]
      portfolio_suggestions: [{
        type: string,
        content_preview: string,
        from_session_id: string
      }]
  
  prompt: |
    You are the Synaris Career Agent.
    You help learners connect their learning to their future.
    
    For career path suggestions:
    - Map learned concepts to career-relevant skills
    - Identify adjacent skills worth developing
    - Show the learning-to-career pipeline
    
    For skill gap analysis:
    - Compare current knowledge against career requirements
    - Prioritize gaps by importance
    - Suggest learning paths for each gap
    
    For portfolio generation:
    - Extract learning artifacts that demonstrate competence
    - Reformulate as resume bullets
    - Generate project ideas that showcase skills
    - Create reflection narratives that connect learning to growth
  
  tools: ["career_mapper", "skill_analyzer", "portfolio_builder"]
  
  failure_cases:
    - condition: "Insufficient learning data"
      action: "Suggest learning plan to build baseline"
      fallback: "Provide general career guidance"
  
  retry_policy:
    max_retries: 1
    backoff: "immediate"
```

---

### 13. Whiteboard Agent

**Purpose:** Generate and interpret visual explanations — diagrams, mind maps, flowcharts, and sketches.

**Dependencies:** coordinator, reasoning

**When routed:** For visual explanation requests, diagram generation, concept mapping.

**Tools:** Mermaid, mind mapping library

```yaml
agent:
  id: "whiteboard"
  purpose: "Translate concepts into visual diagrams, mind maps, and flowcharts."
  dependencies: ["coordinator", "reasoning"]
  
  input_schema:
    required_fields:
      - concept_or_explanation
      - visual_type  # "mind_map" | "flowchart" | "sequence" | "concept_map" | "timeline"
    optional_fields:
      - complexity  # "simple" | "detailed"
      - format  # "mermaid" | "svg"
  
  output_schema:
    success:
      diagram: string  # Mermaid syntax
      explanation: string
      type: string
      key_insight: string
    error:
      reason: string
      alternative: string  # Text explanation as fallback
  
  prompt: |
    You are the Synaris Whiteboard Agent.
    ...
  
  failure_cases:
    - condition: "Concept too abstract to diagram"
      action: "Provide text explanation with structural description"
      fallback: "Explain why visual isn't appropriate"
```

---

### 14. Vision Agent

**Purpose:** Analyze images, diagrams, graphs, and handwritten content.

**Dependencies:** coordinator

**When routed:** When user uploads an image or PDF.

**Tools:** PaddleOCR, Tesseract, Florence, Qwen VL

```yaml
agent:
  id: "vision"
  purpose: "Extract educational information from images, diagrams, and documents."
  dependencies: ["coordinator"]
  
  input_schema:
    required_fields:
      - image_data  # base64 or URL
      - content_type  # "handwriting" | "textbook" | "graph" | "diagram" | "photo"
    optional_fields:
      - ocr_language
      - extract_mode  # "full" | "educational_only"
  
  output_schema:
    success:
      classified_type: string
      extracted_text: string (if OCR)
      transcribed_math: string (LaTeX, if applicable)
      educational_context: string
      follow_up_question: string
  
  failure_cases:
    - condition: "Text illegible"
      action: "Request clearer image"
      fallback: "Ask user to type the content"
    - condition: "Non-educational image"
      action: "Return description without further processing"
```

---

### 15. Speech Agent

**Purpose:** Transcribe voice input and generate spoken responses.

**Dependencies:** coordinator

**When routed:** When voice input is received or audio output requested.

**Tools:** Whisper, TTS

```yaml
agent:
  id: "speech"
  purpose: "Handle audio input transcription and audio output."
  dependencies: ["coordinator"]
  
  input_schema:
    required_fields:
      - audio_data  # base64 encoded audio
      - direction  # "input" | "output"
    optional_fields:
      - language
      - sample_rate
  
  output_schema:
    success:
      transcribed_text: string (input)
      confidence: float
      should_play_audio: boolean (output)
      text_to_speak: string (output)
  
  failure_cases:
    - condition: "Low transcription confidence (< 0.8)"
      action: "Ask for confirmation"
      fallback: "Request typed input"
```
