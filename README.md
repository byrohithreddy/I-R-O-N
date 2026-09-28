# I.R.O.N. — Institutional Recruitment & Operations Network

<div align="center">

![I.R.O.N. Banner](https://img.shields.io/badge/I.R.O.N.-Enterprise%20Campus%20Recruitment-09090b?style=for-the-badge&logo=shield)

**Next-Generation Campus Placement Management & Edge-Accelerated Recruiter Workflow Engine**

[![Production Status](https://img.shields.io/badge/Production-Live%20on%20Cloudflare%20Pages-f38020?style=flat-square&logo=cloudflare)](https://iron-recruitment.pages.dev)
[![React](https://img.shields.io/badge/React-19.0-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Cloudflare D1](https://img.shields.io/badge/Database-Cloudflare%20D1%20SQLite-faad3f?style=flat-square&logo=cloudflare)](https://developers.cloudflare.com/d1/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary%20%2F%20All%20Rights%20Reserved-crimson?style=flat-square)](LICENSE)

[Live Demo](https://iron-recruitment.pages.dev) • [Architecture](#system-architecture) • [Features](#key-features) • [Installation](#getting-started) • [License](#license--intellectual-property)

</div>

---

## 📌 Overview

**I.R.O.N. (Institutional Recruitment & Operations Network)** is an enterprise-grade placement management platform engineered for universities, training and placement cells (TPO), student coordinators, and corporate recruiters. 

Built on a serverless Edge architecture with Cloudflare Pages and D1 SQLite, I.R.O.N. eliminates campus placement bottlenecks by replacing messy spreadsheets with automated student eligibility filtering, synchronized multi-round evaluations, instant queue progression, and strict placement governance rules.

---

## 🏛️ System Architecture

```
                                  +---------------------------------------+
                                  |         I.R.O.N. Web Client           |
                                  |    (React 19 + TypeScript + Vite)     |
                                  +---------------------------------------+
                                                     |
                                  +------------------+--------------------+
                                  |                                       |
                     [ Cloudflare Pages Functions ]               [ Node.js / Express ]
                     (Serverless Edge Worker Engine)             (Local Development DB)
                                  |                                       |
                     [ Cloudflare D1 SQLite DB ]                 [ SQLite / Drizzle ]
                     (Global Multi-Region Replicas)              (Local Database)
```

### Recruiter & Candidate Workflow Pipeline

```
  [ Student Pool ]
         │
         ▼
  [ Drive Creation & Criteria Matching ] ── (Min CGPA, Max Backlogs, Eligible Branches)
         │
         ▼
  [ Coordinator Batch Allocation ] ────── (Assigns batch capacity, verify attendance)
         │
         ▼
  [ HR Evaluation & Scoring ] ─────────── (SELECT / HOLD / REJECT with real-time lock)
         │
         ▼
  [ Batch Submission & Freeze ] ───────── (Authoritative Edge calculation)
         │
         ▼
  [ Next Round / Final Offer Rollout ] ── (Automatic placement record & offer letter)
```

---

## ✨ Key Features

### 1. 🛡️ Role-Based Access Control (RBAC)
- **TPO Admin**: Master control panel for drive provisioning, global student records, coordinator assignments, live audit logs, and college-wide recruitment analytics.
- **Student Coordinator**: Drive-specific access for organizing evaluation batches, verifying physical/online student presence, and managing round progression.
- **Company HR / Recruiter**: Fast, distraction-free scoring portal for reviewing assigned candidate batches, making real-time evaluation decisions, and finalizing placement offers.

### 2. ⚡ The 24 Strict Placement Governance Rules
- **Rule 1–6 (Eligibility & Policy)**: Hard enforcement of minimum CGPA thresholds, active backlog limits, eligible branch filters, and duplicate registration prevention.
- **Rule 7–12 (Attendance & Batching)**: Dynamic batch allocation, coordinator check-in verification, and zero-drop candidate tracking.
- **Rule 13–18 (Evaluation & Freezing)**: Real-time decisioning (`SELECT`, `HOLD`, `REJECT`), batch submission freeze protection, and HR evaluation editing controls.
- **Rule 19–24 (Final Round & Offer Letters)**: Direct offer creation upon final round approval, automated placement registry reconciliation, and instant PDF/print offer letters.

### 3. 📊 Live Visual Analytics & Reporting
- Real-time placement progress metrics (Total Offers, Highest CTC, Average Package, Gender & Branch Distribution).
- Comprehensive audit trails tracking timestamped evaluation logs and user actions.
- One-click CSV and Excel export for academic records and accreditation reporting.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19, TypeScript |
| **Build Tool & Bundler** | Vite, Rollup |
| **Styling & Design System** | Tailwind CSS v4, Lucide Icons |
| **Edge Compute & API** | Cloudflare Pages Functions (Workers Runtime) |
| **Production Database** | Cloudflare D1 Serverless SQLite |
| **Local Development DB** | Express, Node.js, `better-sqlite3` |
| **Data Visualization** | Recharts |
| **Security & Auth** | JSON Web Tokens (JWT), Argon2 / PBKDF2 Hashing |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (for edge deployment)

### 1. Clone the Repository
```bash
git clone https://github.com/byrohithreddy/I-R-O-N.git
cd I-R-O-N
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the example environment file and adjust variables if needed:
```bash
cp .env.example .env
```

### 4. Run Local Development Server
```bash
npm run dev
```
The development application will be available at `http://localhost:3000`.

### 5. Build for Production
```bash
npm run build
```

### 6. Deploy to Cloudflare Pages & D1
```bash
# Seed Cloudflare D1 database (first time)
npx wrangler d1 execute iron-db --remote --file=./schema.sql
npx wrangler d1 execute iron-db --remote --file=./d1-seed.sql

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=iron-recruitment
```

---

## 📁 Repository Structure

```
.
├── functions/               # Cloudflare Pages Functions (Edge API routes)
│   └── api/
│       └── [[route]].ts     # Serverless router & D1 database handlers
├── src/
│   ├── components/          # React UI components
│   │   ├── admin/           # TPO Admin dashboards & governance
│   │   ├── auth/            # Staff & recruiter login modals
│   │   ├── coordinator/     # Coordinator batch & attendance views
│   │   ├── hr/              # Recruiter evaluation & interview views
│   │   └── common/          # Reusable UI widgets & modal dialogs
│   ├── services/            # API client & local offline storage engine
│   ├── server/              # Express + SQLite backend for local development
│   ├── types/               # TypeScript domain interfaces & placement models
│   ├── App.tsx              # Root application router
│   └── main.tsx             # Application entry point
├── d1-seed.sql              # Cloudflare D1 initial schema seed
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
2. **No Free or Public Distribution**: This project is **NOT** open-source software and is **NOT** provided under MIT, Apache, GPL, or any other public/copyleft license. No individual or entity is permitted to deploy, fork, or use this application for free without a verified license agreement.
3. **No Reverse Engineering**: Reverse engineering, decompiling, extracting, or repurposing proprietary business logic, scoring mechanisms, and rule engines from this project is strictly prohibited.

For licensing inquiries, commercial partnerships, or custom institutional deployments, please contact:
📧 **rohith2005hyd@gmail.com**

---

<div align="center">
  <sub>Developed & Architected by <b>Mushke Rohith Reddy</b></sub>
</div>
