const express = require('express');
const router = express.Router();
const { getSupabaseAdmin } = require('../database/supabase');

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper: verify a degree by its cryptographic hash
// (Reuses the same logic that worked for /public/:hash)
// ─────────────────────────────────────────────────────────────────────────────
async function verifyDegreeHash(degreeHash) {
  const supabase = getSupabaseAdmin();

  // 1. Fetch degree from Supabase
  const { data: degree, error } = await supabase
    .from('degrees')
    .select('*')
    .eq('degree_hash', degreeHash)
    .single();

  if (error || !degree) {
    return { valid: false, error: 'Degree not found in database' };
  }

  // 2. Check blockchain status
  //    If blockchain_sync_status is 'success', we consider it verified.
  //    Optionally, you could call the smart contract here.
  if (degree.blockchain_sync_status === 'success') {
    return {
      valid: true,
      degreeDetails: {
        degreeId: degree.id,
        studentName: degree.student_name,
        registrationNumber: degree.student_id,
        degreeTitle: degree.degree_title,
        department: degree.field_of_study,
        cgpa: degree.gpa,
        graduationYear: degree.graduation_date,
        certificateNumber: degree.certificate_number,
        institution: degree.institution_name,
        issuedBy: degree.issued_by,
        fraudScore: degree.fraud_score || 0,
        qrCodeData: degree.qr_code_url,
      },
      blockchain: {
        txHash: degree.blockchain_tx_hash,
        syncStatus: degree.blockchain_sync_status,
        verified: true,
      },
    };
  } else {
    return {
      valid: false,
      error: `Blockchain sync status: ${degree.blockchain_sync_status}`,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route: GET /public/:hash  (degree hash, 64 hex chars, no 0x)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/public/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const result = await verifyDegreeHash(hash);

    if (result.valid) {
      return res.json({
        success: true,
        message: 'Degree is VALID and verified on blockchain',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(404).json({
        success: false,
        message: result.error || 'Degree not found on blockchain registry.',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Verification error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
      timestamp: new Date().toISOString(),
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Route: GET /public/tx/:txHash  (transaction hash, 0x... length 66)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/public/tx/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    const supabase = getSupabaseAdmin();

    // 1. Find degree by transaction hash
    const { data: degree, error } = await supabase
      .from('degrees')
      .select('degree_hash')
      .eq('blockchain_tx_hash', txHash)
      .single();

    if (error || !degree) {
      return res.status(404).json({
        success: false,
        message: 'Degree not found for this transaction hash.',
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Verify using the degree hash
    const result = await verifyDegreeHash(degree.degree_hash);

    if (result.valid) {
      return res.json({
        success: true,
        message: 'Degree is VALID and verified on blockchain',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(404).json({
        success: false,
        message: result.error || 'Degree not found on blockchain registry.',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Transaction hash verification error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;