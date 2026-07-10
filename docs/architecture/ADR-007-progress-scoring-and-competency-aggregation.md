# ADR-007: Progress Scoring and Competency Aggregation

## Status

**Accepted — Option A: Weighted Average** — 2026-07-10

This ADR addresses the question raised in the PRD: *How do we score activities, aggregate competency scores, and determine lesson completion?* It evaluates scoring algorithms, competency weighting strategies, and the trade-off between compensatory and conjunctive scoring models.

---

## Context

The platform uses a **competency-based learning model** (CEFR framework). Each lesson has 5 competencies, and each activity maps to one or more competencies with a weight. The question is how to combine activity scores into competency scores, and competency scores into lesson completion decisions.

### What the PRD Defines

| Concept | Description |
|---------|-------------|
| **Competency** | Observable outcome (e.g., "Can read fluently short paragraphs with harakat") |
| **Activity** | Practice exercise (listen-translate, translate-to-English, etc.) |
| **Competency map** | Each activity maps to competencies with a weight (0.0–1.0) |
| **Max attempts** | Each activity allows 3 attempts (configurable) |
| **Lesson completion** | All activities' scores meet a threshold |
| **Partial retry** — Only failed activities reset | Failed activities can be retried; successful ones persist |

### Example: Lesson 1 (A1) — "The Salutations"

| Activity | Type | Competency Map | Max Attempts |
|----------|------|---------------|-------------|
| 1 | listen-translate | read_fluently_with_harakat: 0.4, understand_basic_salutations: 0.3 | 3 |
| 2 | translate-to-english | understand_basic_salutations: 0.5, use_pronouns_correctly: 0.3 | 3 |
| 3 | translate-to-arabic | form_nominative_sentences: 0.4, read_fluently_with_harakat: 0.3 | 3 |
| 4 | introduce-characters | use_pronouns_correctly: 0.6, understand_basic_salutations: 0.2 | 3 |
| 5 | role-play | form_nominative_sentences: 0.5, understand_basic_salutations: 0.3 | 3 |

### Constraints (Inherited from ADR-001)

| Constraint | Implication |
|-----------|-------------|
| **Single user** — No user table | Progress is a single `user_progress` table; no per-user aggregation complexity |
| **SQLite** — Single file database | Aggregation must be done in Python, not in SQL (SQLite has limited aggregation functions) |
| **CPU-only** — No heavy computation | Scoring must be lightweight (no ML models, no complex optimization) |
| **5 competencies per lesson** — Small number | Aggregation algorithm can be simple; no need for matrix operations |
| **3 attempts per activity** — Limited retries | Best score across attempts is stored; no infinite retry |
| **Sequential unlocking** — Lessons unlock only when previous is completed | A lesson is "completed" only when ALL competencies meet their thresholds |

---

## Decision

We evaluate three scoring models.

---

### Option A: Weighted Average (Recommended)

Each competency score is the **weighted average** of all activity scores that map to it. A lesson is "completed" when ALL competency scores meet a minimum threshold (e.g., 0.7).

```
Activity 1 (score: 0.8)
  ├──→ competency "read_fluently_with_harakat" (weight: 0.4)
  └──→ competency "understand_basic_salutations" (weight: 0.3)

Activity 2 (score: 0.6)
  ├──→ competency "understand_basic_salutations" (weight: 0.5)
  └──→ competency "use_pronouns_correctly" (weight: 0.3)

Activity 3 (score: 0.9)
  ├──→ competency "form_nominative_sentences" (weight: 0.4)
  └──→ competency "read_fluently_with_harakat" (weight: 0.3)

Competency Scores (weighted average):
  read_fluently_with_harakat = (0.8 × 0.4 + 0.9 × 0.3) / (0.4 + 0.3) = 0.857
  understand_basic_salutations = (0.8 × 0.3 + 0.6 × 0.5) / (0.3 + 0.5) = 0.650
  use_pronouns_correctly = 0.6 × 0.3 / 0.3 = 0.600
  form_nominative_sentences = 0.9 × 0.4 / 0.4 = 0.900

Lesson completion (threshold: 0.7):
  ✅ read_fluently_with_harakat (0.857 ≥ 0.7)
  ❌ understand_basic_salutations (0.650 < 0.7)
  ❌ use_pronouns_correctly (0.600 < 0.7)
  ✅ form_nominative_sentences (0.900 ≥ 0.7)

Result: NOT completed (2 competencies below threshold)
```

