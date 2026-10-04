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

[Live Production](https://iron-recruitment.pages.dev) • [Architecture](#-system-architecture) • [Features](#-key-features) • [Placement Governance Rules](#-the-24-strict-placement-governance-rules) • [Installation](#-getting-started) • [License](#-license--intellectual-property)

</div>

---

## 📌 Overview

**I.R.O.N. (Institutional Recruitment & Operations Network) v2.0** is an enterprise-grade campus placement operations platform built for Training & Placement Officers (TPO), Student Coordinators, Corporate Recruiters (HR), and Students.

Engineered on a globally distributed serverless Edge architecture with **Cloudflare Pages** and **Cloudflare D1 SQLite**, I.R.O.N. v2.0 eliminates manual spreadsheets and recruitment bottlenecks. The system guarantees 100% database-authoritative drives, real-time eligibility evaluation, atomic candidate batching, multi-round interview progression, instant offer rollout, and strict 6-month compliance archival.

---

## 🏛️ System Architecture

```
                                  +---------------------------------------+
                                  |         I.R.O.N. Web Client           |
                                  |    (React 19 + TypeScript + Vite)     |
                                  +---------------------------------------+
                                                      |
                                  +-------------------+-------------------+
                                  |                                       |
                   [ Cloudflare Pages Functions ]               [ Node.js / Express ]
                   (Edge API & Real-Time Sync)                 (Local Development DB)
                                  |                                       |
                   [ Cloudflare D1 SQLite DB ]                 [ SQLite / Drizzle ]
                   (Global Edge-Replicated DB)                 (Local Instance)
```

### Recruiter & Candidate Workflow Pipeline

```
  [ Student Master DB ] ────── (Authoritative college academic & backlog records)
         │
         ▼
  [ TPO Provisions Drive ] ─── (Eligibility rules, schedules, auto-generated recruiter credentials)
         │
         ▼
  [ Public / Visitor Apply ] ─ (Roll number lookup, real-time eligibility verification before 00:00)
         │
         ▼
  [ Coordinator Batching ] ─── (Dynamic batch allocation, UNIQUE(round_id, student_id) enforcement)
         │
         ▼
  [ HR Recruiter Scoring ] ─── (SELECT / HOLD in intermediate rounds; real-time batch locking)
         │
         ▼
  [ Final HR Round (Rule 22) ] (HOLD disabled; SELECT automatically records verified placement)
         │
         ▼
  [ 6-Month Lifecycle ] ────── (Automated ZIP archival, compliance retention, student data safety)
```

---

## ✨ Key Features (v2.0)

### 1. 🛡️ Multi-Role Portals & Role-Based Access Control (RBAC)
- **TPO Admin Portal**: 
  - Complete control over recruitment drives (creation, custom round configuration, schedule tracking).
  - Centralized **Student Master Database** (CSV/Excel import, academic metrics, active backlog monitoring).
  - Real-time recruiter credential generation for Coordinators and HR partners.
  - Institutional placement metrics, audit logs, and 6-month drive data expiry manager.
- **Student Coordinator Portal**: 
  - Real-time candidate queue management for active recruitment rounds.
  - Flexible batch allocation (Limited Capacity / Open batches) with duplicate prevention.
  - Candidate attendance verification and batch submission handoff to HR interviewers.
- **Corporate HR / Recruiter Portal**: 
  - Focused interview scoring interface for assigned candidate batches.
  - Immediate evaluation decisions (`SELECT` / `HOLD` / `NONE`) with feedback notes.
  - One-click batch submission and irreversible evaluation freeze.
- **Public & Visitor Portal**: 
  - Transparent campus drive board displaying active, upcoming, and completed drives.
  - Zero-login student application: roll number lookup auto-checks official CGPA, branch, and backlogs.
  - Real-time eligibility feedback and instant application receipt.

### 2. ⚡ The 24 Strict Placement Governance Rules
- **Eligibility & Policy (Rules 1–6)**: Strict enforcement of minimum CGPA, active backlog thresholds, eligible engineering branches, and single-application constraints per drive.
- **Application Cutoff (Rules 10–11)**: Applications strictly lock at `00:00` on the drive date.
- **Concurrency & Batch Uniqueness (Rules 12, 15 & 29)**: Hard database constraints (`UNIQUE(drive_id, student_id)` and `UNIQUE(round_id, student_id)`) prevent duplicate allocations across parallel coordinators.
- **Intermediate Round HOLD Logic (Rules 17–18)**: Candidates placed on `HOLD` are not rejected; they carry forward into the candidate pool for the next evaluation round.
- **Final Round Enforcement (Rules 22 & 40)**: In the designated Final Round, the `HOLD` option is completely disabled. Recruiters can only `SELECT`, which immediately creates permanent institutional placement records.
- **Batch Freezing & Audit Trail (Rule 21)**: Submitted HR batches are permanently frozen and immutable.
- **Data Lifecycle & Archival (Rule 30)**: Drives expire 6 months after execution date. One-click full ZIP export (applications, batch logs, evaluations, summary reports) archives the drive before clean purge, while preserving the Student Master DB intact.

### 3. 📊 Advanced Analytics & Institutional Reporting
- Live placement statistics: Placement percentage, highest package, median CTC, department distributions.
- Real-time company recruitment funnels (Applications → Round 1 → Technical → Final Selects).
- One-click institutional export to CSV and Excel for NAAC/NIRF accreditation.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite | High-performance SPA with sub-second page transitions |
| **Styling** | Tailwind CSS v4, Lucide Icons | Clean, high-density editorial interface |
| **Edge Compute** | Cloudflare Pages Functions | Low-latency serverless Worker API runtime |
| **Edge Database** | Cloudflare D1 SQLite | Authoritative globally distributed relational database |
| **Local Runtime** | Express, Node.js, `better-sqlite3` | Full-fidelity local development environment |
| **Archival & Export** | JSZip, SheetJS (xlsx) | Client-side ZIP archive builder and Excel spreadsheet generator |
| **Security & Auth** | Web Crypto HMAC-SHA256 JWT, PBKDF2 / Salted Hashes | Edge-native stateless JWT verification |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/)
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (for Cloudflare D1 & Pages deployment)

