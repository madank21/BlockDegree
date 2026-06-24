/**
 * Blockchain Controller
 * Path: BACKEND/controllers/blockchainController.js
 *
 * Fixed:
 *  1. getDegreeByTokenId now calls blockchainService.getDegreeByTokenId()
 *     which is properly implemented in blockchainService.js.
 *  2. reregisterDegree no longer stores blockchainResult.tokenId (always
 *     undefined) — it stores null since contract has no tokenId concept.
 *  3. (NEW) reregisterDegree read snake_case fields (degree.blockchain_tx_hash,
 *     degree.degree_hash, degree.student_name, degree.registration_number,
 *     degree.department, degree.program, degree.graduation_year) off of
 *     `degree`, but Degree.findById() returns the camelCase-mapped DTO
 *     (blockchainTxHash, degreeHash, studentName, studentId, fieldOfStudy,
 *     degreeTitle, graduationDate) — every one of those reads was
 *     `undefined`. This meant: the "already registered" guard never
 *     triggered (so a degree could be registered on-chain twice), and the
 *     blockchain call was issuing degrees with an undefined hash and
 *     blank/undefined student details. Field reads fixed to match the
 *     real DTO shape blockchainService.issueDegree() actually needs (same
 *     param shape degreeController.js's primary issuance flow already
 *     uses, for consistency). The dead `token_id` field is also dropped
 *     from the update payload — that column lives on blockchain_transactions,
 *     not degrees, and Degree.update()'s field map doesn't recognize it
 *     either way, so it was a silent no-op.
 *  4. (NEW) getBlockchainTransactions returned raw DB rows (tx_hash,
 *     degree_id, block_number, gas_used, created_at, no issuer/degree-hash
 *     at all) directly as `data`, an array. FRONTEND/src/pages/
 *     BlockchainView.tsx (and api.ts's own declared blockchainApi.
 *     transactions() return type) expect { transactions: Transaction[],
 *     total } where each Transaction has camelCase fields (degreeId,
 *     degreeHash, txHash, issuerAddress, timestamp, blockNumber, gasUsed,
 *     studentRegNo). The page was crashing as soon as any transaction
 *     existed: `tx.blockNumber.toLocaleString()` threw because
 *     `blockNumber` was always undefined on the raw row. Rows are now
 *     mapped to the camelCase shape the frontend needs, with degreeHash
 *     and studentRegNo resolved via the existing degree join, and
 *     issuerAddress filled in from the platform wallet (every transaction
 *     is signed by the same backend wallet — there's no per-transaction
 *     issuer column in this schema).
 */

const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess, sendError } = require('../src/utils/response');
const blockchainService = require('../services/blockchainService');
const Degree = require('../models/Degree');
const { getSupabaseAdmin } = require('../database/supabase');
const { logger } = require('../src/utils/logger');

// ── GET /api/v1/blockchain/network ──────────────────────────────────────────
const getNetworkInfo = asyncHandler(async (req, res) => {
  const info = await blockchainService.getNetworkInfo();
  return sendSuccess(res, info, 'Blockchain network info retrieved');
});

// ── GET /api/v1/blockchain/verify/:hash ─────────────────────────────────────
const verifyOnBlockchain = asyncHandler(async (req, res) => {
  const { hash } = req.params;
  if (!hash || !hash.startsWith('0x')) {
    return sendError(res, 'Invalid degree hash format. Hash must start with 0x.', 400);
  }
  const result = await blockchainService.verifyDegree(hash);
  return sendSuccess(res, result, 'Blockchain verification complete');
});

// ── GET /api/v1/blockchain/transaction/:txHash ───────────────────────────────
const getTransaction = asyncHandler(async (req, res) => {
  const { txHash } = req.params;
  if (!txHash || !txHash.startsWith('0x')) {
    return sendError(res, 'Invalid transaction hash.', 400);
  }
  const tx = await blockchainService.getTransaction(txHash);
  return sendSuccess(res, tx, 'Transaction retrieved');
});

// ── GET /api/v1/blockchain/total ─────────────────────────────────────────────
const getTotalDegreesOnChain = asyncHandler(async (req, res) => {
  const total = await blockchainService.getTotalDegreesIssued();
  return sendSuccess(res, { totalDegrees: total }, 'Total degrees retrieved');
});