**Key characteristics:**
- **Weighted average** — Activities contribute to competencies proportionally to their weight
- **Best score per activity** — Across 3 attempts, the highest score is used
- **Per-competency threshold** — Each competency has its own threshold (default: 0.7)
- **All-or-nothing completion** — ALL competencies must meet their thresholds
- **Simple math** — No ML, no optimization, just weighted averages

**Scoring implementation:**

```python
# Content module — scoring logic
from dataclasses import dataclass
from typing import Optional

@dataclass
class ScoreResult:
    score: float          # 0.0 – 1.0
    feedback: str         # Immediate feedback (shown on first attempt)
    attempts_remaining: int
    activity_complete: bool  # True if max attempts exhausted
    competency_impact: dict[str, float]  # { competency_name: weight }
    correct_answer: Optional[str] = None  # Shown after max attempts

def compute_lesson_completion(
    lesson_id: int,
    db: sqlite3.Connection
) -> dict:
    """Compute whether a lesson is completed based on competency thresholds.

    Returns: {
        "completed": bool,
        "competency_scores": { competency_name: float },
        "competency_status": { competency_name: "met" | "not_met" },
        "completion_threshold": float  # 0.7 default
    }
    """
    # 1. Get all activities for this lesson
    activities = db.query(
        "SELECT * FROM activities WHERE lesson_id = ?", (lesson_id,)
    )

    # 2. Get best score per activity (from user_progress)
    progress = db.query(
        "SELECT activities FROM user_progress WHERE lesson_id = ?", (lesson_id,)
    )
    best_scores = parse_activity_scores(progress[0]["activities"])

    # 3. Compute weighted competency scores
    competency_scores: dict[str, float] = {}
    competency_weights: dict[str, float] = {}

    for activity in activities:
        activity_id = activity["id"]
        score = best_scores.get(activity_id, 0.0)

        # Parse competency map
        competency_map = json.loads(activity["content"])["competency_map"]

        for competency, weight in competency_map.items():
            if competency not in competency_scores:
                competency_scores[competency] = 0.0
                competency_weights[competency] = 0.0

            competency_scores[competency] += score * weight
            competency_weights[competency] += weight

    # 4. Normalize (divide by total weight)
    for competency in competency_scores:
        if competency_weights[competency] > 0:
            competency_scores[competency] /= competency_weights[competency]

    # 5. Determine completion (all competencies ≥ threshold)
    threshold = 0.7
    competency_status = {
        comp: "met" if score >= threshold else "not_met"
        for comp, score in competency_scores.items()
    }

    completed = all(status == "met" for status in competency_status.values())

    return {
        "completed": completed,
        "competency_scores": competency_scores,
        "competency_status": competency_status,
        "completion_threshold": threshold
    }
```

---

### Option B: Conjunctive Model (Minimum Score)

Each competency must meet a **minimum score** regardless of weights. A single low-scoring activity on a competency can prevent lesson completion, even if other activities on that competency scored well.

```
Activity 1 (score: 0.9) → competency A (weight: 0.4)
Activity 2 (score: 0.3) → competency A (weight: 0.3)

Competency A score = min(0.9, 0.3) = 0.3  ← lowest activity score wins
```

**Key characteristics:**
- **Harshest model** — One bad performance on a competency prevents completion
- **No averaging** — Each activity score is taken at face value
- **No weight influence** — Weights don't matter (all activities are equal)
- **Strict mastery** — The learner must perform well on ALL activities, not just most

---

### Option C: Compensatory Model (Weighted Sum)

Competency scores are summed (not averaged). A high score on one activity can compensate for a low score on another. The total must exceed a global threshold.

```
Activity 1 (score: 0.9) → competency A (weight: 0.4)
Activity 2 (score: 0.3) → competency A (weight: 0.3)

Competency A score = (0.9 × 0.4) + (0.3 × 0.3) = 0.45
```

**Key characteristics:**
- **Forgiving model** — High scores compensate for low scores
- **Total, not average** — More activities on a competency = higher total score
- **Weight matters** — High-weight activities contribute more
- **Threshold is absolute** — The global threshold must be met regardless of how many activities contribute

---

## Trade-off Analysis

