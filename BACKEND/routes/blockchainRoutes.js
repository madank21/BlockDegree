const express = require('express');
const router = express.Router();

const {
  getNetworkInfo,
  verifyOnBlockchain,
  getTransaction,
  getTotalDegreesOnChain,
  getBlockchainTransactions,
  reregisterDegree,
  getDegreeByTokenId,
} = require('../controllers/blockchainController');

const { authenticate } = require('../middleware/authMiddleware');
const { authorize, authorizeAdmin } = require('../middleware/roleMiddleware');
const { uuidParamValidator, paginationValidators } = require('../src/utils/validators');

router.use(authenticate);

router.get('/network', getNetworkInfo);
router.get('/total', getTotalDegreesOnChain);
router.get('/verify/:hash', verifyOnBlockchain);
router.get('/transaction/:txHash', getTransaction);
router.get('/token/:tokenId', getDegreeByTokenId);
router.get('/transactions', 
  authorize('admin', 'university'),
  paginationValidators,
  getBlockchainTransactions
);
router.post('/degrees/:id/register',
  authorize('admin', 'university'),
  ...uuidParamValidator(),
  reregisterDegree
);

module.exports = router;