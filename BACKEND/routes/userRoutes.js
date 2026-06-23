// BACKEND/routes/userRoutes.js
//
// FIXES applied:
//   FIX-1 (CRITICAL): imported { requireRole } from roleMiddleware.js, which
//          does not exist on that module (it exports authorize,
//          authorizeOwnerOrAdmin, authorizeUniversityOrAdmin, authorizeAdmin).
//          requireRole(['admin']) was called at route-definition time —
//          i.e. the moment this file is require()'d — so it threw
//          "requireRole is not a function" and crashed the ENTIRE server on
//          startup, not just this one route. Switched to authorizeAdmin.
//   FIX-2: Routes now delegate to userController.js (getUserById/updateUser/
//          deleteUser/approveUser/rejectUser) instead of duplicating the same
//          logic inline here, now that the controller actually has them.
//   FIX-3: Added PATCH /:id/reject to match userController.rejectUser.

const express = require('express');
const router = express.Router();

const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  approveUser,
  rejectUser,
} = require('../controllers/userController');

const { authenticate } = require('../middleware/authMiddleware');
const { authorizeAdmin } = require('../middleware/roleMiddleware'); // FIX-1: was `requireRole`, doesn't exist

// ─── All routes below require a valid, authenticated session ─────────────────
router.use(authenticate);

// ── GET /api/v1/users/:id ──────────────────────────────────────────────────────
// Any authenticated user may view their OWN record; admins may view anyone's
// (enforced inside the controller).
router.get('/:id', getUserById);

// ── PATCH /api/v1/users/:id ─────────────────────────────────────────────────────
router.patch('/:id', updateUser);

// ─── Everything below is admin-only ───────────────────────────────────────────

// ── GET /api/v1/users ──────────────────────────────────────────────────────────
router.get('/', authorizeAdmin, getUsers);

// ── DELETE /api/v1/users/:id ────────────────────────────────────────────────────
// Soft-delete (deactivate) by default; ?hard=true for a permanent delete.
router.delete('/:id', authorizeAdmin, deleteUser);

// ── POST /api/v1/users/:id/approve | /reject ────────────────────────────────────
// POST (not PATCH) to match FRONTEND/src/api/api.ts's usersApi.approve(),
// which calls `post('/users/:id/approve')`.
router.post('/:id/approve', authorizeAdmin, approveUser);
router.post('/:id/reject', authorizeAdmin, rejectUser);

module.exports = router;