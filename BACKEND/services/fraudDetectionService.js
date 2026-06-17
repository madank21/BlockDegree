// services/fraudDetectionService.js
const { logger } = require('../src/utils/logger');
const { supabaseAdmin } = require('../database/supabase');
// Import blockchain service (singleton) for hash validation
const blockchainService = require('./blockchainService');

class FraudDetectionService {
  constructor() {
    this.threshold = parseInt(process.env.FRAUD_SCORE_THRESHOLD) || 70;
  }

  async analyzeDocument(documentData, ocrData) {
    try {
      const checks = [];
      let fraudScore = 0;
      const flags = [];

      // 1. Metadata consistency
      const metaCheck = this.checkMetadataConsistency(documentData, ocrData);
      checks.push(metaCheck);
      if (!metaCheck.passed) {
        fraudScore += metaCheck.weight;
        flags.push(metaCheck.flag);
      }

      // 2. Formatting anomalies
      const formattingCheck = this.checkFormatting(ocrData);
      checks.push(formattingCheck);
      if (!formattingCheck.passed) {
        fraudScore += formattingCheck.weight;
        flags.push(formattingCheck.flag);
      }

      // 3. Institution validation
      const institutionCheck = await this.validateInstitution(ocrData);
      checks.push(institutionCheck);
      if (!institutionCheck.passed) {
        fraudScore += institutionCheck.weight;
        flags.push(institutionCheck.flag);
      }

      // 4. Date validation
      const dateCheck = this.validateDates(ocrData);
      checks.push(dateCheck);
      if (!dateCheck.passed) {
        fraudScore += dateCheck.weight;
        flags.push(dateCheck.flag);
      }

      // 5. Duplicate detection
      const duplicateCheck = await this.checkDuplicates(documentData);
      checks.push(duplicateCheck);
      if (!duplicateCheck.passed) {
        fraudScore += duplicateCheck.weight;
        flags.push(duplicateCheck.flag);
      }

      // 6. OCR confidence
      const ocrCheck = this.checkOCRConfidence(ocrData);
      checks.push(ocrCheck);
      if (!ocrCheck.passed) {
        fraudScore += ocrCheck.weight;
        flags.push(ocrCheck.flag);
      }

      // 7. 🔥 NEW: Blockchain hash validation (if degreeHash provided)
      if (documentData.degreeHash) {
        const blockchainCheck = await this.checkBlockchainHash(documentData.degreeHash);
        checks.push(blockchainCheck);
        if (!blockchainCheck.passed) {
          fraudScore += blockchainCheck.weight;
          flags.push(blockchainCheck.flag);
        }
      }

      const isFraudulent = fraudScore >= this.threshold;
      const riskLevel = this.calculateRiskLevel(fraudScore);

      logger.info(`Fraud analysis complete. Score: ${fraudScore}, Fraudulent: ${isFraudulent}`);

      return {
        fraudScore,
        isFraudulent,
        riskLevel,
        flags,
        checks,
        threshold: this.threshold,
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Fraud detection error:', error);
      throw error;
    }
  }

  // ─── Individual Checks ──────────────────────────────────────────────────

  checkMetadataConsistency(documentData, ocrData) {
    const issues = [];
    if (ocrData.studentName && documentData.studentName) {
      const similarity = this.calculateStringSimilarity(
        ocrData.studentName.toLowerCase(),
        documentData.studentName.toLowerCase()
      );
      if (similarity < 0.7) {
        issues.push('Name mismatch between OCR and submitted data');
      }
    }
    return {
      name: 'metadata_consistency',
      passed: issues.length === 0,
      weight: 25,
      flag: issues.length ? `Metadata inconsistency: ${issues.join(', ')}` : null,
      details: issues,
    };
  }

  checkFormatting(ocrData) {
    const suspiciousPatterns = [
      /\b(lorem ipsum)\b/i,
      /[^\x00-\x7F]{5,}/,
      /(.)\1{10,}/,
    ];
    const text = ocrData.rawText || '';
    const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(text));
    return {
      name: 'formatting_check',
      passed: !hasSuspiciousContent,
      weight: 20,
      flag: hasSuspiciousContent ? 'Suspicious text patterns detected' : null,
    };
  }

