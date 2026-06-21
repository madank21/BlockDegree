const { body, param, query, validationResult } = require('express-validator');

// ─── Validation Result Handler ────────────────────────────────────────────────
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

// ─── Auth Validators ──────────────────────────────────────────────────────────
const registerValidators = [
  body('email')
    .isEmail().normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  // ✅ Changed: accept single 'name' instead of first_name + last_name
  body('name')
    .trim().notEmpty().isLength({ min: 2, max: 100 })
    .withMessage('Full name is required (2-100 characters)'),
  // ✅ Changed: role list now includes 'student' instead of 'graduate'
  body('role')
    .isIn(['admin', 'university', 'employer', 'student'])
    .withMessage('Invalid role'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number'),
  handleValidationErrors,
];

const loginValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

// ─── Degree Validators ────────────────────────────────────────────────────────
const degreeCreateValidators = [
  body('graduate_id')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Valid graduate ID is required'),
  body('student_name').trim().notEmpty().isLength({ min: 2, max: 255 })
    .withMessage('Student name is required'),
  body('student_id').trim().notEmpty().isLength({ min: 2, max: 100 })
    .withMessage('Student ID is required'),
  body('degree_title').trim().notEmpty().isLength({ min: 2, max: 255 })
    .withMessage('Degree title is required'),
  body('field_of_study').trim().notEmpty().isLength({ min: 2, max: 255 })
    .withMessage('Field of study is required'),
  body('graduation_date').isISO8601().toDate()
    .withMessage('Valid graduation date is required'),
  body('gpa').optional().isFloat({ min: 0.0, max: 4.0 })
    .withMessage('GPA must be between 0 and 4'),
  body('honors').optional().isIn(['Summa Cum Laude', 'Magna Cum Laude', 'Cum Laude', 'With Distinction'])
    .withMessage('Invalid honors value'),
  handleValidationErrors,
];

// ─── Verification Validators ──────────────────────────────────────────────────
const verificationCreateValidators = [
  body('degree_id').isUUID().withMessage('Valid degree ID is required'),
  body('requester_email').optional().isEmail().withMessage('Valid email required'),
  body('requester_organization').optional().trim().isLength({ max: 255 }),
  body('purpose').optional().trim().isLength({ max: 500 }),
  handleValidationErrors,
];

// ─── UUID Param Validator ─────────────────────────────────────────────────────
const uuidParamValidator = (paramName = 'id') => [
  param(paramName).isUUID().withMessage(`Invalid ${paramName}`),
  handleValidationErrors,
];

// ─── Pagination Validators ────────────────────────────────────────────────────
const paginationValidators = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  registerValidators,
  loginValidators,
  degreeCreateValidators,
  verificationCreateValidators,
  uuidParamValidator,
  paginationValidators,
};