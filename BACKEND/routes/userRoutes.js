const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeAdmin } = require('../middleware/roleMiddleware');
const {
  getUsers,
  approveUser,
  rejectUser,
} = require('../controllers/userController');
const { paginationValidators, uuidParamValidator } = require('../src/utils/validators');

// All user routes require admin privileges
router.use(authenticate, authorizeAdmin);

// GET /api/v1/users – list users with pagination and filters
router.get('/', paginationValidators, getUsers);

// PATCH /api/v1/users/:id/approve
router.patch('/:id/approve', ...uuidParamValidator(), approveUser);

// PATCH /api/v1/users/:id/reject
router.patch('/:id/reject', ...uuidParamValidator(), rejectUser);

module.exports = router;