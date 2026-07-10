# ADR-004: Cloud Deployment and Scalability

## Status

**Suspended** — 2026-07-10

This ADR is **not being implemented**. The platform will remain local Docker Compose only — no cloud deployment.

The ADR is retained for reference — should cloud deployment become necessary in the future, this document provides the evaluation framework and migration triggers.

This ADR addresses the question raised in ADR-001: *If we move from local Docker Compose to cloud hosting, does the modular monolith still hold, or do we extract the TTS service?* It evaluates cloud deployment strategies, scalability concerns, and the modular monolith's evolution path.

---

## Context

The current platform is designed for **local Docker Compose deployment** on a single machine. The PRD states: *"Cloud deployment (local Docker Compose only)."*

However, several factors may push the platform toward cloud hosting:

| Factor | Likelihood | Timeline |
|--------|-----------|-----------|
| **User requests cloud access** (web app, not local install) | Medium | 12–24 months |
| **Classroom deployment** (teacher manages instance) | Medium | 12–24 months |
| **Commercial distribution** (if monetized) | Medium | 12–24 months |
| **High-traffic public service** | Low | 24+ months |
| **Multi-region availability** | Low | 24+ months |

### Constraints (Inherited from ADR-001)

| Constraint | Implication |
|-----------|-------------|
| **CPU-only inference** — No GPU | TTS takes several seconds; cannot handle high concurrency |
| **~2GB TTS model** — Already resource-heavy | Cloud instance must have ≥4GB RAM |
| **Solo developer** — No DevOps team | Cloud deployment must be simple (no Kubernetes, no managed services) |
| **Modular monolith** — Single process, single SQLite | Cloud deployment must preserve this structure unless scalability demands otherwise |

### Current Deployment (Local)

