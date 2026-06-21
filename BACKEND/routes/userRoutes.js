const express = require('express');
const router = express.Router();
const User = require('../models/User'); // adjust path as needed

// GET /users - list users with optional filters
router.get('/', async (req, res) => {
  try {
    const { role, page = 1, limit = 10, search, isActive } = req.query;

    // If role is provided, ensure it's a single string (not array)
    const roleFilter = typeof role === 'string' ? role : undefined;

    const result = await User.findMany({
      role: roleFilter,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search: search || undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

module.exports = router;