| Concern | A: Weighted Average | B: Conjunctive (Min) | C: Compensatory (Sum) |
|---------|-------------------|---------------------|---------------------|
| **Fairness** | ✅ Balanced — reflects overall performance | ❌ Harshest — one bad score blocks completion | ⚠️ Forgiving — one good score can mask weakness |
| **Motivation** | ✅ Encourages improvement across all activities | ❌ Demoralizing — one bad score blocks completion | ⚠️ May encourage gaming (focus on high-weight activities) |
| **Mastery** | ✅ Good — requires decent performance on most activities | ✅ Best — requires good performance on ALL activities | ❌ Weak — weak performance can be hidden by strong performance |
| **Complexity** | ✅ Simple — weighted average is easy to understand | ✅ Simplest — just take the minimum | ⚠️ Moderate — sum is simple but threshold tuning is tricky |
| **Pedagogical alignment** | ✅ Aligns with CEFR (proficiency is averaged) | ⚠️ Aligns with strict standards (e.g., medical licensing) | ⚠️ Aligns with holistic assessment (overall competence) |
| **Learner experience** | ✅ Balanced — some flexibility, some rigor | ❌ Punishing — one bad day blocks completion | ⚠️ Too easy — learners may complete without mastering |
| **Threshold tuning** | ✅ One threshold (0.7) works for all competencies | ❌ Threshold must be per-activity (different per activity) | ❌ Threshold must account for number of activities |
| **Partial retry** | ✅ Works well — retry failed activities, keep good scores | ⚠️ Works — retry lowers the minimum | ⚠️ Works — retry increases the total |

---

### When Option B (Conjunctive) Would Be Warranted

A conjunctive model makes sense when:

1. **Mastery is non-negotiable** — Missing a competency has serious consequences (e.g., medical, legal, safety training)
2. **No compensation is acceptable** — Weakness in one area cannot be offset by strength in another
3. **Strict standards** — The learner must perform well on every single activity

**This is too harsh for Lughat Chat.** Language learning is inherently variable; one bad day on "use pronouns correctly" shouldn't block an entire lesson if the learner demonstrated understanding elsewhere.

### When Option C (Compensatory) Would Be Warranted

A compensatory model makes sense when:

1. **Holistic competence matters** — Overall ability is more important than individual performance
2. **Number of activities varies** — Some lessons have 3 activities, others have 10; a sum normalizes across lesson lengths
3. **Gaming is acceptable** — Learners can focus on high-weight activities to "game" the system

**This is too forgiving for Lughat Chat.** A learner could score 0.9 on one high-weight activity and 0.1 on all others, then complete the lesson without mastering any competency.

---

## Consequences

### Choosing Option A (Weighted Average)

#### What becomes easier

- **Fair assessment** — Learners who perform well on most activities can complete lessons even if they struggle on one
- **Partial retry works naturally** — Retrying a failed activity improves the average; successful activities persist
- **One threshold for all** — A single threshold (0.7) works for all competencies; no per-competency tuning needed
- **Easy to explain** — "Your competency score is the weighted average of your activity scores" is intuitive
- **Transparent** — Learners can see exactly how each activity contributes to each competency

#### What becomes harder

- **Weight tuning** — Content authors must assign meaningful weights. A weight of 0.1 on a competency that should be core is misleading.
- **Threshold edge cases** — A competency score of 0.699 vs. 0.700 is a binary pass/fail. Small differences matter.
- **No single-activity competencies** — If a competency maps to only one activity, the average equals that activity's score (no averaging benefit).

#### New code to write

| Area | Backend Changes | Frontend Changes |
|------|----------------|------------------|
| **Scoring** | `content/scoring.py` (new file) | — |
| **Competition check** | `content/lesson_completeness.py` (new file) | — |
| **Progress display** | — | `app/components/CompetencyProgressBar.vue` |
| **Composable** | — | `useCompetencyScores.ts` (new composable) |

#### API response (updated)

```typescript
// GET /api/lessons/:id/competency-status
interface CompetencyStatusResponse {
  lesson_id: number;
  completed: boolean;
  competency_scores: Record<string, number>;  // { competency_name: 0.0–1.0 }
  competency_status: Record<string, "met" | "not_met">;
  completion_threshold: number;  // 0.7 default
}
```

---

### Choosing Option B (Conjunctive)

#### What becomes easier

- **Clear mastery standard** — If every activity scores ≥ threshold, the learner truly mastered the lesson
- **No weight tuning** — Weights don't matter; every activity counts equally
- **No threshold edge cases** — The threshold is per-activity; no averaging to confuse

