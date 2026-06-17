const crypto = require('crypto');

/**
 * Generates a deterministic SHA256 hash of a degree record.
 * Guarantees zero-drift consistency between OCR engine and Controllers.
 */
const generateDegreeHash = (data) => {
  const hashData = {
    studentName: data.student_name || data.studentName,
    registrationNumber: data.student_id || data.registrationNumber,
    department: data.field_of_study || data.department,
    program: data.degree_title || data.program,
    cgpa: String(data.gpa ?? data.cgpa ?? 0),
    graduationYear: String(
    data.graduationYear ||
    (data.graduation_date ? new Date(data.graduation_date).getFullYear() : '')
    ),
  };

  // Enforce rigid alphabetical ordering and clean up white spaces completely
  const sortedNormalized = Object.keys(hashData)
    .sort()
    .reduce((acc, key) => {
      acc[key] = String(hashData[key] || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
      return acc;
    }, {});

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(sortedNormalized))
    .digest('hex');
};

module.exports = { generateDegreeHash };