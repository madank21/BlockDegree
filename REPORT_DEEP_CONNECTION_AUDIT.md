# Deep Connection Audit Report — ai-blockchain-degree-verification

## Scope & limitations
- This report documents an end-to-end “are things connected correctly?” audit.
- I used tools to read and inspect a subset of files (not every file in the repo) because `search_files` failed (ripgrep missing). 
- Therefore, sections are marked **CONFIRMED** when logic is traced directly through inspected code, and **NOT FULLY VERIFIED** when the necessary companion files (routes/models/services) were not opened in this session.

## Files inspected (by tool)
### Backend
- `BACKEND/app.js`
- `BACKEND/server.js`
- `BACKEND/routes/degreeRoutes.js`
- `BACKEND/controllers/degreeController.js`
- `BACKEND/middleware/authMiddleware.js`
- `BACKEND/middleware/roleMiddleware.js`
- `BACKEND/src/utils/response.js`
- `BACKEND/models/Degree.js`
- `BACKEND/routes/verificationRoutes.js`
- `BACKEND/controllers/verificationController.js`
- `BACKEND/services/blockchainService.js`
- `BACKEND/controllers/documentController.js`
- `BACKEND/models/Verification.js`
- `BACKEND/database/migrations/001_initial_schema.sql`

### Frontend
- `FRONTEND/src/api/api.ts`
- `FRONTEND/src/App.tsx`
- `FRONTEND/src/pages/DegreeManagement.tsx`
- `FRONTEND/src/pages/MyDegrees.tsx`
- `FRONTEND/src/pages/ApplyDegree.tsx`
- `FRONTEND/src/pages/VerifyDegree.tsx`

---

## 1) High-level architecture connections

### Backend HTTP routing
`BACKEND/app.js` mounts API v1 route groups:
- `/api/v1/auth` → `routes/authRoutes.js`
- `/api/v1/degrees` → `routes/degreeRoutes.js`
- `/api/v1/verification` → `routes/verificationRoutes.js`
- plus additional groups (documents/face/fraud/users/audit/blockchain) that were **not fully audited**.

### Middleware
- `authenticate` (JWT required) sets `req.user`.
- `optionalAuthenticate` allows routes to work without auth but sets `req.user=null` when token invalid/missing.
- `roleMiddleware` provides role guards (e.g., admin/university).

### Response envelope contract
- `BACKEND/src/utils/response.js` returns responses in an envelope style:
  - `{ success: true, message, data?, meta?, timestamp }`
- Frontend `FRONTEND/src/api/api.ts` unwraps `{ success:true, data }` automatically.

✅ This contract is aligned.

---

## 2) End-to-end module audit & “set-to-go” verdict

# 2.1 Degrees module — **PARTIALLY set-to-go**

## Backend: routes → controller → model
**Confirmed** from inspected files:
- `POST /api/v1/degrees` → `degreeController.issueDegree` (admin/university)
- `PATCH /api/v1/degrees/:id` → `degreeController.updateDegree` (admin/university)
- `DELETE /api/v1/degrees/:id/revoke` → `degreeController.revokeDegree` (admin/university; requires `reason.length>=10`)
- `GET /api/v1/degrees/:id/qr` → `degreeController.getDegreeQR`
- `GET /api/v1/degrees/public/:certNumber` → `degreeController.getPublicCertificate`

## Frontend: confirmed broken endpoint
**Confirmed** in `FRONTEND/src/pages/DegreeManagement.tsx`:
- “Issue Attestation” calls:
  - `POST /api/v1/degrees/${id}/issue`
- But backend exposes **no** such route.

Backend only supports issuance via:
- `POST /api/v1/degrees` (no `/:id/issue`)

❌ Verdict: the “Issue Attestation” UI action is miswired.

## Frontend: ApplyDegree flow looks consistent
**Confirmed** from inspected `FRONTEND/src/pages/ApplyDegree.tsx` and `FRONTEND/src/api/api.ts`:
- It calls `degreesApi.issue()` → `POST /api/v1/degrees`

✅ Verdict: degree issuance via ApplyDegree likely works.

---

# 2.2 Verification module — **NOT set-to-go**

## Backend internal logic bug (confirmed)
**Confirmed** in `BACKEND/controllers/verificationController.js`:
- `verifyDegreePublic` does:
  - `const degree = await Degree.findByHash(hash);`
- But `BACKEND/models/Degree.js` defines `findByHash()` returning only:
  - `{ id, degreeHash, status }`

Then `verifyDegreePublic` dereferences fields that are not present on that object, including:
- `degree.is_revoked`
- `degree.degree_title`
- `degree.field_of_study`
- `degree.student_name`
- `degree.degree_hash` etc.

