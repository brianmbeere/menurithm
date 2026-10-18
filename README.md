# Menurithm

Menurithm is a data-driven decision-support application designed to assist food service operators with inventory alignment, menu planning, and procurement insights.

![Menurithm Dashboard](docs/images/dashboard-screenshot.png)

## Overview
Menurithm processes operational data such as inventory levels and historical usage to generate recommendations that support planning decisions in restaurant and food service environments.

## Key Capabilities
- Inventory-aware menu planning
- Historical usage and demand trend analysis
- Decision-support dashboards for operators
- Integration with external supply coordination systems (e.g., Routecast)

## Architecture (High-Level)
The system follows a modular architecture with:
- Backend services that ingest and process operational data
- Structured relational data persistence
- Web-based user interfaces that present actionable insights

For per-service logical databases and bounded connection pools on a shared Render
Postgres instance, see the [database deployment guide](backend/app/db/README.md#sharing-a-render-postgres-instance).

### Cost-optimized Render deployment

The React frontend is a browser-only Vite SPA and needs no Node server in
production. [`render.yaml`](render.yaml) defines a free static site named
`menurithm-static`: root `frontend`, build `npm ci --include=dev && npm run build`,
publish `dist`, with `/*` rewritten to `/index.html` for client-side routing.
It deliberately does not provision another database or duplicate the backend.
Do not manage the same static site with both manual settings and a separate
Blueprint without first importing/reconciling the resource.

Copy the existing frontend's `VITE_*` variables as **build-time** settings,
including `VITE_BASE_URL=https://menurithm-core.onrender.com` and Firebase web
configuration. Rebuild after changing them. Production builds fail explicitly
if required API/Firebase settings are missing or the API URL is not HTTPS.
For a local production build, override a localhost development URL:

```bash
cd frontend
VITE_BASE_URL=https://menurithm-core.onrender.com npm run build
```

Everything prefixed `VITE_` is public in the browser bundle. Never include a
database URL, Firebase Admin credentials or service-to-service secrets. Firebase
web configuration is designed to be public.

Add the new site origin to the backend's **`CORS_ORIGINS`** (not
`ALLOWED_ORIGINS`, which Menurithm's main module does not use), retaining old
origins during staging. Add the new hostname to Firebase Authentication's
authorized domains and update any referrer restrictions on the Firebase web
API key. Verify sign-in, API requests and direct `/signin` and `/dashboard`
navigation before suspending the old paid frontend.

The old `menurithm.onrender.com` hostname belongs to the existing web service;
the replacement uses `menurithm-static.onrender.com`. Suspending the old service
does not redirect that hostname. Update bookmarks/integration links, or move a
custom domain to the new site. Static sites have no always-on compute charge,
but workspace bandwidth and build-minute allowances still apply.

For the live consolidation, retain the existing `menurithm` logical database on
the smaller Menurithm instance and restore Routecast into a separate `routecast`
database there. The `_pilot` names in the database guide are examples for a fresh
setup, not a requirement to rename or recopy Menurithm's existing data.
Both inspected instances use Basic 256 MB compute (not legacy $7 Starter);
Menurithm has 5 GB allocated storage and Routecast 15 GB. Their live
`SHOW max_connections` value was 103, including PostgreSQL-reserved slots; keep
the much smaller application pool limits instead of treating that as a target.
Retain the original Routecast instance until rollback is no longer needed;
retaining it while running incurs compute/storage charges; suspension stops
compute but may retain storage charges.

#### Verified live layout (2026-10-18)

| Component | Deployment |
| --- | --- |
| Menurithm frontend | https://menurithm-static.onrender.com (static site) |
| Routecast frontend | https://routecast-static.onrender.com (static site) |
| Menurithm API | https://menurithm-core.onrender.com |
| Routecast API | https://routecast-core.onrender.com |
| Active Postgres | Existing Menurithm Basic 256 MB instance, 5 GB allocated |
| Menurithm logical database | `menurithm`, existing owner login |
| Routecast logical database | `routecast`, dedicated `routecast_api` login |
| Rollback resources | Old paid frontends and original Routecast Postgres suspended, not deleted |

Both APIs use pool size 2, overflow 1, timeout 30 seconds and recycle 1800
seconds. The sites deploy from their GitHub `main` branches; live Render static
settings match the checked-in Blueprint definitions. Editing a Blueprint file
alone does not attach an existing manually created service to Blueprint sync.

During cutover, both APIs were suspended and database application sessions
drained before PostgreSQL 16 custom-format backups were taken. All restored
Routecast table counts/content digests and sequence values matched the source;
Menurithm's existing tables/content remained unchanged. Post-cutover,
database-backed reads and CORS preflights passed for both new origins, including
after suspending the original Routecast instance.

The two suspended frontend Starter services remove approximately $14/month of
compute, and suspending the unused Basic 256 MB database removes approximately
$6/month more at current published rates. Storage on the retained rollback
database can still be billed. No automatic deletion is scheduled.

The old frontend `onrender.com` URLs are now unavailable, not redirected.
Do not blindly switch Routecast back to its old database after accepting new
writes: resume the rollback instance, pause writers and copy/reconcile the latest
data first. The original database and cutover backups are point-in-time copies,
not replicas of subsequent writes.

## Sample Interface
The screenshot above illustrates how planning insights are presented to users in a practical, operational format.

## Status
This repository contains an actively developed implementation of the Menurithm platform designed for real-world operational use and iterative refinement.

## Author
Brian Mbeere – Software Engineer  
Focus: data-driven decision-support systems and operational planning platforms.
