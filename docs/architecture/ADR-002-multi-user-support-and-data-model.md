# ADR-002: Multi-User Support and Data Model

## Status

**Superseded** — 2026-07-10

This ADR was proposed but is **not being implemented**. The platform remains single-user. The multi-user support question (authentication strategies, data model extensions, PostgreSQL migration) is deferred indefinitely.

The ADR is retained for reference — should the platform ever need multi-user support, this document provides the evaluation framework and decision matrix.

---

## Context

The current platform is designed for a **single user, forever** — no authentication, no user table, a single `user_progress` table. The PRD explicitly states: *"No User table — single user, single user_progress table."*

However, several factors suggest multi-user support may become necessary:

| Factor | Likelihood | Timeline |
|--------|-----------|-----------|
| **Sharing with friends/family** | High | 6–12 months |
| **Classroom deployment** (teacher + students) | Medium | 12–24 months |
| **Commercial distribution** (if monetized) | Medium | 12–24 months |
| **Cloud hosting** (if local deployment is insufficient) | Low | 24+ months |

### Constraints (Inherited from ADR-001)

| Constraint | Implication |
|-----------|-------------|
| **Local Docker Compose only** | No managed databases, no cloud SQL |
| **CPU-only inference** | Cannot afford heavy database processes alongside TTS |
| **~2GB TTS model** — Already resource-heavy | Database must be lightweight |
| **Solo developer** | Must minimize operational overhead |
| **No cloud hosting** | Database must run inside Docker, on modest hardware |

---

## Decision

We evaluate three options for multi-user support.

---

### Option A: SQLite with Row-Level Isolation (Recommended for MVP)

Extend the existing SQLite database with a `users` table and row-level progress scoping. No schema migration beyond adding tables.

```sql
-- Users (lightweight — no passwords stored in DB, auth handled externally or via API key)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_active INTEGER NOT NULL DEFAULT 1
);

-- Lessons (static content — unchanged from ADR-001)
CREATE TABLE lessons (
    id INTEGER PRIMARY KEY,
    level TEXT NOT NULL CHECK(level IN ('A1', 'A2', 'B1')),
    sequence INTEGER NOT NULL,
    title TEXT NOT NULL,
    competencies TEXT NOT NULL,
    sections TEXT NOT NULL,
    UNIQUE(level, sequence)
);

-- Activities (static content — unchanged from ADR-001)
CREATE TABLE activities (
    id INTEGER PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id),
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    order INTEGER NOT NULL,
    max_attempts INTEGER DEFAULT 3
);

-- User Progress (SINGLE USER → MULTI-USER)
CREATE TABLE user_progress (
    user_id INTEGER NOT NULL REFERENCES users(id),
    lesson_id INTEGER NOT NULL REFERENCES lessons(id),
    status TEXT NOT NULL DEFAULT 'locked'
        CHECK(status IN ('locked', 'available', 'in_progress', 'completed')),
    activities TEXT NOT NULL,          -- JSON: { activityId: { score, attempts, status } }
    completed_at TEXT,
    PRIMARY KEY (user_id, lesson_id)
);
```

**Key changes from single-user model:**
- `user_progress` gains a `user_id` foreign key (was single-row per lesson)
- Sequential unlocking is now **per-user** (each user has their own progression)
- No `User` table needed — use a single-row `users` table with `username` for scoping

**Data access pattern:**
```python
# Old (single user):
SELECT * FROM user_progress WHERE lesson_id = ?

# New (multi-user):
SELECT * FROM user_progress WHERE user_id = ? AND lesson_id = ?
```

**Authentication strategy options:**

| Strategy | Pros | Cons |
|----------|------|------|
| **API key per user** | Simple, no session management, works with Docker Compose | Key management, no "forgot password" |
| **Local LDAP/Active Directory** | Enterprise-ready, no password storage | Requires existing LDAP infrastructure |
| **JWT with local password hash** | Standard, session-based, familiar UX | More code, password storage responsibility |
| **OAuth (Google, GitHub)** | No password management, familiar UX | External dependency, requires internet |

