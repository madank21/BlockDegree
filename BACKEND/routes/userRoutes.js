// BACKEND/routes/userRoutes.js
//
// WHAT WAS BROKEN:
//   1. NO authentication middleware — GET /users was completely public. Any
//      anonymous caller could enumerate every user in the system with emails,
//      roles, face descriptors, and institution data.
//
//   2. NO userController import — the file imported the raw User model and
//      contained an inline handler instead of delegating to userController.
//
//   3. ONLY GET / existed — five routes consumed by the frontend and the
//      api.ts usersApi were completely missing:
//        GET    /users/:id          → userController.getUserById
//        PATCH  /users/:id          → userController.updateUser
//        DELETE /users/:id          → userController.deleteUser
//        PATCH  /users/:id/approve  → userController.approveUser
//        PATCH  /users/:id/reject   → userController.rejectUser
//
//   4. Inline handler used raw res.json() instead of the standardized
//      sendPaginated response helper — inconsistent with every other route.
//
//   5. No error handling — any User.findMany() failure crashed the process
//      instead of returning a proper 500 response.
//
// VERIFIED DEPENDENCIES:
//   ../middleware/authMiddleware  → authenticate         (exports confirmed)
//   ../middleware/roleMiddleware  → authorize            (exports confirmed)
//   ../controllers/userController → getUsers / getUserById / updateUser /
//                                   deleteUser / approveUser / rejectUser
//                                   (all now exported in fixed userController.js)

'use strict';

const express        = require('express');
const router         = express.Router();
const { authenticate }  = require('../middleware/authMiddleware');
const { authorize }     = require('../middleware/roleMiddleware');
const userController    = require('../controllers/userController');

// ─── FIX 1: ALL user routes require authentication ────────────────────────────
// This entire router was previously unauthenticated — user list was public.
router.use(authenticate);

// ─── GET /api/v1/users ───────────────────────────────────────────────────────
// List all users with optional filters.
// FIX 2 & 4: replaced inline handler with userController.getUsers which uses
//            sendPaginated with the correct signature.
// Query params: role, page, limit, search, isActive
router.get(
  '/',
  authorize('admin'),
  userController.getUsers
);

// ─── GET /api/v1/users/:id ───────────────────────────────────────────────────
// FIX 3a: route was completely missing.
// Get a single user by their UUID. Admin only.
router.get(
  '/:id',
  authorize('admin'),
  userController.getUserById
);

// ─── PATCH /api/v1/users/:id ─────────────────────────────────────────────────
// FIX 3b: route was completely missing.
// Update whitelisted fields on a user (role, isActive, name, etc.). Admin only.
// Note: users update their OWN profile via PATCH /auth/me (authController).
router.patch(
  '/:id',
  authorize('admin'),
  userController.updateUser
);

// ─── DELETE /api/v1/users/:id ────────────────────────────────────────────────
// FIX 3c: route was completely missing.
// Soft-deletes (deactivates) a user. Hard-delete only in dev via ?hard=true.
// Admin only.
router.delete(
  '/:id',
  authorize('admin'),
  userController.deleteUser
);

// ─── PATCH /api/v1/users/:id/approve ─────────────────────────────────────────
// FIX 3d: route was completely missing.
// Approve a pending student or university account. Sets is_active = true.
// Admin only.
router.patch(
  '/:id/approve',
  authorize('admin'),
  userController.approveUser
);

// ─── PATCH /api/v1/users/:id/reject ──────────────────────────────────────────
// FIX 3e: route was completely missing.
// Reject a pending account. Sets is_active = false.
// Admin only.
router.patch(
  '/:id/reject',
  authorize('admin'),
  userController.rejectUser
);

module.exports = router;