❌ This endpoint will fail or produce incorrect results.

## Response contract mismatch with frontend (confirmed)
**Confirmed** in `FRONTEND/src/pages/VerifyDegree.tsx`:
- Frontend expects `verificationApi.verifyPublic(hash)` to return a structure like:
  - `valid`
  - `degreeDetails: { degreeId, studentName, registrationNumber, degreeTitle, department, cgpa, graduationYear, ... }`
  - `blockchain: { txHash, ... }`

However backend `verifyDegreePublic` currently returns a different nesting + uses different naming (e.g., snake_case field names and different “degree” shape).

❌ Even after fixing the internal Degree field issue, UI may still not render correctly unless response shape is aligned.

---

# 2.3 Blockchain persistence / syncing — **NOT set-to-go**

## DB schema mismatch (confirmed)
**Confirmed** from `BACKEND/database/migrations/001_initial_schema.sql`:
- `blockchain_transactions` schema includes columns such as:
  - `tx_hash`, `degree_id`, `operation`, `status`, `block_number`, `gas_used`, `confirmed_at`, etc.

**Confirmed** from `BACKEND/services/blockchainService.js`:
- `savePendingTransaction()` inserts fields:
  - `from_address`
  - `contract_address`
  - `function_name`

Those columns do **not** exist in the provided schema.

❌ Likely outcomes:
- insert failures
- missing transaction tracking
- broken state transitions for confirmations

---

# 2.4 Documents module — **LIKELY set-to-go but NOT FULLY VERIFIED**

**Confirmed** from `BACKEND/controllers/documentController.js`:
- Upload pipeline creates a Document record, then async OCR + fraud analysis updates.
- Access control checks exist.

But in this session I did **not** open:
- `BACKEND/models/Document.js`
- `BACKEND/routes/documentRoutes.js`
- OCR/fraud service implementations

So I cannot fully certify correctness of schema alignment and endpoint wiring for documents.

---

## 3) Concrete required fixes (highest priority)

### Fix A — Correct DegreeManagement “Issue Attestation” endpoint
- **File:** `FRONTEND/src/pages/DegreeManagement.tsx`
- **Problem:** calls nonexistent backend endpoint `POST /api/v1/degrees/:id/issue`.
- **Action options:**
  1) Change UI to call `POST /api/v1/degrees` with the correct payload (but requires degree creation fields).
  2) Better: implement backend route `POST /api/v1/degrees/:id/issue` that issues using existing degree record.

### Fix B — Fix `verifyDegreePublic` internal field mismatch
- **File:** `BACKEND/controllers/verificationController.js`
- **Problem:** uses `Degree.findByHash(hash)` which returns partial DTO.
- **Action:**
  - Change Degree model to provide full degree data for public verification.
  - Or adjust `verifyDegreePublic` to call `Degree.findById()` based on degree hash mapping.

### Fix C — Align verification response shape with frontend
- **Files (choose one approach):**
  - `BACKEND/controllers/verificationController.js` (preferred: match UI expectations)
  - or `FRONTEND/src/pages/VerifyDegree.tsx` (adapt UI to backend output)

### Fix D — Align blockchain transaction persistence to schema
- **File:** `BACKEND/services/blockchainService.js`
- **Problem:** inserts columns not present in `blockchain_transactions` schema.
- **Action:** update insert payload to contain only columns defined in migration.

---

## 4) Final verdict overview
- **Degrees:** PARTIALLY set-to-go (backend ok; frontend issue action miswired)
- **Verification:** NOT set-to-go (internal degree DTO bug + response contract mismatch)
- **Blockchain persistence:** NOT set-to-go (DB column mismatch)
- **Documents:** likely ok but not fully proven in this pass

---

## 5) Next full-audit step (to satisfy “every file” requirement)
Because repo-wide searching was unavailable (ripgrep missing), the next step to truly “check every file” is:
- open and inspect remaining route/controller/model/service files:
  - `routes/documentRoutes.js` + `models/Document.js`
  - `routes/faceRoutes.js`, `faceController.js`, `faceVerificationService.js`
  - `routes/fraudRoutes.js`, `fraudController.js`, `fraudDetectionService.js`
  - `routes/blockchainRoutes.js`, `controllers/blockchainController.js`
  - `routes/auditRoutes.js`, `controllers/auditController.js`
  - `routes/userRoutes.js`, `controllers/userController.js`
  - Frontend pages not yet inspected in detail: Admin/Employer dashboards, etc.

Those remaining inspections will allow a 100% “file-by-file” connectivity proof.

