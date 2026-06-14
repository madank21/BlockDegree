const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { logger } = require('../src/utils/logger');
const { supabaseAdmin } = require('../database/supabase');

class FaceVerificationService {
  constructor() {
    this.apiUrl = process.env.FACE_API_URL;
    this.apiKey = process.env.FACE_API_KEY;
  }

  // ─── Detect Face in Image ─────────────────────────────────────────────────
  async detectFace(imagePath) {
    try {
      // Simulate face detection (replace with actual API call)
      if (!fs.existsSync(imagePath)) {
        throw new Error('Image file not found');
      }

      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Mock response for development
      if (process.env.NODE_ENV === 'development') {
        return {
          faceDetected: true,
          confidence: 0.98,
          boundingBox: { top: 0.1, left: 0.2, width: 0.6, height: 0.6 },
          landmarks: [],
          quality: { brightness: 85, sharpness: 90 },
        };
      }

      // Production: call actual face detection API
      const formData = new FormData();
      formData.append('image', imageBuffer, 'face.jpg');

      const response = await axios.post(`${this.apiUrl}/detect`, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-API-Key': this.apiKey,
        },
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      logger.error('Face detection error:', error.message);
      throw new Error(`Face detection failed: ${error.message}`);
    }
  }

  // ─── Compare Faces ────────────────────────────────────────────────────────
  async compareFaces(sourcePath, targetPath) {
    try {
      if (process.env.NODE_ENV === 'development') {
        // Mock comparison
        const mockSimilarity = 85 + Math.random() * 15;
        return {
          isMatch: mockSimilarity > 80,
          similarity: mockSimilarity,
          confidence: 0.95,
        };
      }

      const formData = new FormData();
      formData.append('source', fs.readFileSync(sourcePath), 'source.jpg');
      formData.append('target', fs.readFileSync(targetPath), 'target.jpg');

      const response = await axios.post(`${this.apiUrl}/compare`, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-API-Key': this.apiKey,
        },
        timeout: 30000,
      });

      return {
        isMatch: response.data.similarity > 80,
        similarity: response.data.similarity,
        confidence: response.data.confidence,
      };
    } catch (error) {
      logger.error('Face comparison error:', error.message);
      throw new Error(`Face comparison failed: ${error.message}`);
    }
  }

  // ─── Liveness Detection ───────────────────────────────────────────────────
  async checkLiveness(imagePath) {
    try {
      if (process.env.NODE_ENV === 'development') {
        return {
          isLive: true,
          score: 0.97,
          spoofingDetected: false,
        };
      }

      const formData = new FormData();
      formData.append('image', fs.readFileSync(imagePath), 'face.jpg');

      const response = await axios.post(`${this.apiUrl}/liveness`, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-API-Key': this.apiKey,
        },
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      logger.error('Liveness check error:', error.message);
      throw new Error(`Liveness check failed: ${error.message}`);
    }
  }

  // ─── Extract Face Encoding ────────────────────────────────────────────────
  async extractEncoding(imagePath) {
    try {
      if (process.env.NODE_ENV === 'development') {
        // Mock encoding (128-dimensional vector)
        const encoding = Array.from({ length: 128 }, () => Math.random() - 0.5);
        return JSON.stringify(encoding);
      }

      const formData = new FormData();
      formData.append('image', fs.readFileSync(imagePath), 'face.jpg');

      const response = await axios.post(`${this.apiUrl}/encode`, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-API-Key': this.apiKey,
        },
        timeout: 30000,
      });

      return JSON.stringify(response.data.encoding);
    } catch (error) {
      logger.error('Face encoding error:', error.message);
      throw new Error(`Face encoding failed: ${error.message}`);
    }
  }

  // ─── Full Verification Pipeline ───────────────────────────────────────────
  async verifyIdentity(selfieImagePath, storedImagePath, userId) {
    try {
      logger.info(`Face verification started for user: ${userId}`);

      // Step 1: Detect face in selfie
      const faceDetection = await this.detectFace(selfieImagePath);
      if (!faceDetection.faceDetected) {
        return {
          success: false,
          isMatch: false,
          reason: 'No face detected in submitted image',
          confidence: 0,
        };
      }

      // Step 2: Liveness check
      const liveness = await this.checkLiveness(selfieImagePath);
      if (!liveness.isLive) {
        return {
          success: false,
          isMatch: false,
          reason: 'Liveness check failed - possible spoofing detected',
          livenessScore: liveness.score,
          confidence: 0,
        };
      }

      // Step 3: Compare faces
      const comparison = await this.compareFaces(selfieImagePath, storedImagePath);

      // Step 4: Log to database
      await supabaseAdmin.from('face_verifications').insert([{
        user_id: userId,
        confidence_score: comparison.similarity,
        is_match: comparison.isMatch,
        liveness_score: liveness.score,
        liveness_passed: liveness.isLive,
        api_response: {
          detection: faceDetection,
          liveness,
          comparison,
        },
      }]);

      logger.info(`Face verification completed for user ${userId}: ${comparison.isMatch ? 'MATCH' : 'NO MATCH'}`);

      return {
        success: true,
        isMatch: comparison.isMatch,
        confidence: comparison.similarity,
        livenessScore: liveness.score,
        livenessDetected: liveness.isLive,
        threshold: 80,
      };
    } catch (error) {
      logger.error('Identity verification error:', error);
      throw error;
    }
  }

  // ─── Enroll User Face ─────────────────────────────────────────────────────
  async enrollFace(imagePath, userId) {
    try {
      const faceDetection = await this.detectFace(imagePath);
      if (!faceDetection.faceDetected) {
        throw new Error('No face detected in the enrollment image');
      }

      const encoding = await this.extractEncoding(imagePath);

      // Save encoding to user record
      await supabaseAdmin
        .from('users')
        .update({ face_encoding: encoding })
        .eq('id', userId);

      logger.info(`Face enrolled for user: ${userId}`);
      return { success: true, enrolled: true };
    } catch (error) {
      logger.error('Face enrollment error:', error);
      throw error;
    }
  }
}

const faceVerificationService = new FaceVerificationService();
module.exports = faceVerificationService;