// ── GET /api/v1/blockchain/transactions ─────────────────────────────────────
const getBlockchainTransactions = asyncHandler(async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin();
  const { page = 1, limit = 20, status } = req.query;
  const from = (parseInt(page) - 1) * parseInt(limit);
  const to   = from + parseInt(limit) - 1;

  let query = supabaseAdmin
    .from('blockchain_transactions')
    .select(
      `*, degree:degree_id(id, degree_hash, student_name, student_id, certificate_number)`,
      { count: 'exact' }
    );

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query
    .range(from, to)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // FIX-4: every transaction on this platform is signed by the same backend
  // wallet — there's no per-row issuer column — so resolve it once rather
  // than per row.
  let issuerAddress = null;
  try {
    await blockchainService.ensureConnected();
    issuerAddress = blockchainService.wallet?.address || null;
  } catch (err) {
    logger.warn('Could not resolve issuer wallet address:', err.message);
  }

  // FIX-4: map raw snake_case rows -> the camelCase Transaction shape
  // BlockchainView.tsx actually reads.
  const transactions = (data || []).map((row) => ({
    id: row.id,
    degreeId: row.degree_id,
    degreeHash: row.degree?.degree_hash || null,
    txHash: row.tx_hash,
    issuerAddress,
    timestamp: row.created_at,
    blockNumber: row.block_number,
    gasUsed: row.gas_used,
    status: row.status,
    operation: row.operation,
    studentRegNo: row.degree?.student_id || null,
  }));

  return res.status(200).json({
    success:    true,
    message:    'Blockchain transactions retrieved',
    data: {
      transactions,
      total:      count,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit)),
    },
  });
});

// ── POST /api/v1/blockchain/degrees/:id/register ─────────────────────────────
const reregisterDegree = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!['admin', 'university'].includes(req.user.role)) {
    return sendError(res, 'Access denied.', 403);
  }

  const degree = await Degree.findById(id);
  if (!degree) return sendError(res, 'Degree not found.', 404);

  // FIX-3: was `degree.blockchain_tx_hash` — Degree.findById() returns the
  // camelCase DTO, so that read was always undefined and this guard never
  // fired, allowing the same degree to be registered on-chain more than once.
  if (degree.blockchainTxHash) {
    return sendError(res, 'Degree is already registered on blockchain.', 400);
  }

  try {
    // FIX-3: every field below was read off a non-existent snake_case
    // property before (degree.degree_hash, degree.student_name,
    // degree.registration_number, degree.department, degree.program,
    // degree.graduation_year) and was always undefined. Now mirrors the
    // exact param shape degreeController.js's primary issuance flow uses.
    const blockchainResult = await blockchainService.issueDegree({
      degreeId:           String(degree.id),
      degreeHash:         degree.degreeHash,
      studentName:        degree.studentName,
      registrationNumber: degree.studentId,
      department:         degree.fieldOfStudy,
      program:            degree.degreeTitle,
      cgpa:               String(degree.gpa || '0'),
      graduationYear:     String(new Date(degree.graduationDate).getFullYear()),
    });

    // NOTE: contract does not return tokenId — store null explicitly.
    // `token_id` itself is dropped here: that column lives on
    // blockchain_transactions, not degrees, and Degree.update()'s field map
    // doesn't recognize it on this table either way (it was a silent no-op).
    await Degree.update(id, {
      blockchain_tx_hash:      blockchainResult.txHash,
      blockchain_block_number: blockchainResult.blockNumber,
      blockchain_timestamp:    blockchainResult.timestamp,
      blockchain_sync_status:  'confirmed',
      status:                  'issued',
    });

    return sendSuccess(res, {
      txHash:      blockchainResult.txHash,
      blockNumber: blockchainResult.blockNumber,
    }, 'Degree registered on blockchain successfully');
  } catch (error) {
    logger.error('Re-registration failed:', error);
    return sendError(res, `Blockchain registration failed: ${error.message}`, 500);
  }
});

// ── GET /api/v1/blockchain/token/:tokenId ────────────────────────────────────
const getDegreeByTokenId = asyncHandler(async (req, res) => {
  const { tokenId } = req.params;

  if (!tokenId) {
    return sendError(res, 'tokenId parameter is required.', 400);
  }

  const result = await blockchainService.getDegreeByTokenId(tokenId);
  return sendSuccess(res, result, 'Degree retrieved from blockchain');
});

module.exports = {
  getNetworkInfo,
  verifyOnBlockchain,
  getTransaction,
  getTotalDegreesOnChain,
  getBlockchainTransactions,
  reregisterDegree,
  getDegreeByTokenId,
};