# BlockDegree: AI-Enhanced Blockchain Degree Attestation

Welcome to **BlockDegree**, a futuristic degree verification and fraud detection dashboard built with React, Vite, and Tailwind CSS. This project simulates a secure university credential system where degrees are hashed, recorded as blockchain transactions, and verified through an immutable audit trail.

---

## 🚀 Project Overview

BlockDegree is a role-based web app with support for:

- **Universities** issuing academic credentials and recording them with simulated blockchain metadata
- **Employers** verifying degree authenticity via SHA-256 degree hashes
- **Students** viewing issued degree records and status
- **Administrators** monitoring users, transaction logs, fraud reports, analytics, and system health
- **AI-ready fraud detection** with OCR and document validation concepts

This project is designed as a polished front-end prototype for a blockchain-enabled degree attestation solution.

---

## 🔧 Core Features

- Role-based dashboard navigation (admin, university, student, employer)
- Degree issuance flow with deterministic hashing and simulated transaction hashes
- Degree verification flow for employers using degree hashes
- Revocation support for invalid degrees
- Audit log tracking for issuance, verification, fraud detection, and revocation
- Seeded demo data for users, degrees, verifications, fraud cases, and transactions
- Clean UI powered by Tailwind CSS, lucide-react icons, and a responsive sidebar layout

---

## 🧠 Key Pages

- `LoginPage`: email-based login with demo quick-login accounts
- `AdminDashboard`: high-level control panel for monitoring platform activity
- `UniversityDashboard`: issue degrees and manage university workflows
- `StudentDashboard`: view personal degree records and status
- `EmployerDashboard`: perform degree verification and fraud checks
- `IssueDegree`: submit degree data, generate a secure hash, and record a blockchain-style transaction
- `VerifyDegree`: verify hashes against recorded credentials and review verification result
- `OCRVerification`, `FraudDetection`, `BlockchainPage`, `AuditLogs`, `UsersPage`, `AnalyticsPage`: simulate advanced credential intelligence and governance capabilities

---

## 🧩 Tech Stack

- **React 19**
- **Vite 7**
- **TypeScript 5**
- **Tailwind CSS 4**
- **lucide-react** icons
- **clsx** and **tailwind-merge** for conditional styling
- **vite-plugin-singlefile** for optional single-file bundling

---

## ⚙️ Quick Start

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

---

## 👥 Demo Accounts

Use these emails to sign in. Password is not validated in the prototype.

- `admin@blockdegree.io` — Administrator
- `registrar@abcuni.edu` — University (ABC University)
- `registrar@xyzuni.edu` — University (XYZ University)
- `ali.ahmed@student.edu` — Student
- `sara.khan@student.edu` — Student
- `hr@techcorp.com` — Employer
- `hr@futuresoft.com` — Employer

---

## 🧪 Notes

- The blockchain layer is simulated in the front-end state using generated transaction hashes.
- Degree hash generation is implemented with a deterministic SHA-like function in `src/store.ts`.
- Authentication and data persistence are mock implementations for prototype/demo purposes.

---

## 📂 Important Files

- `src/App.tsx` — app routing and role-based page rendering
- `src/context/AppContext.tsx` — global state and core business logic
- `src/store.ts` — seeded data, hash and transaction generators
- `src/types.ts` — domain models and interfaces
- `src/components/Layout.tsx` — navigation shell and page layout
- `src/components/pages/IssueDegree.tsx` — degree issuance flow
- `src/components/pages/VerifyDegree.tsx` — degree verification flow

---

## 🌌 Vision

BlockDegree is a prototype for the next-gen credential ecosystem: secure, transparent, and AI-aware. It blends blockchain-style attestation with an immersive web interface to show how universities, employers, and students can trust academic records in a decentralized future.

---

## 📬 Feedback

Issues, improvements, or integration ideas are welcome. This repo is a strong starting point for building a full blockchain credential platform.

