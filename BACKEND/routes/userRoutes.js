// BACKEND/routes/userRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// User Routes
// SECURITY FIX: All routes now protected with authenticate middleware.
// Added GET /users/:id, PATCH /users/:id, DELETE /users/:id.
// Added POST /users/:id/approve (admin-only user activation).
// ─────────────────────────────────────────────────────────────────────────────

const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const { authenticate }    = require('../middleware/authMiddleware');
const { requireRole }     = require('../middleware/roleMiddleware');

// ── GET /api/v1/users ─────────────────────────────────────────────────────────
// Admin: list all users. Non-admin: could return only their own record.
router.get(
  '/',
  authenticate,             // ← SECURITY FIX: was missing, exposed user list publicly
  requireRole(['admin']),   // only admins may list all users
  async (req, res) => {
    try {
      const { role, page = 1, limit = 10, search, isActive } = req.query;

      const result = await User.findMany({
        role:     typeof role === 'string' ? role : undefined,
        page:     parseInt(page,  10),
        limit:    parseInt(limit, 10),
        search:   search || undefined,
        isActive:
          isActive === 'true'  ? true  :
          isActive === 'false' ? false : undefined,
      });

      res.json({
        success: true,
        data: {
          users: result.data,
          total: result.total,
          page:  parseInt(page, 10),
          limit: parseInt(limit, 10),
        },
      });
    } catch (err) {
      console.error('[Users] list error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ── GET /api/v1/users/:id ─────────────────────────────────────────────────────
router.get(
  '/:id',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Non-admins may only read their own record
      if (req.user.role !== 'admin' && req.user.id !== id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Strip password hash before sending
      const { passwordHash, ...safeUser } = user;
      res.json({ success: true, data: { user: safeUser } });
    } catch (err) {
      console.error('[Users] getById error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ── PATCH /api/v1/users/:id ───────────────────────────────────────────────────
router.patch(
  '/:id',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Non-admins may only update their own record
      if (req.user.role !== 'admin' && req.user.id !== id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      // Prevent non-admins from elevating their own role
      if (req.body.role && req.user.role !== 'admin') {
        delete req.body.role;
      }

      // Prevent updating password through this route — use /auth/change-password
      delete req.body.password;
      delete req.body.passwordHash;
      delete req.body.password_hash;

      const updated = await User.update(id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const { passwordHash, ...safeUser } = updated;
      res.json({ success: true, data: { user: safeUser } });
    } catch (err) {
      console.error('[Users] update error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ── DELETE /api/v1/users/:id ──────────────────────────────────────────────────
router.delete(
  '/:id',
  authenticate,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { hard = 'false' } = req.query;

      const result = await User.delete(id, hard === 'true');
      if (!result) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      res.json({ success: true, data: { message: 'User deleted successfully' } });
    } catch (err) {
      console.error('[Users] delete error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ── POST /api/v1/users/:id/approve ───────────────────────────────────────────
// Admin action: activate a pending user account
router.post(
  '/:id/approve',
  authenticate,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const updated = await User.update(id, { isActive: true });
      const { passwordHash, ...safeUser } = updated;

      res.json({
        success: true,
        data: { message: 'User approved and activated', user: safeUser },
      });
    } catch (err) {
      console.error('[Users] approve error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;