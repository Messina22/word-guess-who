# Word Guess Who - Feature Roadmap and Monetization Planning

Last updated: 2026-02-07

## Purpose
Capture a clear view of the current product state and outline a feature roadmap
that expands learning value, improves retention, and enables monetization.

## Current State Snapshot (from codebase)

### Gameplay
- Real-time two-player game using WebSockets.
- Game phases: waiting, selecting, playing, finished.
- Modes: online, local 2-player, shared computer mode.
- Random secret word assignment or player selection.
- Manual card flipping; question/answer flow.
- Turn handling, end-turn in shared mode.
- Reconnection support and session expiration (20 minutes).

### Instructor Tools
- Instructor accounts (register/login), JWT auth.
- Password reset flow with email + rate limiting.
- Config builder: word bank (12-100 words), suggested questions, settings.
- Public vs private configs, system templates, and duplication.
- Basic preview of cards for config validation.

### Tech Baseline
- Bun + TypeScript server, SQLite for config persistence.
- React 18 client with Tailwind theme.
- REST APIs for configs/auth, WebSocket for gameplay.
- Sessions are in-memory (no persistence of games or analytics).

### Current Gaps
- No student accounts or class management.
- No game history, analytics, or progress tracking.
- No AI/auto-evaluation of questions.
- No content marketplace or premium libraries.
- No billing/subscriptions or paywalling.

## Product Goals
1. Increase learning outcomes and teacher utility.
2. Improve engagement and replayability for students.
3. Create a sustainable monetization path (B2C and/or B2B).
4. Preserve kid-safe, classroom-friendly UX and privacy.

## Roadmap Overview

### Phase 1: Foundation for Growth (0-3 months)
Focus on analytics readiness and teacher value.
- Persist game sessions and results (SQLite tables for games, turns, outcomes).
- Teacher dashboard upgrades:
  - Saved games, recent activity, and "classroom view".
  - Exportable reports (CSV/PDF).
- Configuration enhancements:
  - Word tags/levels and filters.
  - Shared config libraries (collections).
- Player experience:
  - Rematch flow and quick rejoin.
  - Optional "timed turns" with visible timer.

### Phase 2: Classroom Tools and Retention (3-6 months)
Build features that schools and teachers will pay for.
- Classroom management:
  - Create classes, invite students, roster management.
  - Student profiles and per-student progress.
- Assignments:
  - Assign word sets to students.
  - Completion tracking and mastery scores.
- Analytics:
  - Word-level accuracy, mistake patterns.
  - Question quality scoring (e.g., "good narrowing questions").
- Accessibility:
  - Dyslexia-friendly font toggle.
  - Keyboard navigation and screen reader support.

### Phase 3: Premium Content and Differentiation (6-12 months)
Differentiate with content and automation.
- Auto-evaluation engine:
  - Use word features to answer common question patterns.
  - Suggest questions based on remaining words.
- Content marketplace:
  - Curated premium word banks and lesson packs.
  - Teacher-contributed libraries with ratings.
- Multimodal play:
  - Audio pronunciation and phonics hints.
  - Optional "listen and guess" mode.
- Team or group play:
  - Spectator mode for classroom projection.
  - Team-based rounds for group activities.

## Feature Backlog (by Theme)

### Gameplay Enhancements
- Power-ups for practice mode (hints, eliminate 3, etc.).
- Solo play vs AI opponent.
- Custom house rules (guesses per turn, question limits).
- Alternate board layouts (themes, picture-based words for early readers).

### Instructor Value
- Classroom roster import (CSV).
- Scheduled assignments and due dates.
- Lesson templates and guided prompts.
- Progress comparisons by class, student, or word set.

### Content and Pedagogy
- Grade-level alignment (Dolch/Fry progression).
- Phonics-based grouping (digraphs, blends, vowels).
- Difficulty calibration and adaptive practice.
- Multilingual word packs.

### Platform and Operations
- Admin tools for moderating public configs.
- Basic audit logs for educators.
- Rate limiting and abuse detection.
- Localization and i18n support.

## Monetization Strategy

### Primary Models (recommended)
1. **Freemium for Teachers**
   - Free: core gameplay + limited configs.
   - Pro: unlimited configs, classroom management, analytics exports.
2. **School/District Licensing**
   - Multi-seat pricing with centralized admin.
   - SSO support and bulk roster provisioning.

### Secondary Models
- **Premium Content Packs**
  - Curated word banks, assessments, and themed lessons.
- **Teacher Marketplace Revenue Share**
  - Allow creators to sell packs; platform takes a cut.
- **White-label / Branding**
  - Custom branding for schools or tutoring centers.

### Monetization Enablers (features needed)
- Billing system (Stripe) and plan entitlements.
- Role-based access and organization accounts.
- Persistent data model for classes, students, and assignments.
- Paywall UX and upgrade prompts (non-intrusive).

## Suggested Packaging

### Free Tier
- Online/local/shared modes.
- Access to public configs + default set.
- Limited saved configs and no analytics.

### Pro Teacher (monthly/annual)
- Unlimited private configs.
- Classroom management + assignment tracking.
- Exportable reports and student insights.

### School Plan
- Everything in Pro Teacher.
- Central admin, shared libraries, bulk roster import.
- Priority support and onboarding.

## Metrics to Track
- DAU/WAU and returning sessions.
- Game completion rate and average turns.
- Teacher retention: configs created per month, active classrooms.
- Paid conversion rate by feature usage.
- Content marketplace usage (if launched).

## Technical Notes and Dependencies
- Add new DB tables for sessions, players, assignments, results.
- Consider background jobs for reporting and email notifications.
- Evaluate privacy needs for student data (COPPA/FERPA).
- Decide on persistent storage strategy beyond SQLite if scale grows.

## Risks and Open Questions
- What is the primary buyer: teachers, parents, or schools?
- How much student data can be stored given compliance needs?
- Should gameplay remain fully synchronous, or add async play?
- What is the acceptable UX for paywalls in a classroom setting?

---

Next step: align on primary monetization model and pick Phase 1 scope.
