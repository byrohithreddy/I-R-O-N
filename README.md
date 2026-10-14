# I.R.O.N. — Institutional Recruitment & Operations Network

<div align="center">

![I.R.O.N. Banner](https://img.shields.io/badge/I.R.O.N.-Enterprise%20Campus%20Recruitment-09090b?style=for-the-badge&logo=shield)

**Next-Generation Campus Placement Management & Edge-Accelerated Recruiter Workflow Engine**

[![Version](https://img.shields.io/badge/Release-v2.0%20(Production%20Ready)-10b981?style=flat-square&logo=git)](https://github.com/byrohithreddy/I-R-O-N)
[![Production Status](https://img.shields.io/badge/Production-Live%20on%20Cloudflare%20Pages-f38020?style=flat-square&logo=cloudflare)](https://iron-recruitment.pages.dev)
[![React](https://img.shields.io/badge/React-19.0-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Cloudflare D1](https://img.shields.io/badge/Database-Cloudflare%20D1%20SQLite-faad3f?style=flat-square&logo=cloudflare)](https://developers.cloudflare.com/d1/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary%20%2F%20All%20Rights%20Reserved-crimson?style=flat-square)](LICENSE)

[Live Production](https://iron-recruitment.pages.dev) • [Overview](#-overview) • [System Architecture](#-system-architecture) • [Security & Auth Architecture](#-security--authentication-architecture) • [Key Features](#-key-features) • [Placement Governance Rules](#-the-24-strict-placement-governance-rules) • [Database & Schema](#-database-schema--data-model) • [Repository Structure](#-repository-structure) • [License](#-license--intellectual-property)

</div>

---

## 📌 Overview

**I.R.O.N. (Institutional Recruitment & Operations Network) v2.0** is an enterprise-grade campus placement operations platform architected for Training & Placement Officers (TPO), Student Coordinators, Corporate Recruiters (HR), and Students.

Engineered on a globally distributed serverless edge architecture with **Cloudflare Pages Functions** and **Cloudflare D1 SQLite**, I.R.O.N. eliminates spreadsheets, manual errors, and recruitment bottlenecks. The system enforces 100% database-authoritative drives, real-time academic eligibility screening, atomic coordinator batching, multi-round interview progression, debounced bulk evaluation sync, instant offer rollouts, strict Indian Standard Time (Asia/Kolkata) governance, token-invalidating TPO account security, and compliant 6-month data archival.

---

## 🏛️ System Architecture

I.R.O.N. utilizes an isomorphic dual-runtime architecture: a **serverless Edge-first deployment** on Cloudflare Pages paired with an **in-memory / local SQLite + Express engine** for rapid local execution, both adhering to identical relational schemas and business rule constraints.

```
                                  +---------------------------------------+
                                  |         I.R.O.N. Web Client           |
                                  |    (React 19 + TypeScript + Vite)     |
                                  +---------------------------------------+
                                                      |
                                                      | HTTPS / REST / Sync
                                                      v
                                  +-------------------+-------------------+
                                  |                                       |
                   [ Cloudflare Pages Functions ]               [ Node.js / Express ]
                    (Edge API & Real-Time Sync)                 (Local Development DB)
                                  |                                       |
                                  v                                       v
                    [ Cloudflare D1 SQLite DB ]                 [ SQLite / Drizzle ]
                    (Global Edge-Replicated DB)                 (Local Instance)
                                  |                                       |
                   +--------------+-------------+                         |
                   |                            |                         |
            [ D1 Migrations ]          [ Sync Revision ]                  |
            (0001 -> 0004 SQL)         (Monotonic Clock)                  |
```

### 1. Dual-Runtime Edge & Backend Design
- **Cloudflare Pages Functions (`/functions/api/[[route]].ts`)**: Edge serverless endpoints handling authentication, drive management, real-time sync, bulk evaluations, and credential rotation with low global latency.
- **Node.js + Express Server (`src/server/routes.ts` & `server.ts`)**: Parity environment executing identical SQL queries, validation logic, and password hashing for local and containerized deployments.
- **Client Storage & Sync Engine (`src/services/storage.ts`)**: Monotonically checks revision tokens (`sync_revision`) to ensure candidate queues, evaluations, and round transitions sync across multi-user sessions without collisions.

### 2. Recruiter & Candidate Workflow Pipeline

```
  [ Student Master DB ] ────── (College-authoritative CGPA, active backlogs, branches)
         │
         ▼
  [ TPO Provisions Drive ] ─── (Eligibility policies, rounds, auto-generated coordinator/HR logins)
         │
         ▼
  [ Public / Visitor Apply ] ─ (Instant roll-no lookup, automated eligibility check before 00:00 IST)
         │
         ▼
  [ Coordinator Batching ] ─── (Dynamic batching, UNIQUE(round_id, student_id) concurrency lock)
         │
         ▼
  [ HR Recruiter Scoring ] ─── (Debounced bulk save, SELECT / HOLD decisions, live batch freeze)
         │
         ▼
  [ Final Round (Rule 22) ] ── (HOLD disabled; SELECT automatically records verified placement)
         │
         ▼
  [ 6-Month Data Lifecycle ] ─ (Compliant ZIP export, drive purge, Student Master DB preserved)
```

---

## 🔐 Security & Authentication Architecture

I.R.O.N. incorporates defense-in-depth measures to protect student academic records, recruiter evaluations, and institutional placement credentials:

```
  +-----------------------------------------------------------------------------------+
  |                               TPO SECURITY ENGINE                                 |
  +-----------------------------------------------------------------------------------+
  |                                                                                   |
  |  1. Self-Service Password Reset                                                   |
  |     - Verification of existing password via salted PBKDF2 hash                    |
  |     - Strict password policy enforcement: >= 8 chars, uppercase, lowercase,       |
  |       numbers, and special symbols                                                |
  |                                                                                   |
  |  2. Token Versioning & Instant Multi-Session Invalidation                         |
  |     - Every credential update increments `users.token_version`                    |
  |     - All active JWT / session bearer tokens immediately fail validation          |
  |     - Forces immediate re-authentication across all connected devices             |
  |                                                                                   |
  |  3. Immutable Security Audit Logging                                              |
  |     - Logs each password change to `password_change_logs`                         |
  |     - Records: user_id, username, client IP, user agent, timestamp, status        |
  |                                                                                   |
  |  4. Role-Based Access Control (RBAC)                                              |
  |     - Strict role segregation: TPO, Coordinator, and HR                           |
  |     - Ephemeral, drive-specific coordinator & HR credentials                      |
  |     - TPO dashboard routes strictly guarded behind authenticated TPO credentials   |
  +-----------------------------------------------------------------------------------+
```

- **Salted Password Hashing**: Passwords stored using PBKDF2-SHA256 with cryptographically generated per-user salt rounds.
- **Session Revocation via `token_version`**: Incremented upon every password change to instantaneously kill any compromised or stale active sessions.
- **SQL Injection Prevention**: All queries across Cloudflare D1 and SQLite utilize parameterized prepared statements.
- **Client IP & User Agent Tracking**: Security audit trail records IP and browser signatures for forensic verification.

---

## 🇮🇳 Timezone & Governance Precision (Asia/Kolkata — IST)

Campus placement operations in India strictly operate on **Indian Standard Time (UTC+5:30)**. I.R.O.N. enforces timezone consistency throughout the stack:
- **Application Deadline Cutoff**: Applications automatically close at `00:00 IST` on the drive date.
- **Batch Freeze Timestamps**: HR batch evaluations display and lock with precise IST audit timestamps (`DD/MM/YYYY, HH:mm:ss IST`).
- **Archive Retention Calculator**: 6-month drive data lifecycle calculated by IST calendar day arithmetic.
- **Export File Naming**: All institutional CSV and Excel exports are stamped with IST timestamps (e.g., `placements_export_YYYY-MM-DD.csv`).

---

## ✨ Key Features

### 1. 🛡️ Multi-Role Portals & RBAC
- **TPO Admin Portal**:
  - Full drive lifecycle management (creation, round setup, status toggling, schedule tracking).
  - Centralized **Student Master Database** (batch CSV/Excel import, academic verification, active backlog monitoring).
  - Auto-generated, drive-specific credentials for Student Coordinators and Corporate HRs.
  - Institutional placement metrics, department-wise breakdowns, and NIRF/NAAC reporting.
  - **Security Dashboard**: Password reset, strength meter, session invalidation, and password change audit logs.
  - **Data Archive & Expiry**: 6-month lifecycle countdown, automated ZIP export, and compliant drive purge.
- **Student Coordinator Portal**:
  - Real-time candidate queue management per recruitment round.
  - Dynamic batch allocation with concurrency conflict prevention (`UNIQUE(round_id, student_id)`).
  - Attendance check-in and seamless batch handoff to corporate interviewers.
- **Corporate HR / Recruiter Portal**:
  - Distraction-free interview evaluation panel for assigned candidate batches.
  - Candidate academic summary (roll number, branch, CGPA, backlogs) and decision scoring (`SELECT` / `HOLD` / `NONE`).
  - Debounced bulk evaluation persistence and irreversible batch freeze.
- **Public & Student Portal**:
  - Live campus drive listings with eligibility criteria and round timelines.
  - Zero-login student application: roll number lookup matches live records against the Student Master DB.
  - Instant eligibility feedback with precise failure rationale (e.g., CGPA below threshold, branch ineligible, active backlogs).

### 2. ⚡ The 24 Strict Placement Governance Rules

| Category | Rule ID | Governance Policy |
|---|---|---|
| **Eligibility & Policy** | Rules 1–6 | Strict enforcement of minimum CGPA, active backlog thresholds, eligible engineering branches, and one application per drive. |
| **Application Cutoff** | Rules 10–11 | Applications strictly lock at `00:00 IST` on the drive date. No late entries permitted. |
| **Concurrency & Batching** | Rules 12, 15, 29 | Database-level unique constraints (`UNIQUE(drive_id, student_id)` and `UNIQUE(round_id, student_id)`) prevent duplicate student allocations across parallel coordinators. |
| **Intermediate Rounds** | Rules 17–18 | `HOLD` decision is non-rejection; candidates carry over into the eligible candidate pool for subsequent evaluation rounds. |
| **Final Round Selection** | Rules 22 & 40 | In the designated Final Round, the `HOLD` option is disabled. Recruiters can only `SELECT`, which immediately creates permanent institutional placement records. |
| **Batch Freezing** | Rule 21 | Submitted HR batches are permanently frozen with an immutable timestamp; further edits are locked. |
| **Data Retention** | Rule 30 | Drives expire 6 months after the drive date. One-click full ZIP export (applications, batch logs, evaluations, summary reports) archives the drive before clean purge, while preserving the Student Master DB intact. |

### 3. 🔄 Real-Time Sync & Bulk Evaluation Engine
- **Monotonic Sync Revision (`sync_revision`)**: Server and edge increment a revision counter on every state modification, ensuring seamless polling and zero-staleness client updates.
- **Debounced Bulk Saves**: HR evaluation decisions are debounced on the client and flushed atomically to `/api/evaluations/bulk` prior to freezing, eliminating race conditions under high network concurrency.
- **Reconciliation Resilience**: Preserves saved evaluation decisions against stale in-flight snapshot responses.

### 4. 📊 Accreditation-Ready Analytics & Exports
- Live KPI dashboard: Placement percentage, highest package, median CTC, department distributions.
- Recruitment funnel visualization: Applications → Round 1 → Technical Rounds → Final Selects.
- Institutional Excel and CSV reports formatted for NAAC, NIRF, and NBA audit compliance.

---

## 🗄️ Database Schema & Data Model

I.R.O.N. is built on SQLite / Cloudflare D1 with relational integrity, foreign key cascading, and strict indexes.

### Core Tables & Relationships

```
  +------------------+       1:N       +------------------+
  |      users       | <-------------- |   drives         |
  +------------------+                 +------------------+
  | id (PK)          |                        | 1:N
  | username         |                        v
  | password_hash    |                 +------------------+
  | role             |                 |     rounds       |
  | token_version    |                 +------------------+
  +------------------+                        | 1:N
           |                                  v
           | 1:N                       +------------------+
           v                           |    batches       |
  +-----------------------+            +------------------+
  | password_change_logs  |                   | 1:N
  +-----------------------+                   v
  | id (PK)               |            +------------------+       N:1       +------------------+
  | user_id (FK)          |            |   evaluations    | --------------> |    students      |
  | username              |            +------------------+                 +------------------+
  | ip_address            |                                                 | roll_number (PK) |
  | user_agent            |                                                 | name, cgpa       |
  | status, created_at    |                                                 | branch, backlogs |
  +-----------------------+                                                 +------------------+
```

### Migration History (`/migrations`)
1. `0001_initial_schema.sql`: Core tables for drives, rounds, applications, batches, evaluations, students, and users.
2. `0002_fix_check_constraints.sql`: SQLite / D1 check constraint alignment for round sequence and evaluation statuses.
3. `0003_sync_revision.sql`: Monotonic sequence table tracking cluster-wide data changes.
4. `0004_tpo_security.sql`: Added `token_version` to `users` for session invalidation and created the `password_change_logs` audit table.

---

## 🛠️ Technology Stack Matrix

| Layer | Technology | Key Purpose & Capability |
|---|---|---|
| **Frontend Framework** | React 19, TypeScript, Vite | High-performance SPA with fast client-side routing |
| **Styling & Icons** | Tailwind CSS v4, Lucide React | High-density enterprise dashboard styling |
| **Edge Compute** | Cloudflare Pages Functions | Serverless edge API routes with sub-10ms global invocation |
| **Edge Database** | Cloudflare D1 (SQLite) | Distributed relational database with ACID guarantees |
| **Local Runtime** | Node.js, Express, `better-sqlite3` | Local development environment mirroring edge APIs |
| **Authentication** | HMAC-SHA256 JWT, PBKDF2, Token Versioning | Stateful session revocation with stateless edge validation |
| **Sync Engine** | Monotonic Revision Engine (`sync_revision`) | Conflict-free real-time coordination across roles |
| **Archival & Export** | JSZip, SheetJS (`xlsx`) | Client-side ZIP compliance archives and NAAC/NIRF Excel workbooks |
| **Timezone Precision** | `Intl.DateTimeFormat` (Asia/Kolkata) | Standardized IST date boundaries and timestamps |

---

## 📁 Repository Structure

```
.
├── functions/                     # Cloudflare Pages Functions (Edge API runtime)
│   └── api/
│       └── [[route]].ts           # Edge router, D1 handlers, auth, sync, and security APIs
├── migrations/                    # Cloudflare D1 SQL migrations
│   ├── 0002_fix_check_constraints.sql
│   ├── 0003_sync_revision.sql
│   └── 0004_tpo_security.sql      # Token versioning & password change audit logs
├── src/
│   ├── components/                # React UI component architecture
│   │   ├── auth/                  # Staff & recruiter login dialogs
│   │   ├── common/                # Shared badges, alerts, modal dialogs, and stat cards
│   │   ├── coordinator/           # CoordinatorView: batch allocation, queue & handoff
│   │   ├── hr/                    # HrEvaluationView: bulk scoring, decisions & freeze
│   │   ├── layout/                # Header, navigation, and user context
│   │   ├── public/                # Public drive board, student eligibility lookup & apply
│   │   ├── reactbits/             # UI interaction elements & indicators
│   │   └── tpo/                   # TPO workspace:
│   │       ├── TpoDashboard.tsx       # Placement KPIs & recruitment funnel
│   │       ├── TpoDrives.tsx           # Drive configuration & round manager
│   │       ├── TpoStudentMaster.tsx    # Academic database & CSV/Excel upload
│   │       ├── TpoPlacedStudents.tsx   # Verified placement offers & exports
│   │       ├── TpoDataExpiry.tsx       # 6-month archival countdown & ZIP exporter
│   │       └── TpoSecurity.tsx         # Password reset, session invalidation & audit logs
│   ├── server/                    # Local Express development server
│   │   ├── crypto.ts              # Salted PBKDF2 hashing & JWT utilities
│   │   ├── db.ts                  # SQLite schema bootstrap & table initialization
│   │   └── routes.ts              # REST API endpoints mirroring Cloudflare Pages
│   ├── services/                  # Business services & client-side engines
│   │   ├── api.ts                 # Typed HTTP client for edge and local APIs
│   │   ├── excelExport.ts         # NAAC/NIRF accreditation-ready spreadsheet generator
│   │   └── storage.ts             # Sync revision engine, state manager & local persistence
│   ├── types/                     # Domain TypeScript interfaces, models, and rule enums
│   ├── utils/                     # IST date formatting, CSV parsers, and password validators
│   ├── App.tsx                    # Main client router and role context provider
│   └── main.tsx                   # React 19 entrypoint
├── d1-seed.sql                    # Initial database seed for Cloudflare D1
├── schema.sql                     # Base relational database schema
├── server.ts                      # Express server entrypoint
├── wrangler.toml                  # Cloudflare Pages & D1 database bindings
└── README.md                      # Project documentation & system specification
```

---

## 🔒 License & Intellectual Property

**Copyright © 2026 Mushke Rohith Reddy. All Rights Reserved.**

### PROPRIETARY AND CONFIDENTIAL

This software, including all source code, documentation, designs, database schemas, interfaces, and intellectual property associated with **I.R.O.N. (Institutional Recruitment & Operations Network)**, is strictly proprietary and the exclusive property of **Mushke Rohith Reddy**.

#### Terms & Usage Restrictions:
1. **No Unauthorized Use**: You may **NOT** copy, modify, distribute, reproduce, sublicense, publish, sell, host, mirror, or commercially exploit this software or any portion of its code without explicit, prior written authorization and licensing from the copyright holder.
2. **No Free or Public Distribution**: This project is **NOT** open-source software and is **NOT** provided under MIT, Apache, GPL, or any other public/copyleft license. No individual or entity is permitted to deploy, fork, or use this application without a verified license agreement.
3. **No Reverse Engineering**: Reverse engineering, decompiling, extracting, or repurposing proprietary business logic, scoring mechanisms, and rule engines from this project is strictly prohibited.

For licensing inquiries, institutional deployments, or commercial partnerships, please contact:
📧 **rohith2005hyd@gmail.com**

---

<div align="center">
  <sub>Designed & Architected by <b>Mushke Rohith Reddy</b></sub>
</div>
