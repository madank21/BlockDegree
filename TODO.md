# TODO — BlockDegree project audit + fix plan

## Step 1 — Confirm endpoint/controller export mismatches
- [ ] Fix `BACKEND/routes/degreeRoutes.js` imports to match `BACKEND/controllers/degreeController.js` exports.
- [ ] Fix `BACKEND/routes/faceRoutes.js` imports to match `BACKEND/controllers/faceController.js` exports (or implement missing controller handlers).

## Step 2 — Fix blockchain service runtime blockers
- [ ] Fix `BACKEND/services/blockchainService.js` incorrect Supabase import (`supabaseAdmin` → `getSupabaseAdmin()` usage).
- [ ] Align blockchain env var names (`BLOCKCHAIN_RPC_URL` vs `SEPOLIA_RPC_URL`).

## Step 3 — Fix DB/model/service mismatches (document + verification)
- [ ] Verify `BACKEND/models/Document.js` contains all methods used by `BACKEND/controllers/documentController.js`.
- [ ] Align `BACKEND/controllers/verificationController.js` field names with what `BACKEND/models/Degree.js` returns.
- [ ] Align `BACKEND/services/fraudDetectionService.js` table/column usage with the actual Document storage schema.

## Step 4 — Fix auth controller exports vs auth routes
- [ ] Verify `BACKEND/controllers/authController.js` exports match what `BACKEND/routes/authRoutes.js` imports.

## Step 5 — Contract/ABI linkage validation
- [ ] Read `BLOCKCHAIN/contracts/DegreeRegistry.sol` and confirm `BACKEND/blockchain/contractABI.json` matches the ethers call signatures.

## Step 6 — Run tests / minimal smoke checks
- [ ] Run backend start command and ensure app boots without require/import errors.
- [ ] Run `npm test` in BACKEND (if configured).
- [ ] Execute contract tests in BACKEND/test.