#### What becomes harder

- **Harsh completion** — One bad score blocks the entire lesson. This is demotivating for learners.
- **No forgiveness** — A learner who demonstrates understanding on 4 of 5 activities cannot complete the lesson if they scored poorly on the 5th.
- **Per-activity threshold tuning** — Each activity may need a different threshold (some are inherently harder than others).

---

### Choosing Option C (Compensatory)

#### What becomes easier

- **Forgiving** — Learners can complete lessons even with some weak performance
- **Encourages focus** — Learners can prioritize high-weight activities

#### What becomes harder

- **Gaming the system** — Learners can focus on high-weight activities and ignore low-weight ones
- **Threshold tuning** — The threshold must account for the number and weights of activities
- **False completion** — A learner may "complete" a lesson without actually mastering any competency

---

## Recommendation

**Adopt Option A: Weighted Average.**

### Rationale

1. **Balanced assessment.** Weighted averaging reflects overall performance without being as harsh as the conjunctive model (Option B) or as forgiving as the compensatory model (Option C). It aligns with how CEFR proficiency is assessed — as an average of demonstrated abilities.
2. **One threshold.** A single threshold (0.7) works for all competencies. No per-competency or per-activity tuning needed. This is simpler for a solo developer to maintain.
3. **Partial retry works naturally.** When a learner retries a failed activity, the average improves. Successful activities persist. This matches the PRD's "partial retry" requirement.
4. **Transparent and explainable.** "Your competency score is the weighted average of your activity scores" is intuitive and can be displayed to the learner.

### Scoring Algorithm (Weighted Average)

```
For each competency C:
  score(C) = Σ(activity_score × activity_weight) / Σ(activity_weights)

Lesson is "completed" when:
  ALL score(C) ≥ 0.7 (default threshold)
```

### Decision Matrix for Future Scoring Model Changes

| Trigger | Action |
|---------|--------|
| Learners complete lessons without mastering competencies | Evaluate conjunctive model (Option B) |
| Learners are blocked by single bad scores | Evaluate weighted average (Option A — current) |
| Need per-competency thresholds | Add per-competency threshold override (extension of Option A) |
| Need analytics on competency mastery | Add competency distribution analytics (ADR-007b) |

### What We're Explicitly NOT Doing

- ❌ No conjunctive (minimum) scoring — too harsh for language learning
- ❌ No compensatory (sum) scoring — too forgiving, enables gaming
- ❌ No per-competency thresholds in MVP — single 0.7 threshold for all
- ❌ No ML-based scoring — simple weighted average is sufficient
- ❌ No per-activity thresholds — one global threshold
- ❌ No competency decay over time — scores are static (no forgetting curve)
- ❌ No cross-lesson competency aggregation — competencies are per-lesson only

### Data Flow (Scoring)

```
User submits answer
    │
    ▼
Score activity (fuzzy string match / content validation)
    │
    ▼
Store best score per activity (in user_progress.activities JSON)
    │
    ▼
Compute competency scores (weighted average)
    │
    ▼
Check completion (all competencies ≥ 0.7)
    │
    ▼
If completed: mark lesson "completed" in user_progress.status
    │
    ▼
Unlock next lesson (if sequential)
```

### Open Questions for Future ADRs

1. **Per-competency thresholds** — Should some competencies have higher thresholds (e.g., 0.8) than others? (ADR-007b)
2. **Competency decay** — Should competency scores decrease over time if not practiced? (ADR-007c)
3. **Cross-lesson competency aggregation** — Should competencies persist across lessons (e.g., "use_pronouns_correctly" in A1 Lesson 1 contributes to A2 Lesson 3)? (ADR-007d)
4. **Analytics dashboard** — If we add progress analytics (completion rates, time-per-activity), what metrics matter? (ADR-007e)

---

## References

- [PRD: Progress Scoring (competency-weighted)](../PRD.md)
- [ADR-001: Language Learning Platform Architecture](./ADR-001-language-learning-platform-architecture.md)
- [Scoring Models in Competency-Based Educational Assessment](https://onlinelibrary.wiley.com/doi/10.1002/cbe2.1173)
- [CEFR Proficiency Framework](https://www.coe.int/en/web/common-european-framework-reference-for-languages)
- [Weighted Average vs. Simple Average in Assessment](https://www.assessmentsimplify.com/blog/weighted-averages)