**Recommendation: API keys for MVP, JWT for v2.** API keys are sufficient for a local deployment. JWT adds session management complexity (token refresh, expiry, revocation) that is unjustified for a single-user-to-small-team scenario.

---

### Option B: PostgreSQL

Replace SQLite with PostgreSQL. Full ACID compliance, concurrent access, row-level security, proper foreign key enforcement.

```
┌─────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PostgreSQL (port 5432)                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐  │   │
│  │  │ users    │ │ lessons  │ │ user_progress       │  │   │
│  │  │          │ │          │ │                     │  │   │
│  │  │ id,      │ │ id,      │ │ user_id, lesson_id, │  │   │
│  │  │ username │ │ level,   │ │ status, activities, │  │   │
│  │  │ password │ │ seq,     │ │ completed_at        │  │   │
│  │  │ role     │ │ title    │ │                     │  │   │
│  │  └──────────┘ └──────────┘ └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

### Option C: Keep Single-User Forever

Maintain the current design. No multi-user support.

---

## Trade-off Analysis

| Concern | A: SQLite + Row Isolation | B: PostgreSQL | C: Single-User |
|---------|-------------------------|---------------|----------------|
| **Setup complexity** | ✅ Zero — SQLite is built-in | ❌ PostgreSQL container (~150MB) | ✅ Trivial |
| **Resource usage** | ✅ ~5MB database file | ❌ ~100MB+ RAM for PostgreSQL process | ✅ Zero overhead |
| **Concurrent writes** | ⚠️ SQLite has write locking — one writer at a time | ✅ Full concurrent write support | N/A |
| **Data integrity** | ⚠️ Foreign keys must be explicitly enabled (`PRAGMA foreign_keys = ON`) | ✅ Always enforced | N/A |
| **Query performance** | ⚠️ Degrades with large datasets (>100K rows) | ✅ Indexes, query optimizer | N/A |
| **Backup** | ✅ Single file copy | ❌ `pg_dump` / WAL archiving | N/A |
| **Migration cost** | ✅ One SQL migration script | ❌ Full schema migration, data migration | N/A |
| **Team size** | ✅ Up to ~20 users | ✅ Hundreds of users | ✅ 1 user |
| **Cloud portability** | ⚠️ SQLite file on cloud storage is fragile | ✅ Standard cloud offering | N/A |
| **Learning curve** | ✅ No new technology | ❌ SQL dialect differences, connection pooling | ✅ None |
| **Docker image size** | ✅ No extra image | ❌ ~150MB PostgreSQL image | ✅ No extra image |

---

### When Option B (PostgreSQL) Would Be Warranted

PostgreSQL makes sense when **all** of the following are true:

1. **Concurrent writes** — Multiple users submitting answers simultaneously (SQLite write locking causes contention)
2. **Large datasets** — Tens of thousands of users, millions of progress records
3. **Cloud deployment** — Managed PostgreSQL (AWS RDS, Azure PostgreSQL, etc.)
4. **Advanced features needed** — Row-level security, full-text search, analytics queries
5. **Regulatory requirements** — Audit logging, data retention policies, GDPR compliance

**None of these apply to the current or near-future Lughat Chat.** SQLite handles concurrent reads fine (the common case). Writes are rare (one per activity submission). The dataset for a local deployment of this platform is tiny.

---

### When Option C (Single-User) Would Be Warranted

Keeping single-user makes sense when:

1. The platform is a **personal tool** — one learner, one device
2. There is **no sharing, no classroom, no distribution**
3. The cost of multi-user features (authentication, session management, data isolation) outweighs the benefit

**This is the current state.** It works for the MVP but blocks any path to sharing, classroom use, or distribution.

---

## Consequences

### Choosing Option A (SQLite with Row-Level Isolation)

#### What becomes easier

- **Adding new users** — Insert a row into `users`, no schema changes needed
- **Progress isolation** — Each user's progress is scoped by `user_id`
- **Backups** — Single SQLite file can be copied or archived
- **Migration from single-user** — Existing `user_progress` data migrates by adding `user_id = 1` to all existing rows
- **No new dependencies** — SQLite is built into Python; no extra Docker image
- **Classroom deployment** — A teacher can run the platform with 20–50 students on a modest machine

#### What becomes harder

- **Write contention** — SQLite allows one writer at a time. If two users submit answers simultaneously, one request will fail with "database is locked." This is unlikely in a local deployment but must be handled with retry logic.
- **No authentication** — API keys must be managed manually (distributed to users, rotated if compromised). No "forgot password" flow.
- **Scalability ceiling** — SQLite degrades with >100K rows. For a classroom of 30 students × 30 lessons × 5 activities, that's ~4,500 progress rows — well within SQLite's comfort zone. But if the platform scales to hundreds of users, SQLite becomes a bottleneck.
- **No password hashing** — If JWT is chosen later, the password must be stored hashed (bcrypt/argon2). This is a security responsibility that doesn't exist in the single-user model.
- **Data migration risk** — Converting from single-user to multi-user requires a migration script. If it fails, existing progress data is at risk.

#### New code to write

| Area | Backend Changes | Frontend Changes |
|------|----------------|------------------|
| **Users module** | `backend/users/routes.py`, `backend/users/models.py` | `useAuth.ts` (new composable) |
| **Progress scoping** | All `user_progress` queries scoped by `user_id` | — |
| **API keys** | `backend/auth/routes.py` (generate/validate API keys) | — |
| **Migration script** | `backend/migrate_single_to_multi.py` | — |

#### New API endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Register a new user (returns API key) |
| `/api/auth/verify` | POST | Verify an API key (returns user info) |
| `/api/auth/rotate-key` | POST | Generate a new API key (invalidate old) |

#### Migration script (single-user → multi-user)

```python
# 1. Add users table
# 2. Create default user "admin"
# 3. Add user_id column to user_progress
# 4. Set user_id = 1 for all existing rows
# 5. Add NOT NULL constraint on user_id
# 6. Add foreign key to users table
```

This is a **one-time migration** that runs on first startup if the `users` table doesn't exist.

---

### Choosing Option B (PostgreSQL)

#### What becomes easier

- **Concurrent writes** — Multiple users can submit answers simultaneously without SQLite's write locking
- **Large datasets** — PostgreSQL handles millions of rows efficiently with proper indexing
- **Advanced queries** — Full-text search on lesson content, analytics on progress patterns
- **Cloud deployment** — Managed PostgreSQL is a standard cloud offering (AWS RDS, Azure PostgreSQL, etc.)
- **Row-level security** — PostgreSQL's RLS can enforce per-user data access at the database level
- **Proper foreign keys** — Always enforced, no `PRAGMA` needed

#### What becomes harder

- **Resource overhead** — PostgreSQL process uses ~100MB RAM minimum. On a machine running TTS (~500MB) + Nginx + PostgreSQL, total memory is ~700MB+ — still manageable but significantly heavier than SQLite.
- **Docker complexity** — 3 containers instead of 2 (backend, frontend, PostgreSQL). Health checks, volume management, connection pooling.
- **Migration from SQLite** — Full schema migration, data export/import, testing the migration itself. This is a one-time cost but must be done carefully.
- **Connection management** — FastAPI must use async PostgreSQL drivers (asyncpg, psycopg async). This changes the backend code significantly.
- **Backup complexity** — `pg_dump` / WAL archiving vs. a single file copy. More operational knowledge required.
- **No benefit for small deployments** — For <50 users, the operational cost of PostgreSQL far exceeds any benefit.

#### When PostgreSQL becomes worth it

| Metric | SQLite Threshold | PostgreSQL Needed |
|--------|------------------|-------------------|
| Concurrent users | < 50 | > 50 |
| Progress rows | < 100K | > 100K |
| Concurrent writes | < 10/sec | > 10/sec |
| Memory budget | < 1GB | > 1GB |

---

### Choosing Option C (Single-User Forever)

#### What becomes easier

- **Zero additional work** — the current system works for its narrow purpose
- **No authentication** — no login, no registration, no key management
- **No data isolation** — one user, one progress, no scoping needed
- **Simplest possible deployment** — one `docker compose up`, works immediately

#### What becomes harder

- **Cannot share** — No way to give the platform to a friend, a class, or a community
- **No classroom use** — Teachers cannot deploy this in a classroom without workarounds (one instance per student)
- **No distribution** — If the platform is ever distributed (open source, educational institutions), each user must manage their own SQLite file and progress data
- **No growth path** — The platform is capped at one user. Any request for multi-user support requires a complete rewrite of the data layer
- **Competitive disadvantage** — Modern learning platforms (Duolingo, Memrise, Anki) all support multi-user. A single-user platform is a niche tool, not a platform

---

## Recommendation

**Adopt Option A: SQLite with Row-Level Isolation.**

### Rationale

1. **The current dataset is small.** A classroom of 30 students × 30 lessons × 5 activities = ~4,500 progress rows. SQLite handles this trivially.
2. **SQLite is already used.** The platform already uses SQLite for lesson content and progress. Adding a `users` table and `user_id` scoping is a schema extension, not a migration.
3. **PostgreSQL is overkill for the near term.** The three conditions for PostgreSQL (concurrent writes, large datasets, cloud deployment) are not met now and are unlikely for 12–24 months.
4. **Migration from SQLite to PostgreSQL is possible.** If the platform scales, the schema is simple enough that a PostgreSQL migration script is straightforward. The reverse (SQLite → PostgreSQL) is harder than PostgreSQL → SQLite because you lose the single-file simplicity.
5. **API keys are sufficient for MVP.** No session management, no password hashing, no "forgot password" — just a generated key that users store and use. This is appropriate for a local deployment.

### Decision Matrix for Future Migration to PostgreSQL

| Trigger | Action |
|---------|--------|
| > 50 concurrent users | Evaluate PostgreSQL |
| > 100K progress rows | Evaluate PostgreSQL |
| > 10 concurrent writes/sec | Evaluate PostgreSQL |
| Cloud deployment planned | Adopt PostgreSQL |
| Regulatory requirements (audit, retention) | Adopt PostgreSQL |

If any trigger fires, the migration path is:

1. Create PostgreSQL container in Docker Compose
2. Run migration script that copies data from SQLite to PostgreSQL
3. Update FastAPI to use async PostgreSQL driver (asyncpg or psycopg async)
4. Update all queries to use parameterized PostgreSQL syntax
5. Test thoroughly (SQLite and PostgreSQL have subtle dialect differences)

### What We're Explicitly NOT Doing

- ❌ No JWT session management in the MVP — API keys only
- ❌ No password hashing in the MVP — username + API key
- ❌ No OAuth integration in the MVP — no external auth providers
- ❌ No row-level security (PostgreSQL RLS) — not using PostgreSQL yet
- ❌ No analytics or reporting queries — not using PostgreSQL yet
- ❌ No multi-tenant data isolation beyond `user_id` scoping

### Data Access Pattern (After Adoption)

```python
# Old (single user):
@router.get("/api/progress")
async def get_progress():
    return db.query("SELECT * FROM user_progress")

# New (multi-user, API key scoped):
@router.get("/api/progress")
async def get_progress(user: User = Depends(verify_api_key)):
    return db.query(
        "SELECT * FROM user_progress WHERE user_id = ?",
        user.id
    )
```

### Open Questions for Future ADRs

1. **Authentication strategy** — If JWT is added later (session-based auth), does it fit in the current module structure, or does it need its own service? (ADR-002b)
2. **Data retention policy** — If regulations require deleting user data after a period, how do we handle cascade deletes across `users`, `user_progress`, and `activities`? (ADR-006)
3. **Analytics and reporting** — If we need progress analytics (completion rates, time-per-activity, competency mastery), does SQLite remain sufficient, or do we need a separate analytics database? (ADR-007)

---

## References

- [PRD: Data Model (SQLite)](../PRD.md)
- [ADR-001: Language Learning Platform Architecture](./ADR-001-language-learning-platform-architecture.md)
- [SQLite Concurrency Model](https://www.sqlite.org/concurrency.html)
- [SQLite vs PostgreSQL: When to Upgrade](https://stackoverflow.com/questions/18664016/when-should-i-switch-from-sqlite-to-postgresql)
