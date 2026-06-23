/**
 * Blockchain Controller
 * Path: BACKEND/controllers/blockchainController.js
 *
 * Fixed:
 *  1. getDegreeByTokenId now calls blockchainService.getDegreeByTokenId()
 *     which is properly implemented in blockchainService.js.
 *  2. reregisterDegree no longer stores blockchainResult.tokenId (always
 *     undefined) — it stores null since contract has no tokenId concept.
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
    .select(`*, degree:degree_id(id, degree_title, certificate_number)`, { count: 'exact' });

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query
    .range(from, to)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return res.status(200).json({
    success:    true,
    message:    'Blockchain transactions retrieved',
    data,
    pagination: {
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

  if (degree.blockchain_tx_hash) {
    return sendError(res, 'Degree is already registered on blockchain.', 400);
  }

  try {
    const blockchainResult = await blockchainService.issueDegree({
      degreeId:           degree.id,
      degreeHash:         degree.degree_hash,
      studentName:        degree.student_name,
      registrationNumber: degree.registration_number,
      department:         degree.department,
      program:            degree.program,
      cgpa:               String(degree.cgpa || ''),
      graduationYear:     String(degree.graduation_year || degree.graduation_date || ''),
    });

    // NOTE: contract does not return tokenId — store null explicitly
    await Degree.update(id, {
      blockchain_tx_hash:      blockchainResult.txHash,
      blockchain_block_number: blockchainResult.blockNumber,
      blockchain_timestamp:    blockchainResult.timestamp,
      blockchain_sync_status:  'confirmed',
      token_id:                null,
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