### 1. Clone the Repository
```bash
git clone https://github.com/byrohithreddy/I-R-O-N.git
cd I-R-O-N
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env
```

### 4. Run Development Server
```bash
npm run dev
```
The application will start on `http://localhost:3000`.

### 5. Production Build & Cloudflare Deployment
```bash
# Build production bundle
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=iron-recruitment
```

---

## 📁 Repository Structure

```
.
├── functions/               # Cloudflare Pages Functions (Edge API routes)
│   └── api/
│       └── [[route]].ts     # Unified edge router & Cloudflare D1 handlers
├── src/
│   ├── components/          # React components
│   │   ├── auth/            # Staff & recruiter authentication modals
│   │   ├── common/          # Reusable UI widgets, badges, confirmation dialogs
│   │   ├── coordinator/     # Student coordinator batching & queue management
│   │   ├── hr/              # HR evaluator interview portals & decision scoring
│   │   ├── layout/          # Global header, navigation, and user context
│   │   ├── public/          # Public drive listings, apply modal, about page
│   │   └── tpo/             # TPO admin dashboard, student master DB, analytics
│   ├── server/              # Express + SQLite backend for local full-stack dev
│   │   ├── crypto.ts        # Password hashing & PBKDF2 utilities
│   │   ├── db.ts            # Database schema initialization & migrations
│   │   └── routes.ts        # REST API endpoints & sync router
│   ├── services/            # API clients, local storage sync, and Excel export
│   │   ├── api.ts           # REST API client
│   │   ├── excelExport.ts   # Accreditation-ready Excel report generator
│   │   └── storage.ts       # Real-time synchronization & offline fallback engine
│   ├── types/               # Domain interfaces, models, and rule definitions
│   ├── utils/               # Date calculators, CSV parsers, IST deadline helpers
│   ├── App.tsx              # Main application router
│   └── main.tsx             # React entrypoint
├── d1-seed.sql              # Initial Cloudflare D1 database schema
├── schema.sql               # SQLite schema definition
├── wrangler.toml            # Cloudflare Pages & D1 binding configuration
└── README.md                # Project documentation
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
