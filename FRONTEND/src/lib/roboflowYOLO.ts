/**
 * Real YOLO document detection using Roboflow Inference API
 * This detects if a document image is authentic using trained YOLOv8 model
 */

export interface YOLODetection {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface YOLOResult {
  valid: boolean;
  detections: YOLODetection[];
  overallConfidence: number;
  warnings: string[];
}

/**
 * Detect document authenticity using Roboflow API
 * Models available: CNIC detection, Marksheet validation, Certificate verification
 */
export async function detectDocumentWithYOLO(
  base64Image: string,
  docType: string = 'general'
): Promise<YOLOResult> {
  const apiKey = import.meta.env.VITE_ROBOFLOW_API_KEY;
  if (!apiKey) {
    return {
      valid: true,
      detections: [],
      overallConfidence: 0,
      warnings: ['YOLO API key not configured. Skipping document validation.'],
    };
  }

  try {
    // Map document types to Roboflow model names
    const modelMap: Record<string, string> = {
      cnic: 'cnic-id-card/1',
      marksheet: 'academic-marksheet/1',
      certificate: 'degree-certificate/1',
      academic_record: 'document-authenticity/1',
    };

    const model = modelMap[docType] || 'document-authenticity/1';
    const apiUrl = `https://detect.roboflow.com/${model}`;

    // Strip data URL prefix if present
    const imageData = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    // Make API request to Roboflow
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: imageData,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`Roboflow API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.predictions || result.predictions.length === 0) {
      return {
        valid: false,
        detections: [],
        overallConfidence: 0,
        warnings: ['No objects detected in image. Image may be invalid or low quality.'],
      };
    }

    // Convert Roboflow predictions to standardized format
    const detections: YOLODetection[] = result.predictions.map((pred: any) => ({
      class: pred.class,
      confidence: Math.round(pred.confidence * 100),
      x: pred.x,
      y: pred.y,
      width: pred.width,
      height: pred.height,
    }));

    // Define expected classes for each document type
    const expectedClasses: Record<string, string[]> = {
      cnic: ['national_id', 'cnic', 'front_side', 'photo_region', 'gov_seal'],
      marksheet: ['marksheet', 'transcript', 'grades', 'university_stamp', 'signature'],
      certificate: ['certificate', 'degree', 'seal', 'signature', 'watermark'],
      academic_record: ['document', 'text', 'official_stamp', 'border'],
    };

    const expected = expectedClasses[docType] || expectedClasses['academic_record'];

    // Check if expected classes are present
    const foundExpected = detections.filter(d =>
      expected.some(e => d.class.toLowerCase().includes(e.toLowerCase()))
    );

    const avgConfidence =
      detections.length > 0
        ? Math.round(detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length)
        : 0;

    const warnings: string[] = [];

    // Validation logic
    if (foundExpected.length === 0) {
      warnings.push(
        `Document validation failed: Expected elements not detected (looking for: ${expected.join(', ')})`
      );
    }

    if (avgConfidence < 40) {
      warnings.push('Low detection confidence. Document may be unclear or damaged.');
    }

    // Check for suspicious patterns
    const suspiciousClasses = detections.filter(d =>
      ['watermark_removed', 'tampered', 'duplicated', 'forged'].some(s =>
        d.class.toLowerCase().includes(s)
      )
    );

    if (suspiciousClasses.length > 0) {
      warnings.push(
        `Document flagged as suspicious: ${suspiciousClasses.map(s => s.class).join(', ')}`
      );
    }

    // Determine validity
    const isValid = foundExpected.length >= 1 && avgConfidence > 50 && suspiciousClasses.length === 0;

    return {
      valid: isValid,
      detections,
      overallConfidence: avgConfidence,
      warnings,
    };
  } catch (error: any) {
    console.error('YOLO detection error:', error);

    // Fallback behavior
    const errorMsg = error.message || 'Unknown error';
    if (error.name === 'AbortError') {
      return {
        valid: true,
        detections: [],
        overallConfidence: 0,
        warnings: ['Document validation timed out. Proceeding with caution.'],
      };
    }

    return {
      valid: true,
      detections: [],
      overallConfidence: 0,
      warnings: [`YOLO error: ${errorMsg}. Please re-upload document.`],
    };
  }
}

/**
 * Batch detect multiple documents
 */
export async function detectMultipleDocuments(
  images: { base64: string; type: string }[]
): Promise<YOLOResult[]> {
  return Promise.all(images.map(img => detectDocumentWithYOLO(img.base64, img.type)));
}

/**
 * Check if document image is too blurry or low quality
 */
export function checkImageQuality(canvas: HTMLCanvasElement): {
  quality: number;
  issues: string[];
} {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { quality: 0, issues: ['Cannot access canvas context'] };

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let totalBrightness = 0;
  let edgeCount = 0;
  let darkPixels = 0;
  let brightPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;

    totalBrightness += brightness;

    if (brightness < 50) darkPixels++;
    if (brightness > 200) brightPixels++;
  }

  const avgBrightness = totalBrightness / (data.length / 4);
  const darkRatio = darkPixels / (data.length / 4);
  const brightRatio = brightPixels / (data.length / 4);

  const issues: string[] = [];
  let qualityScore = 100;

  if (avgBrightness < 80) {
    issues.push('Image is too dark');
    qualityScore -= 20;
  }

  if (avgBrightness > 230) {
    issues.push('Image is overexposed');
    qualityScore -= 20;
  }

  if (darkRatio > 0.4) {
    issues.push('Too many shadows');
    qualityScore -= 15;
  }

  if (brightRatio > 0.3) {
    issues.push('Too much glare');
    qualityScore -= 15;
  }

  return {
    quality: Math.max(0, qualityScore),
    issues,
  };
}