  async validateInstitution(ocrData) {
    try {
      if (!ocrData.institutionName) {
        return { name: 'institution_validation', passed: true, weight: 15, flag: null };
      }
      const { data } = await supabaseAdmin
        .from('users')
        .select('institution_name')
        .eq('role', 'university')
        .ilike('institution_name', `%${ocrData.institutionName}%`)
        .limit(1);
      const isKnownInstitution = data && data.length > 0;
      return {
        name: 'institution_validation',
        passed: isKnownInstitution,
        weight: 15,
        flag: !isKnownInstitution ? `Unknown institution: ${ocrData.institutionName}` : null,
      };
    } catch {
      return { name: 'institution_validation', passed: true, weight: 15, flag: null };
    }
  }

  validateDates(ocrData) {
    const issues = [];
    if (ocrData.graduationDate) {
      const gradDate = new Date(ocrData.graduationDate);
      const now = new Date();
      const minDate = new Date('1900-01-01');
      if (gradDate > now) issues.push('Graduation date is in the future');
      if (gradDate < minDate) issues.push('Graduation date is too old');
    }
    return {
      name: 'date_validation',
      passed: issues.length === 0,
      weight: 20,
      flag: issues.length ? issues.join(', ') : null,
    };
  }

  async checkDuplicates(documentData) {
    try {
      const { data } = await supabaseAdmin
        .from('documents')
        .select('id, user_id')
        .eq('file_hash', documentData.fileHash)
        .neq('user_id', documentData.userId);
      const isDuplicate = data && data.length > 0;
      return {
        name: 'duplicate_detection',
        passed: !isDuplicate,
        weight: 35,
        flag: isDuplicate ? `Duplicate document detected (found in ${data.length} other records)` : null,
        duplicateCount: isDuplicate ? data.length : 0,
      };
    } catch {
      return { name: 'duplicate_detection', passed: true, weight: 35, flag: null };
    }
  }

  checkOCRConfidence(ocrData) {
    const confidence = ocrData.confidence || 100;
    const threshold = parseInt(process.env.OCR_CONFIDENCE_THRESHOLD) || 75;
    const lowConfidence = confidence < threshold;
    return {
      name: 'ocr_confidence',
      passed: !lowConfidence,
      weight: 15,
      flag: lowConfidence ? `Low OCR confidence: ${confidence}% (threshold: ${threshold}%)` : null,
      confidence,
    };
  }

  // ─── 🔥 NEW: Blockchain Hash Validation ──────────────────────────────
  async checkBlockchainHash(degreeHash) {
    try {
      const result = await blockchainService.verifyDegree(degreeHash);
      const existsOnChain = result.exists && result.isValid && !result.isRevoked;
      return {
        name: 'blockchain_hash_validation',
        passed: existsOnChain,
        weight: 50,
        flag: existsOnChain ? null : `Degree hash not found or invalid on blockchain: ${degreeHash}`,
        details: result,
      };
    } catch (error) {
      logger.warn('Blockchain hash validation skipped:', error.message);
      // If blockchain is unavailable, skip this check (pass) to avoid false positives
      return {
        name: 'blockchain_hash_validation',
        passed: true,
        weight: 50,
        flag: null,
        details: { error: error.message, skipped: true },
      };
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────
  calculateRiskLevel(score) {
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    if (score >= 20) return 'LOW';
    return 'MINIMAL';
  }

  calculateStringSimilarity(str1, str2) {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    return 1 - this.levenshteinDistance(str1, str2) / maxLen;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }
}

const fraudDetectionService = new FraudDetectionService();
module.exports = fraudDetectionService;