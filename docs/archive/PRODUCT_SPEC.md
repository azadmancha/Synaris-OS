# Product Specification

> **Version 1.0 — The complete specification for Synaris as a production AI Learning Operating System**

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [User Personas](#user-personas)
3. [Core Pages & Screens](#core-pages--screens)
4. [Feature Catalog](#feature-catalog)
5. [Learning Modes](#learning-modes)
6. [User Flows](#user-flows)
7. [Error States & Edge Cases](#error-states--edge-cases)
8. [Success Metrics](#success-metrics)

---

## Product Overview

### What It Does

Synaris is an adaptive reasoning system that helps people learn how to think. It combines:
- **Multi-agent AI** for intelligent, adaptive tutoring
- **Memory systems** that track learning over time
- **Knowledge graphs** that map concept relationships
- **Multiple learning modes** for different goals
- **Rich media** — diagrams, math visualization, code execution

### Target Audience

| Persona | Primary Need | How Synaris Serves |
|---|---|---|
| **Self-learners** (14–35) | Master subjects independently | Adaptive tutoring, study planning, progress tracking |
| **Students** (high school, college) | Ace exams while understanding deeply | Exam modes, practice, misconception detection |
| **Professionals** | Learn new skills efficiently | Quick mode, programming mode, research mode |
| **Educators** | Understand how students think | Analytics, learning profiles, portfolio generation |
| **Lifelong learners** | Explore curiosity-driven topics | Deep dive mode, concept mapping, research mode |

---

## Core Pages & Screens

### 1. Welcome / Landing Page

**Purpose:** First impression. Sets the tone.

**Elements:**
- Animated hero with the splash text: "Learn deeply. Think independently. Build fearlessly."
- Clean, minimal design
- "Get Started" CTA
- "Learn More" scroll trigger
- Manifesto summary (expandable)
- No clutter. No feature lists. No screenshots of chatbots.

**States:**
- **Logged out** — Hero + philosophy + CTA
- **Logged in, new user** — Onboarding flow
- **Logged in, returning** — Redirect to home/dashboard

---

### 2. Onboarding Flow

**Purpose:** Diagnose the learner before the first interaction.

**Screens:**
1. **Welcome** — "Let's understand how you learn best"
2. **What brings you here?** — Exam prep / Curiosity / Skill building / Research
3. **Subjects of interest** — Multi-select from knowledge graph
4. **Experience level** — Beginner / Intermediate / Advanced / Expert per subject
5. **Learning style preference** — Visual / Reading / Interactive / Mixed (can change later)
6. **Goals** — Free-text + suggested goals based on context
7. **Commitment** — How much time per day/week can they dedicate?
8. **Done** — "Synaris is building your learning profile..."

**States:**
- Progress bar at top
- Can skip any step (minimal profile)
- Can return later to complete

---

### 3. Home / Dashboard

**Purpose:** Central hub for the learning journey.

**Layout:**

```
┌──────────────────────────────────────────┐
│ Header: Logo | Search | Streak | Profile │
├──────────────────────────────────────────┤
│                                          │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ Daily Quest  │  │ Continue Where   │  │
│  │              │  │ You Left Off     │  │
│  │ • Review 3   │  │                  │  │
│  │   concepts   │  │ "Entropy..."     │  │
│  │ • Practice   │  │ ──────────────   │  │
│  │   one weak   │  │ "Linear Algebra  │  │
│  │   concept    │  │  fundamentals"   │  │
│  └─────────────┘  └──────────────────┘  │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ Concept Map / Knowledge Graph     │    │
│  │ (Interactive visual of your       │    │
│  │  knowledge with mastery levels)   │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ Weak Areas   │  │ Recent Activity  │  │
│  │ • Quantum    │  │ • Yesterday:     │  │
│  │   mechanics  │  │   Thermodynamics │  │
│  │ • Tensors    │  │ • 2 days ago:    │  │
│  │              │  │   Calculus       │  │
│  └─────────────┘  └──────────────────┘  │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ Suggested Next Topics             │    │
│  │ (AI-generated, based on profile)  │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

**States:**
- **First visit** — Onboarding completion + empty state with "Start your first session"
- **Regular visit** — Full dashboard with history
- **Absent for 7+ days** — "Welcome back!" banner + review prompt
- **Loading** — Skeleton screens for each section

---

### 4. Learning Session (Main Interface)

**Purpose:** The core interaction — where learning happens.

**Layout:**

```
┌─────────────────────────────────────────────┐
│ Header: Mode | Subject | Timer | ...menu    │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │                                       │  │
│  │   Main Content Area                   │  │
│  │                                       │  │
│  │   • AI response (streaming)           │  │
│  │   • Diagrams (auto-generated)         │  │
│  │   • Math (rendered LaTeX)             │  │
│  │   • Code (syntax highlighted)         │  │
│  │   • Mermaid diagrams                 │  │
│  │   • Mind maps                        │  │
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │   Suggested Questions / Follow-ups    │  │
│  │   (3–5 adaptive suggestions)          │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │   Input Area                           │  │
│  │   [Type your question...] [Send]  🎤  │  │
│  │   [Quick] [Balanced] [Deep Dive] [Exp]│  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Sidebar (collapsible):                     │
│  ┌───────────────────────────────────────┐  │
│  │ Session History                       │  │
│  │ Context (what we're discussing)       │  │
│  │ Related concepts                      │  │
│  │ Save as note / Add to portfolio       │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**States:**
- **Empty / New session** — "What would you like to learn today?"
- **Streaming response** — Animated cursor, progress indicator
- **Complete response** — Full rendering with follow-ups
- **Error** — Friendly error with retry + "Report issue"
- **Thinking timeout** — "I'm still thinking…" with animated dots (max 30s)
- **Content generation** — Diagram/code generation loading states

---

### 5. Knowledge Graph View

**Purpose:** Visualize concept relationships and mastery.

**Layout:**
- Interactive force-directed graph
- Nodes = concepts, sized by mastery
- Edges = relationships (prerequisite, related, builds-on)
- Colors = mastery level (discovered → learning → familiar → mastered → can teach)
- Click = expand concept detail
- Zoom + pan
- Filter by subject

**States:**
- **Empty** — "Start learning to build your knowledge graph"
- **Populated** — Interactive visualization
- **Searching** — Highlight matching nodes

---

### 6. Learning Profile

**Purpose:** Deep analytics on the learner.

**Sections:**
- **Mastery Map** — Overall progress across subjects
- **Strengths & Weaknesses** — AI-generated analysis
- **Learning Style** — Inferred preferences (visual, textual, interactive)
- **Activity History** — Calendar heatmap
- **Study Efficiency** — Time to mastery per topic
- **Retention Score** — How well concepts are retained over time
- **Recommended Focus** — AI-generated action items

---

### 7. Study Planner

**Purpose:** Adaptive study scheduling.

**Features:**
- Target exam/date input
- AI generates a study plan
- Spaced repetition scheduling
- Daily task generation
- Progress tracking
- Adaptive rescheduling (if you fall behind)
- Supports: SAT, JEE, AP, IB, Boards, Olympiads, Custom

---

### 8. Research Mode

**Purpose:** Deep research assistant.

**Features:**
- Upload / paste paper (PDF, URL, text)
- AI reads and summarizes
- Critique mode — identify weaknesses
- Idea generation — suggest extensions
- Related papers — search and recommend
- Citation export (BibTeX, APA, MLA, Chicago)
- Experiment design suggestions

---

### 9. Portfolio Mode

**Purpose:** Generate learning artifacts.

**Features:**
- Smart notes — auto-generated from sessions
- Project documentation
- Research logs
- Resume bullet points
- Reflection journals
- Export as PDF / Markdown / HTML

---

### 10. Settings & Profile

**Pages:**
- **Profile** — Name, avatar, bio
- **Preferences** — Theme (light/dark/system), font size, language
- **Learning Preferences** — Default mode, subjects, style
- **API Keys** — Connect your own LLM providers (OpenRouter, OpenAI, etc.)
- **Data** — Export / delete data
- **Account** — Email, password, auth providers
- **Notifications** — Email / in-app preferences
- **Keyboard shortcuts** — Customizable

---

## Feature Catalog

### Core Features (v1.0)

| Feature | Priority | Description |
|---|---|---|
| Adaptive AI Chat | P0 | Core interaction with adaptive depth |
| Multi-mode Learning | P0 | Quick / Balanced / Deep Dive / Expert |
| Streaming Responses | P0 | Real-time response rendering |
| LaTeX Math Rendering | P0 | Beautiful math with KaTeX |
| Code Syntax Highlighting | P0 | Multi-language code blocks |
| Markdown Rendering | P0 | Rich text formatting |
| Session History | P0 | Full conversation history |
| Dark Mode | P0 | Full dark theme support |
| Auth (Supabase) | P0 | Email + OAuth |
| Learning Profile | P1 | Adaptive learner profile |
| Knowledge Graph | P1 | Concept visualization |
| Suggested Follow-ups | P1 | AI-generated next questions |
| Image/Audio Input | P1 | Upload images (OCR), voice input (Whisper) |
| Feedback on Responses | P1 | Rate / correct AI responses |
| Save to Notes | P1 | Save session insights |
| Streak Tracking | P1 | Daily engagement |
| Keyboard Shortcuts | P1 | Power user navigation |

### Advanced Features (v1.1+)

| Feature | Priority | Description |
|---|---|---|
| Study Planner | P2 | Adaptive scheduling |
| Research Mode | P2 | Paper analysis |
| Portfolio Mode | P2 | Generate learning artifacts |
| Gamification | P2 | XP, achievements, badges |
| Diagram Engine | P2 | Auto-generate mind maps, flowcharts |
| Programming Mode | P2 | Code execution, debugging |
| Exam Mode | P2 | Timed practice with evaluation |
| Challenge Mode | P2 | Harder problems based on profile |
| Tutor Mode | P2 | Guided curriculum |
| Memory System | P2 | Long-term learning profiles |
| Multi-Agent Reasoning | P2 | Coordinated agent pipeline |

### Future Features

| Feature | Timeline | Description |
|---|---|---|
| AI Lab | v2.0 | Build custom AI agents |
| ResearchOS | v2.0 | Full research workflow |
| Career Mentor | v2.0 | Career guidance |
| Medical Learning | v2.0 | Medical education specialization |
| Engineering Simulator | v2.0 | Interactive engineering simulations |
| Virtual Whiteboard | v2.0 | Collaborative whiteboarding |
| Collaborative Study | v2.0 | Study with peers |
| Offline AI | v2.0 | Local models for offline use |

---

## User Flows

### Flow 1: First Visit → Learning

```
Landing Page → Sign Up → Onboarding → Dashboard → First Session
```

1. User visits landing page
2. Clicks "Get Started"
3. Signs up via email or OAuth (Supabase)
4. Onboarding flow (8 screens, skippable)
5. Redirected to dashboard
6. Dashboard shows empty state → "Start your first session"
7. User clicks → Learning session opens
8. User types first question
9. Synaris responds with adapted depth
10. Response includes follow-up suggestions
11. User continues or saves as note

### Flow 2: Returning Learner

```
Login → Dashboard → Continue Session
```

1. User logs in
2. Dashboard shows "Continue where you left off"
3. User clicks → opens last session
4. Session context is preserved (memory system)
5. User continues learning

### Flow 3: Deep Study Session

```
Select Subject → Deep Dive Mode → Knowledge Graph → Study Planner
```

1. User selects a subject from dashboard
2. Chooses "Deep Dive" mode
3. Session begins with prerequisite check
4. Knowledge graph updates in real-time
5. After session, study planner adapts
6. Weak concepts identified → added to review queue

---

## Error States & Edge Cases

### AI System Errors

| Error | User Experience | System Action |
|---|---|---|
| LLM timeout | "I'm having trouble thinking right now. Let me try again." | Retry with backup model |
| LLM unavailable | "My reasoning engine is temporarily offline." | Queue request, notify when available |
| Hallucination detected | "I want to be honest — I'm not confident about that." | Mark response, return uncertainty |
| Rate limit exceeded | "I need a moment to catch my breath." | Queue, exponential backoff |
| Empty response | "Let me try that differently." | Regenerate with different prompt |

### User Input Errors

| Error | User Experience | System Action |
|---|---|---|
| Empty input | "What would you like to learn about?" | Prompt for input |
| Gibberish / spam | "I'm not sure I understand. Could you rephrase?" | Request clarification |
| Profanity | "Let's keep this constructive. What are you trying to learn?" | Redirect to constructive |
| Non-educational request | "I'm designed to help with learning. Can I help you understand something?" | Polite redirect |
| Too many rapid requests | "I'm processing your questions one at a time." | Rate limit, queue |

### Technical Errors

| Error | User Experience | System Action |
|---|---|---|
| Connection lost | "Looks like you lost connection. Your session is saved." | Auto-save, reconnect |
| Server error (500) | "Something went wrong on my end. Sorry about that." | Log, notify team |
| Auth token expired | "Please log in again to continue." | Redirect to login |
| Rate limit (auth) | "Too many login attempts. Please wait." | Progressive delay |

---

## Success Metrics

### Learning Metrics

| Metric | Target | How Measured |
|---|---|---|
| Concept retention (7 days) | >80% | Spaced repetition quizzes |
| Time to mastery | <50% of traditional | Compare to baseline |
| Curiosity score | >0.7 | Follow-up questions asked per session |
| Session depth | >10 messages | Average session length |
| Learning efficiency | Improving | Topics mastered per hour |

### Engagement Metrics

| Metric | Target | How Measured |
|---|---|---|
| Daily active users | — | Login frequency |
| Session completion rate | >70% | Session length > 5 messages |
| Return rate (D1/D7/D30) | >40% / >20% / >10% | User retention |
| Streak maintenance | >30% weekly | 5+ day streaks |
| Feature adoption | >50% | New feature usage within 7 days |

### Quality Metrics

| Metric | Target | How Measured |
|---|---|---|
| Response accuracy | >95% | AI evaluation + user rating |
| User satisfaction | >4.5/5 | Post-session rating |
| Hallucination rate | <1% | Automated evaluation (DeepEval) |
| Response time (P50) | <3s | Latency tracking |
| Uptime | >99.5% | Monitoring |
