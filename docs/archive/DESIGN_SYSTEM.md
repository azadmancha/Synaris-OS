# UI/UX Design System

> **Version 1.0 — The visual language, component system, and interaction patterns of Synaris**

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Visual Identity](#visual-identity)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Component Library](#component-library)
6. [Layout System](#layout-system)
7. [Animation & Motion](#animation--motion)
8. [Dark Mode](#dark-mode)
9. [Accessibility](#accessibility)
10. [Keyboard Shortcuts](#keyboard-shortcuts)
11. [Responsive Design](#responsive-design)
12. [Micro-interactions](#micro-interactions)

---

## Design Philosophy

### Core Principles

1. **Clarity over cleverness** — Every element serves understanding
2. **Calm technology** — The interface fades when not needed
3. **Content-first** — The learning material is the hero
4. **Progressive disclosure** — Reveal complexity as needed
5. **Keyboard-first** — Power users navigate without touching the mouse
6. **Beautiful utility** — Aesthetics serve function

### Design Tone

| Attribute | Description |
|---|---|
| Voice | Calm, confident, precise |
| Emotion | Curiosity, clarity, wonder |
| Pace | Adaptable — fast when you need speed, slow when you need depth |
| Personality | Like a brilliant professor who's also a great listener |

### The Synaris Experience

```
Using Synaris should feel like:
- Walking into a well-organized library (familiar, calm)
- Having a conversation with a brilliant mentor (insightful, adaptive)
- Exploring a map of knowledge (visual, connected)
- Building something with your own hands (active, empowering)
```

---

## Visual Identity

### Logo & Brandmark

The Synaris logo is currently **TBD** — but the design direction:

- **Shape:** Circular/geometric — suggesting systems, cycles, completeness
- **Symbol:** Possibly a stylized 'S' that evokes a synapse, a wave, or interconnected nodes
- **Colors:** Deep blue → teal gradient
- **Format:** SVG, responsive, works at 16px favicon to 256px app icon

### Wordmark

```
SYNARIS
```

- Font: System font or Inter (sans-serif)
- Tracking: +0.05em
- Weight: Semi-bold (600)
- Color: Same as brand gradient

### Design Tokens

```css
:root {
  /* Brand */
  --brand-hue: 210;
  --brand-primary: hsl(var(--brand-hue), 80%, 50%);
  --brand-secondary: hsl(180, 80%, 40%);
  
  /* Spacing scale (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  
  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 25px rgba(0,0,0,0.1);
  --shadow-xl: 0 20px 50px rgba(0,0,0,0.15);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 400ms ease;
}
```

---

## Color System

### Light Theme

```css
:root {
  /* Background */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F8F9FA;
  --bg-tertiary: #F0F1F3;
  --bg-elevated: #FFFFFF;
  
  /* Surface (cards, modals, sidebars) */
  --surface-primary: #FFFFFF;
  --surface-secondary: #F8F9FA;
  --surface-hover: #F0F1F3;
  
  /* Text */
  --text-primary: #1A1B1E;
  --text-secondary: #5E5F64;
  --text-tertiary: #9C9DA3;
  --text-inverse: #FFFFFF;
  --text-link: #2563EB;
  
  /* Brand */
  --brand-primary: #2563EB;
  --brand-secondary: #0D9488;
  --brand-gradient: linear-gradient(135deg, #2563EB, #0D9488);
  
  /* Accent */
  --accent-blue: #3B82F6;
  --accent-green: #10B981;
  --accent-yellow: #F59E0B;
  --accent-red: #EF4444;
  --accent-purple: #8B5CF6;
  --accent-orange: #F97316;
  
  /* Semantic */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #3B82F6;
  
  /* Borders */
  --border-primary: #E5E7EB;
  --border-secondary: #F0F1F3;
  
  /* Code */
  --code-bg: #F8F9FA;
  --code-text: #1A1B1E;
  
  /* Diagram colors */
  --diagram-node: #3B82F6;
  --diagram-edge: #D1D5DB;
  --diagram-highlight: #F59E0B;
}
```

### Dark Theme

```css
[data-theme="dark"] {
  /* Background */
  --bg-primary: #0F1117;
  --bg-secondary: #161822;
  --bg-tertiary: #1C1E2B;
  --bg-elevated: #1C1E2B;
  
  /* Surface */
  --surface-primary: #1C1E2B;
  --surface-secondary: #222438;
  --surface-hover: #282B40;
  
  /* Text */
  --text-primary: #EDEDEE;
  --text-secondary: #9C9DA3;
  --text-tertiary: #5E5F64;
  --text-inverse: #1A1B1E;
  --text-link: #60A5FA;
  
  /* Brand */
  --brand-primary: #60A5FA;
  --brand-secondary: #2DD4BF;
  --brand-gradient: linear-gradient(135deg, #60A5FA, #2DD4BF);
  
  /* Borders */
  --border-primary: #2A2C3E;
  --border-secondary: #222438;
  
  /* Code */
  --code-bg: #1A1C2E;
  --code-text: #EDEDEE;
  
  /* Diagram */
  --diagram-node: #60A5FA;
  --diagram-edge: #374151;
  --diagram-highlight: #FBBF24;
}
```

---

## Typography

### Font Stack

```css
/* UI Text */
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Content (long-form reading) */
--font-content: 'Georgia', 'Times New Roman', serif;

/* Code */
--font-code: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

/* Math */
/* KaTeX handles math rendering independently */
```

### Type Scale

```css
:root {
  --text-xs:   0.75rem;   /* 12px */
  --text-sm:   0.875rem;  /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg:   1.125rem;  /* 18px */
  --text-xl:   1.25rem;   /* 20px */
  --text-2xl:  1.5rem;    /* 24px */
  --text-3xl:  1.875rem;  /* 30px */
  --text-4xl:  2.25rem;   /* 36px */
  
  /* Line heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
  
  /* Font weights */
  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
}
```

### Usage Guidelines

| Element | Size | Weight | Leading |
|---|---|---|---|
| H1 (page title) | --text-3xl | --weight-bold | --leading-tight |
| H2 (section title) | --text-2xl | --weight-semibold | --leading-tight |
| H3 (card title) | --text-xl | --weight-semibold | --leading-normal |
| Body (content) | --text-base | --weight-normal | --leading-relaxed |
| Body (UI) | --text-sm | --weight-normal | --leading-normal |
| Caption | --text-xs | --weight-normal | --leading-normal |
| Code | --text-sm | --weight-normal | --leading-normal |

---

## Component Library

### 1. Buttons

```
Primary:   [■ Get Started]              ← Brand gradient bg, white text
Secondary: [□ Learn More]               ← Transparent, border
Ghost:     [× Cancel]                   ← No border, subtle hover
Icon:      [⚙]                          ← Icon only, tooltip on hover

Sizes:     sm  |  md  |  lg
          28px | 36px | 44px height
```

**States:** Default → Hover → Active → Focus → Disabled → Loading

**Loading state:** Show a spinner icon, disable clicks
**Disabled state:** Opacity 0.4, no pointer events
**Focus state:** 2px brand ring, 4px offset

### 2. Input Fields

```
Default:    [________________________]
Focus:      [________________________] ← brand border + ring
Error:      [________________________] ← red border + error msg
Disabled:   [________________________] ← greyed out
With icon:  [🔍 Search...____________]
```

**Rules:**
- Label above input (not placeholder)
- Helper text below when needed
- Error message below helper text
- Character count for textareas

### 3. Cards

```css
.card {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: box-shadow var(--transition-normal);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.card--interactive {
  cursor: pointer;
}

.card--elevated {
  box-shadow: var(--shadow-md);
}
```

### 4. Chat Bubbles

```css
/* User message */
.msg--user {
  align-self: flex-end;
  background: var(--brand-primary);
  color: var(--text-inverse);
  border-radius: 18px 18px 4px 18px;
  max-width: 70%;
}

/* AI message */
.msg--ai {
  align-self: flex-start;
  background: var(--surface-secondary);
  color: var(--text-primary);
  border-radius: 18px 18px 18px 4px;
  max-width: 85%;
}

/* System message */
.msg--system {
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}
```

### 5. Streaming Response

The AI response streams in real-time with:

```
█ ← Pulsing cursor (animated)
```

```css
@keyframes pulse-cursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--brand-primary);
  animation: pulse-cursor 1s ease-in-out infinite;
  margin-left: 2px;
}
```

### 6. Skeleton Loading

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-secondary) 25%,
    var(--surface-hover) 50%,
    var(--surface-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 7. Knowledge Graph Nodes

```
Unmastered:   ○ (gray, small)
Discovered:   ◔ (blue, 30% fill)
Learning:     ◑ (blue, 60% fill)
Familiar:     ◕ (blue, 80% fill)
Mastered:     ● (blue, full)
Can Teach:    ★ (gold, star)
```

### 8. Depth Selector

```css
.depth-selector {
  display: flex;
  gap: 2px;
  background: var(--surface-secondary);
  border-radius: var(--radius-full);
  padding: 2px;
}

.depth-option {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.depth-option--active {
  background: var(--surface-primary);
  box-shadow: var(--shadow-sm);
  font-weight: var(--weight-medium);
}
```

---

## Layout System

### Page Layouts

**Default (Learning Session):**
```
┌──────┬──────────────────────────────────┬──────┐
│      │                                  │      │
│ Side │        Main Content              │ Side │
│ bar  │        (Chat Area)               │ bar  │
│      │                                  │      │
│      │                                  │      │
│      │                                  │      │
│      ├──────────────────────────────────┤      │
│      │        Input Area                │      │
│      │  [Quick] [Balanced] [Deep] [Exp] │      │
│      │  [________________________] [→]  │      │
├──────┴──────────────────────────────────┴──────┤
│              Status Bar (optional)              │
└────────────────────────────────────────────────┘
```

**Dashboard (Overview):**
```
┌──────────────────────────────────────────────┐
│ Header: Logo | Search | Notif | Profile      │
├──────────────────────────────────────────────┤
│                                              │
│ ┌───────┐ ┌──────────────────────────────┐  │
│ │Daily  │ │       Continue               │  │
│ │Quest  │ │                              │  │
│ │       │ │       Where You Left Off     │  │
│ │[ ]... │ │                              │  │
│ │[ ]... │ │ ──────────────               │  │
│ └───────┘ └──────────────────────────────┘  │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │            Knowledge Graph                │ │
│ │            (visual map)                   │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│ │ Weak     │ │ Recent   │ │ Suggested    │ │
│ │ Areas    │ │ Activity │ │ Next Topics  │ │
│ └──────────┘ └──────────┘ └──────────────┘ │
└──────────────────────────────────────────────┘
```

**Settings:**
```
┌──────────────────────────────────────────────┐
│ Header                                        │
├──────┬───────────────────────────────────────┤
│      │                                       │
│ Nav  │         Settings Content              │
│      │                                       │
│ [Profile]      ┌─────────────────────────┐  │
│ [Theme]        │ Theme                    │  │
│ [Prefs]        │ ○ Light    ○ Dark ○ Sys │  │
│ [API]          └─────────────────────────┘  │
│ [Data]                                       │
│ [Account]       ┌─────────────────────────┐  │
│                 │ Font Size               │  │
│                 │ [Small] [Medium] [Large]│  │
│                 └─────────────────────────┘  │
└──────┴───────────────────────────────────────┘
```

---

## Animation & Motion

### Principles

1. **Purposeful** — Every animation serves understanding
2. **Subtle** — 200–400ms, ease-in-out
3. **Performance** — GPU-accelerated properties only (opacity, transform)
4. **Reduced motion** — Respect `prefers-reduced-motion`

### Page Transitions

```css
/* Page enter */
.page-enter {
  opacity: 0;
  transform: translateY(8px);
}
.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 300ms ease-out;
}

/* Page exit */
.page-exit {
  opacity: 1;
}
.page-exit-active {
  opacity: 0;
  transition: opacity 200ms ease-in;
}
```

### Message Appearance

```css
/* New message slides in */
@keyframes message-slide-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message--new {
  animation: message-slide-in 300ms ease-out both;
}
```

### Content Reveal

```css
/* Content fades in as it streams */
@keyframes content-reveal {
  from { opacity: 0; }
  to { opacity: 1; }
}

.content--streaming {
  animation: content-reveal 200ms ease-out both;
}
```

### Hover States

```css
/* Card hover */
.card {
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Button hover */
.btn {
  transition: all 150ms ease;
}
.btn:hover {
  transform: translateY(-1px);
}
.btn:active {
  transform: translateY(0);
}

/* Interactive element */
.clickable {
  cursor: pointer;
  transition: opacity 150ms ease;
}
.clickable:hover {
  opacity: 0.8;
}
```

### Loading States

```css
/* Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}

/* Thinking dots */
@keyframes bounce-dot {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.16s; }
.dot:nth-child(3) { animation-delay: 0.32s; }
```

---

## Dark Mode

### Implementation

```typescript
// Theme toggle uses data-theme attribute on <html>
// Persists in localStorage

type Theme = 'light' | 'dark' | 'system';

function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light';
  }
  return theme;
}

// Transition on theme change
document.documentElement.style.transition = 'background-color 300ms ease, color 300ms ease';
```

### Dark Mode Guidelines

1. **Never pure black** — bg-primary: #0F1117, not #000
2. **Reduce saturation** — Colors shift 10% desaturated
3. **Increase contrast** — Borders are lighter in dark mode
4. **Avoid large bright areas** — Cards use dark surfaces, not white
5. **Image adjustments** — Reduce brightness on images by 20%

---

## Accessibility

### WCAG 2.1 AA Compliance

| Requirement | Implementation |
|---|---|
| Color contrast | 4.5:1 for text, 3:1 for large text |
| Keyboard navigation | All interactive elements reachable via Tab |
| Focus indicators | 2px brand ring + 4px offset |
| Screen reader support | ARIA labels, roles, live regions |
| Reduced motion | `prefers-reduced-motion` respected |
| Font scaling | Relative units (rem, em) throughout |
| Alt text | All images and diagrams |
| Error announcements | `aria-live="polite"` for errors |

### Focus Management

```typescript
// After AI response completes
function focusFollowUpSuggestions() {
  const firstSuggestion = document.querySelector('[data-followup]:first-child');
  if (firstSuggestion) {
    (firstSuggestion as HTMLElement).focus();
  }
}

// Modal focus trap
function trapFocus(modal: HTMLElement) {
  const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const first = focusable[0] as HTMLElement;
  const last = focusable[focusable.length - 1] as HTMLElement;
  
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  
  first.focus();
}
```

### Live Regions

```html
<!-- AI response streaming -->
<div aria-live="polite" aria-atomic="false">
  <!-- Streaming content updates here -->
</div>

<!-- Error announcements -->
<div aria-live="assertive" role="alert">
  <!-- Error messages -->
</div>

<!-- Notifications -->
<div aria-live="polite" role="status">
  <!-- Toast notifications -->
</div>
```

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+K` | Command palette |
| `Ctrl+/` | Show keyboard shortcuts |
| `Ctrl+N` | New session |
| `Ctrl+,` | Settings |
| `Alt+D` | Toggle dark mode |
| `?` | Show help |

### Session Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Ctrl+Z` | Undo last message |
| `Up Arrow` | Edit last message |
| `Escape` | Cancel/stop streaming |
| `1` | Quick mode |
| `2` | Balanced mode |
| `3` | Deep Dive mode |
| `4` | Expert mode |
| `Ctrl+S` | Save as note |
| `Ctrl+Shift+C` | Copy last response |

### Navigation Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+1` | Dashboard |
| `Ctrl+2` | Learning session |
| `Ctrl+3` | Knowledge graph |
| `Ctrl+4` | Study planner |
| `Ctrl+5` | Learning profile |
| `Ctrl+6` | Portfolio |

---

## Responsive Design

### Breakpoints

```css
/* TailwindCSS breakpoints */
--screen-sm:  640px;   /* Mobile (landscape) */
--screen-md:  768px;   /* Tablet */
--screen-lg:  1024px;  /* Desktop */
--screen-xl:  1280px;  /* Desktop (wide) */
--screen-2xl: 1536px;  /* Desktop (ultrawide) */
```

### Adaptive Layouts

**Desktop (≥ 1024px):**
- Full three-column layout (sidebar + content + sidebar)
- Knowledge graph takes full width
- Keyboard shortcuts fully available

**Tablet (768–1023px):**
- Two-column layout (collapsed sidebar)
- Knowledge graph is scrollable
- Touch-friendly targets (min 44px)

**Mobile (< 768px):**
- Single column
- Bottom sheet for controls
- Swipe gestures for history
- Simplified knowledge graph (list view)
- Voice input prioritized

### Mobile Adaptations

```css
/* Touch targets: minimum 44x44px */
@media (max-width: 767px) {
  .btn {
    min-height: 44px;
    min-width: 44px;
  }
  
  .depth-selector {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .sidebar {
    position: fixed;
    inset: 0;
    z-index: 40;
    transform: translateX(-100%);
    transition: transform 300ms ease;
  }
  
  .sidebar--open {
    transform: translateX(0);
  }
  
  .knowledge-graph {
    display: none; /* Show list view instead */
  }
}
```

---

## Micro-interactions

### Response Rating

After each AI response, subtle rating buttons appear (fade in):

```
[👍] [👎]              ← Appears after 2s delay
```

Clicking opens quick feedback:

```
[👍] selected
[Accurate] [Helpful] [Clear] [Too Simple] [Wrong]
[_____________________________] (optional comment)
```

### Streak Celebration

When a streak milestone is reached:

```
🔥 7-Day Streak!  →  Brief confetti animation  →  Achievement card
```

### Knowledge Graph Growth

When a new concept is mastered:

```
Node expands from ○ to ● with a ripple effect
Connected nodes pulse briefly
```

### Session Complete

When a session ends:

```
Gentle scale-up animation on "Session Complete"
Stats appear one by one:
  • 3 concepts learned
  • 1 misconception corrected
  • 15 minutes studied
  • +45 XP earned
```

### Typing Indicator

While AI is thinking:

```
Synaris is thinking
◉ ◉ ◉   ← Bouncing dots, 0.3s delay between each
```

### Mode Switch

When changing learning modes:

```
Current mode fades out
New mode label slides in from top
Color accent shifts to mode color
```

### Error Recovery

```
Friendly animation when error resolves:
Error message slides out
Content slides back in
Subtle green flash on success
```
