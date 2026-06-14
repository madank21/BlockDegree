const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { logger } = require('../src/utils/logger');

class OCRService {
  constructor() {
    this.confidenceThreshold = parseInt(process.env.OCR_CONFIDENCE_THRESHOLD) || 75;
  }

  // ─── Preprocess Image ─────────────────────────────────────────────────────
  async preprocessImage(imagePath) {
    try {
      const outputPath = imagePath.replace(
        path.extname(imagePath),
        '_processed.png'
      );

      await sharp(imagePath)
        .greyscale()
        .normalize()
        .sharpen()
        .resize(2000, null, { withoutEnlargement: true })
        .png({ quality: 100 })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      logger.warn('Image preprocessing failed, using original:', error.message);
      return imagePath;
    }
  }

  // ─── Extract Text ─────────────────────────────────────────────────────────
  async extractText(imagePath) {
    try {
      logger.info(`OCR processing: ${path.basename(imagePath)}`);

      const processedPath = await this.preprocessImage(imagePath);

      const result = await Tesseract.recognize(processedPath, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      // Cleanup processed file
      if (processedPath !== imagePath && fs.existsSync(processedPath)) {
        fs.unlinkSync(processedPath);
      }

      const confidence = result.data.confidence;
      const rawText = result.data.text;

      const extractedData = this.parseDocumentText(rawText);

      logger.info(`OCR completed. Confidence: ${confidence}%`);

      return {
        rawText,
        confidence,
        extractedData,
        words: result.data.words?.map(w => ({ text: w.text, confidence: w.confidence })),
        isHighConfidence: confidence >= this.confidenceThreshold,
      };
    } catch (error) {
      logger.error('OCR extraction error:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  // ─── Parse Document Text ──────────────────────────────────────────────────
  parseDocumentText(text) {
    const extracted = {};

    // Name patterns
    const namePatterns = [
      /(?:this is to certify that|certify that|awarded to|presented to|degree to)\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /Name[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        extracted.studentName = match[1].trim();
        break;
      }
    }

    // Degree title patterns
    const degreePatterns = [
      /Bachelor of (?:Science|Arts|Engineering|Business|Commerce|Education|Medicine|Law)[^,\n]*/i,
      /Master of (?:Science|Arts|Engineering|Business|Commerce|Education|Medicine|Law)[^,\n]*/i,
      /Doctor of (?:Philosophy|Medicine|Science|Law)[^,\n]*/i,
      /(?:degree|diploma) (?:of|in) ([A-Za-z\s]+)/i,
    ];

    for (const pattern of degreePatterns) {
      const match = text.match(pattern);
      if (match) {
        extracted.degreeTitle = match[0].trim();
        break;
      }
    }

    // Date patterns
    const datePatterns = [
      /(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        extracted.graduationDate = match[0].trim();
        break;
      }
    }

    // GPA/Grade patterns
    const gpaMatch = text.match(/(?:GPA|Grade Point Average|CGPA)[:\s]+(\d+\.\d+)/i);
    if (gpaMatch) {
      extracted.gpa = parseFloat(gpaMatch[1]);
    }

    // Institution name (simple heuristic)
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      const firstLines = lines.slice(0, 3).join(' ');
      const universityMatch = firstLines.match(
        /([A-Z][a-zA-Z\s]+(?:University|College|Institute|School|Academy))/
      );
      if (universityMatch) {
        extracted.institutionName = universityMatch[1].trim();
      }
    }

    // Certificate/Serial number
    const certMatch = text.match(/(?:certificate|serial|ref)[\s#.:]+([A-Z0-9\-]+)/i);
    if (certMatch) {
      extracted.certificateNumber = certMatch[1].trim();
    }

    // Honors
    const honorsPatterns = ['Summa Cum Laude', 'Magna Cum Laude', 'Cum Laude', 'With Distinction', 'With Honors'];
    for (const honor of honorsPatterns) {
      if (text.includes(honor)) {
        extracted.honors = honor;
        break;
      }
    }

    return extracted;
  }

  // ─── Validate Document Fields ─────────────────────────────────────────────
  validateExtractedData(extractedData, requiredFields = []) {
    const missingFields = requiredFields.filter(field => !extractedData[field]);
    return {
      isValid: missingFields.length === 0,
      missingFields,
      presentFields: Object.keys(extractedData),
    };
  }
}

const ocrService = new OCRService();
module.exports = ocrService;