```
┌─────────────────────────────────────────────────────────────┐
│  Local Machine (4–8GB RAM)                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Docker Compose                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │  Backend    │  │  Frontend   │                   │   │
│  │  │  :9000      │  │  :9001      │                   │   │
│  │  │  FastAPI    │  │  Nginx      │                   │   │
│  │  │  XTTS-v2    │  │  SPA        │                   │   │
│  │  │  SQLite     │  │             │                   │   │
│  │  └─────────────┘  └─────────────┘                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Decision

We evaluate three cloud deployment options.

---

### Option A: Cloud-Hosted Modular Monolith (Recommended)

Deploy the same modular monolith (single FastAPI process + single Nginx) to a cloud VM. No architectural changes. Same code, same structure, different host.

```
┌─────────────────────────────────────────────────────────────┐
│  Cloud VM (4–8GB RAM, e.g., AWS t3.medium, DigitalOcean)    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Docker Compose (same as local)                      │   │
│  │  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │  Backend    │  │  Frontend   │                   │   │
│  │  │  :9000      │  │  :9001      │                   │   │
│  │  │  FastAPI    │  │  Nginx      │                   │   │
│  │  │  XTTS-v2    │  │  SPA        │                   │   │
│  │  │  SQLite     │  │             │                   │   │
│  │  └─────────────┘  └─────────────┘                   │   │
│  └─────────────────────────────────────────────────────┘   │
│  Public: port 80 (Nginx) → proxy to /api/* → Backend       │
└─────────────────────────────────────────────────────────────┘
```

**Key characteristics:**
- **Same codebase** — No changes to backend or frontend
- **Same Docker Compose** — `docker compose up` works identically
- **Single public port** — Nginx exposes port 80; backend is internal only
- **Same resource constraints** — 4–8GB RAM, CPU-only, ~3.5GB model storage
- **Single user (or few users)** — No scaling, no load balancing, no high availability

---

### Option B: Extract TTS as Separate Service

Split the TTS module into its own service. Content and Progress remain in a single "app" service; TTS is a separate service that content and progress call via HTTP.

```
┌─────────────────────────────────────────────────────────────┐
│  Cloud VM (8–16GB RAM)                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Docker Compose (modified)                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  App Svc    │  │  Frontend   │  │  TTS Svc    │  │   │
│  │  │  :9100      │  │  :9001      │  │  :9200      │  │   │
│  │  │  FastAPI    │  │  Nginx      │  │  FastAPI    │  │   │
│  │  │  Content    │  │  SPA        │  │  XTTS-v2    │  │   │
│  │  │  Progress   │  │             │  │  SQLite     │  │   │
│  │  └──────┬─────┘  └─────────────┘  └──────┬─────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key characteristics:**
- **TTS isolated** — Content and Progress APIs remain available even when TTS is down
- **Independent scaling** — TTS can be on a larger instance; content/progress on a smaller one
- **Higher resource usage** — 3 containers instead of 2; more overhead
- **Inter-service communication** — App service calls TTS service via internal network

---

### Option C: Cloud STT + Cloud TTS (Full Cloud)

Move everything to cloud services. TTS via a cloud API (ElevenLabs, Azure Speech), STT via a cloud API (Google Cloud Speech-to-Text). The platform becomes a thin wrapper around cloud APIs.

```
┌─────────────────────────────────────────────────────────────┐
│  Cloud VM (1–2GB RAM — lightweight)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Docker Compose (minimal)                            │   │
│  │  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │  App Svc    │  │  Frontend   │                   │   │
│  │  │  :9100      │  │  :9001      │                   │   │
│  │  │  FastAPI    │  │  Nginx      │                   │   │
│  │  │  Content    │  │  SPA        │                   │   │
│  │  │  Progress   │  │             │                   │   │
│  │  └─────────────┘  └─────────────┘                   │   │
│  └─────────────────────────────────────────────────────┘   │
│  External APIs:                                             │
│  ├── ElevenLabs (TTS) — $0.03/min                          │
│  ├── Google Cloud STT — $0.006/min                         │
│  └── Cloud PostgreSQL — $15/mo                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Option D: Keep Local Only

Maintain the current local-only deployment. No cloud hosting.

---

## Trade-off Analysis

| Concern | A: Cloud Monolith | B: Extract TTS | C: Full Cloud | D: Local Only |
|---------|-------------------|---------------|---------------|---------------|
| **Setup complexity** | ✅ Same Docker Compose | ❌ 3 containers, inter-service HTTP | ❌ 3 cloud API integrations | ✅ Trivial |
| **Resource usage** | ✅ 4–8GB RAM | ❌ 8–16GB RAM | ✅ 1–2GB RAM | ✅ 4–8GB RAM (local) |
| **Cost** | ✅ $5–15/mo (VM) | ❌ $15–30/mo (2 VMs) | ❌ $15/mo + API costs | ✅ Free (local hardware) |
| **Scalability** | ⚠️ Single VM, single user | ⚠️ TTS can scale independently | ✅ Cloud APIs scale infinitely | ❌ Single machine |
| **High availability** | ⚠️ Single point of failure | ⚠️ TTS downtime affects all | ✅ Cloud SLAs (99.9%+) | ❌ Local machine goes down |
| **Latency** | ⚠️ Cloud latency (50–200ms) | ⚠️ Inter-service HTTP (1–5ms) | ✅ Cloud API latency (100–500ms) | ✅ Local (<1ms) |
| **Offline capability** | ❌ Requires internet | ❌ Requires internet | ❌ Requires internet | ✅ Full offline |
| **Privacy** | ⚠️ Data on cloud VM | ⚠️ Data on cloud VM | ❌ Data sent to third parties | ✅ Full (local) |
| **Model management** | ✅ Same local models | ❌ 2× model downloads | ✅ No local models | ✅ Same local models |
| **Team size** | ✅ 1 developer | ⚠️ 1–2 developers | ⚠️ 1–2 developers + API management | ✅ 1 developer |
| **Migration from local** | ✅ Zero code changes | ❌ Requires service extraction | ❌ Requires API integration | N/A |

---

### When Option B (Extract TTS) Would Be Warranted

Extracting TTS into a separate service makes sense when **all** of the following are true:

1. **TTS downtime is unacceptable** — Content and Progress must remain available even when TTS is down
2. **TTS resources differ from other services** — TTS needs more CPU/RAM than content/progress serving
3. **Independent scaling** — TTS needs to scale independently (many users generating speech, few reading content)
4. **Fault isolation** — A TTS crash should not take down the entire application

**None of these strongly apply to Lughat Chat at the current stage.** The platform is for a single user (or small classroom). TTS downtime is a minor inconvenience, not a critical failure. The resource difference between TTS (~2GB) and content/progress (~500MB) is not large enough to justify separate instances.

---

### When Option C (Full Cloud) Would Be Warranted

Full cloud deployment makes sense when:

1. **Zero local resources** — The platform must run on any device, including low-spec machines
2. **No local model downloads** — Users should not need to download ~3.5GB of models
3. **Maximum quality** — Cloud TTS/STT models are significantly better than local models
4. **Global availability** — The platform must be accessible from anywhere with low latency
5. **Budget is available** — Cloud costs (VM + APIs) are acceptable

**These conditions are not met by Lughat Chat's current design.** The platform is explicitly designed for local, offline, zero-cost deployment. Moving to full cloud contradicts the core value proposition.

---

### When Option D (Local Only) Would Be Warranted

Keeping local-only makes sense when:

1. **Offline capability is required** — The platform must work without internet
2. **Privacy is paramount** — No data leaves the user's machine
3. **Zero cost** — No hosting costs, no API subscriptions
4. **Single-user或小团队** — No scaling needs
5. **Local hardware is sufficient** — 4–8GB RAM is available

**This is the current state and the recommended path for the foreseeable future.** The platform is designed for local deployment. Cloud hosting is a future consideration, not a current need.

---

## Consequences

### Choosing Option A (Cloud-Hosted Modular Monolith)

#### What becomes easier

- **Public access** — Users can access the platform from any device with a browser (no local install required)
- **Zero local install** — No Docker, no model downloads, no local setup. Just open a URL.
- **Same code** — No changes to backend or frontend. The same `docker compose up` works locally and in the cloud.
- **Shared progress** — All users see the same progress (if single-user) or scoped progress (if multi-user with API keys).
- **Simple deployment** — One VM, one Docker Compose file. No Kubernetes, no load balancers, no managed databases.
- **Model caching** — The ~3.5GB of models is cached on the VM. Subsequent startups are fast (model loads from disk).

#### What becomes harder

- **Ongoing cost** — A 4–8GB VM costs $5–15/month. Over a year, that's $60–180. This is a recurring cost that doesn't exist in local deployment.
- **Internet dependency** — The platform no longer works offline. Users need an internet connection.
- **Security** — Exposing a VM to the internet requires firewall rules, SSL/TLS, rate limiting, and monitoring. This is operational knowledge that a solo developer may not have.
- **Single point of failure** — If the VM goes down, the entire platform is unavailable. No redundancy, no failover.
- **Model storage** — ~3.5GB of models (TTS + optional STT) stored on the VM. If the VM is recreated (e.g., after a crash), models must be re-downloaded unless a persistent volume is used.
- **No offline fallback** — Users cannot fall back to local deployment if the cloud service is down.

#### New infrastructure to set up

| Component | Description | Cost |
|-----------|-------------|------|
| **Cloud VM** | 4–8GB RAM, 2 vCPU, 40GB disk (AWS t3.medium, DigitalOcean Basic, Hetzner) | $5–15/mo |
| **Domain name** | Optional — for a custom URL (lughat.chat) | $10–15/year |
| **SSL certificate** — Let's Encrypt (free) or managed by cloud provider | Free |
| **Firewall** — Only port 80 (Nginx) exposed; backend port 9000 internal only | Free |
| **Backup** — Periodic SQLite file backup + model cache snapshot | Free (manual) |

#### Docker Compose changes (minimal)

```yaml
# Current (local) — no changes needed
services:
  backend:
    ports:
      - "9000:8000"  # Host port 9000 → container port 8000
    # ...

# Cloud — change to expose only frontend (port 80)
services:
  backend:
    ports:
      - "8000:8000"  # Internal only — no host port mapping
    # ...
  frontend:
    ports:
      - "80:80"  # Public — Nginx handles routing
    # ...
```

**Key change:** Backend port is no longer exposed to the host. Only frontend (port 80) is public. Nginx proxies `/api/*` to the backend.

#### Security considerations

| Concern | Mitigation |
|---------|-----------|
| **Backend exposed** | Do NOT map backend port to host. Only expose Nginx (port 80). |
| **CORS** | Restrict `allow_origins` to the frontend domain (not `*`). |
| **SSL/TLS** — Use Let's Encrypt (free) or cloud provider's managed certificates. |
| **Rate limiting** — Nginx `limit_req` to prevent API abuse. |
| **Database backup** — Periodic `sqlite3 .backup` to a persistent volume. |
| **Model cache** — Use a persistent Docker volume for the ~3.5GB of models. |

---

### Choosing Option B (Extract TTS)

#### What becomes easier

- **TTS isolation** — Content and Progress APIs remain available even when TTS is down
- **Independent scaling** — TTS can be on a larger instance; content/progress on a smaller one
- **Fault tolerance** — A TTS crash does not take down the entire application
- **Resource optimization** — TTS can use more CPU/RAM without affecting content/progress

#### What becomes harder

- **Three containers** — 3 Docker images, 3 health checks, 3 restart policies. More to manage.
- **Inter-service communication** — Content service must call TTS service via internal HTTP. This adds network latency, error handling, retry logic, and circuit breakers.
- **Resource overhead** — 3 FastAPI instances (even if one is lightweight) plus 3 Nginx instances. Total RAM: 8–16GB.
- **Model cache duplication** — Either share a volume (complex mount paths) or download models 2×.
- **Testing complexity** — Integration tests must spin up 3 containers. CI pipelines slow down.
- **No benefit for single-user** — The operational cost far exceeds any benefit for a single-user platform.

#### When extraction becomes worth it

| Metric | Modular Monolith | Extracted TTS |
|--------|------------------|---------------|
| Concurrent TTS requests | < 5 | > 5 |
| TTS downtime impact | Acceptable | Unacceptable |
| VM memory budget | < 8GB | > 8GB |
| Team size | 1 developer | 2+ developers |

---

### Choosing Option C (Full Cloud)

#### What becomes easier

- **No local models** — Users don't need to download ~3.5GB of models
- **No local hardware requirements** — Runs on any device with a browser (even a phone)
- **Maximum quality** — Cloud TTS/STT models are significantly better than local models
- **Global availability** — Accessible from anywhere with low latency
- **Infinite scalability** — Cloud APIs scale automatically

#### What becomes harder

- **Ongoing costs** — VM ($15/mo) + TTS API ($0.03/min) + STT API ($0.006/min). For a classroom of 30 students practicing 10 minutes each per week: 30 × 10 × 4 = 1,200 minutes/month. TTS: $36/mo. STT: $7.20/mo. Total: ~$57/mo (plus VM).
- **No offline capability** — The platform requires internet. This contradicts the core value proposition.
- **No privacy** — Audio is sent to third-party cloud APIs. This may violate privacy expectations.
- **Vendor lock-in** — Switching from Google to Azure to ElevenLabs requires rewriting the API integration.
- **Rate limits** — Cloud APIs have rate limits. A classroom of 30 students practicing simultaneously may hit limits.
- **No local fallback** — If the cloud service is down, there is no fallback. The platform is completely unavailable.

---

### Choosing Option D (Local Only)

#### What becomes easier

- **Zero cost** — No hosting costs, no API subscriptions
- **Full offline capability** — Works without internet
- **Full privacy** — No data leaves the user's machine
- **No operational overhead** — No VM management, no SSL, no firewalls, no backups
- **No vendor lock-in** — No cloud provider to switch, no API to depend on
- **Predictable performance** — Local latency (<1ms), no network variability

#### What becomes harder

- **Local install required** — Users must install Docker, run `docker compose up`, wait for model download (~10 minutes on first start)
- **Hardware requirements** — 4–8GB RAM, 40GB disk (2GB TTS + 1.5GB STT + 30 lessons + SQLite)
- **No public access** — Cannot be accessed from other devices without port forwarding (risky)
- **No sharing** — Cannot be shared with friends, a classroom, or a community without each user installing locally
- **No growth path** — If the platform scales beyond a single machine, a complete re-architecture is needed

---

## Recommendation

**Adopt Option A: Cloud-Hosted Modular Monolith.**

### Rationale

1. **Zero code changes.** The same Docker Compose file works locally and in the cloud. The only change is exposing only the frontend port (80) publicly and keeping the backend internal.
2. **Same modular monolith.** The Content, Progress, and TTS modules remain in a single process. No service extraction, no inter-service HTTP calls, no distributed systems complexity.
3. **Simple deployment.** One VM, one Docker Compose file, one public port. No Kubernetes, no load balancers, no managed databases. A solo developer can manage this.
4. **Same resource constraints.** 4–8GB RAM, CPU-only, ~3.5GB model storage. This is the same as local deployment, just on a cloud VM.
5. **Extract later if needed.** If the platform scales to the point where TTS extraction becomes worthwhile (Option B), the module boundaries established in ADR-001 make extraction straightforward. The reverse (un-extracting from microservices to a monolith) is painful.

### Decision Matrix for Future TTS Extraction

| Trigger | Action |
|---------|--------|
| > 5 concurrent TTS requests | Evaluate extracting TTS (Option B) |
| TTS downtime is unacceptable | Extract TTS (Option B) |
| VM memory > 8GB needed | Extract TTS (Option B) |
| Team grows to 2+ developers | Consider extracting TTS (Option B) |

### What We're Explicitly NOT Doing

- ❌ No Kubernetes — simple Docker Compose on a single VM
- ❌ No load balancing — single VM, single instance
- ❌ No managed databases — SQLite remains the database
- ❌ No cloud TST/STT APIs — local models only (XTTS-v2 + optional Whisper)
- ❌ No high availability — single point of failure is acceptable for a single-user/small-team platform
- ❌ No auto-scaling — fixed VM size, no scaling

### Deployment Checklist (Cloud VM)

1. **Provision VM** — 4–8GB RAM, 2 vCPU, 40GB disk (AWS t3.medium, DigitalOcean Basic Small, Hetzner CX21)
2. **Install Docker + Docker Compose** — Standard Docker installation
3. **Clone repository** — `git clone` the Lughat Chat repository
4. **Run `docker compose up -d`** — Same as local deployment
5. **Configure Nginx** — SSL/TLS (Let's Encrypt), rate limiting, CORS restriction
6. **Configure firewall** — Only port 80 (Nginx) exposed; backend port 9000 internal only
7. **Set up backups** — Periodic SQLite file backup + model cache snapshot
8. **Monitor** — Basic logging (docker compose logs), health checks

### Future Migration Path (Monolith → Extracted TTS)

If the platform scales to the point where TTS extraction is warranted:

1. **Extract TTS module** — Move TTS code from the monolith to a separate FastAPI service
2. **Add inter-service HTTP calls** — Content/Progress services call TTS service via internal network
3. **Add retry logic** — Handle TTS service unavailability gracefully
4. **Add circuit breaker** — Prevent cascading failures when TTS is down
5. **Add observability** — Tracing, metrics, logging across services
6. **Scale TTS independently** — Put TTS on a larger VM; keep Content/Progress on a smaller one

This migration is **straightforward** because the module boundaries in the modular monolith are clear. The reverse (un-extracting from microservices to a monolith) is painful — which is why we stay with the monolith as long as possible.

---

## References

- [PRD: Deployment (Local Docker Compose only)](../PRD.md)
- [ADR-001: Language Learning Platform Architecture](./ADR-001-language-learning-platform-architecture.md)
- [ADR-002: Multi-User Support and Data Model](./ADR-002-multi-user-support-and-data-model.md)
- [Monolith vs Microservices: Team Topology, Conway's Law, and the Distributed System Tax](https://hld.handbook.academy/curriculum/architecture-patterns/monolith-vs-microservices/)
- [Docker Compose Best Practices for Cloud Deployment](https://docs.docker.com/compose/best-practices/)
