import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

/**
 * Load face-api.js models (do this once on app start)
 * Models should be in /public/models/ directory
 */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;

  try {
    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  } catch (error) {
    console.error('Failed to load face models:', error);
    throw new Error('Face recognition models failed to load. Please try again.');
  }
}

/**
 * Get face descriptor from an image element
 * Returns a 128-dimensional vector representing the face
 */
export async function getFaceDescriptor(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  try {
    await loadFaceModels();
    const detection = await faceapi
      .detectSingleFace(imageElement)
      .withFaceLandmarks()
      .withFaceDescriptor();

    return detection?.descriptor || null;
  } catch (error) {
    console.error('Error detecting face:', error);
    return null;
  }
}

/**
 * Compare two face descriptors
 * Uses Euclidean distance to calculate similarity
 */
export function compareFaces(
  descriptor1: Float32Array,
  descriptor2: Float32Array
): { match: boolean; confidence: number; distance: number } {
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);

  // Typical face-api.js threshold: <0.6 = likely same person
  // More permissive: <0.7, More strict: <0.5
  const MATCH_THRESHOLD = 0.6;
  const match = distance < MATCH_THRESHOLD;

  // Convert distance to confidence percentage
  // Lower distance = higher confidence
  const confidence = Math.round(Math.max(0, (1 - Math.min(distance, 1)) * 100));

  return { match, confidence, distance };
}

/**
 * Extract face descriptor from a data URL
 * Used for processing uploaded/captured images
 */
export async function extractFaceFromDataURL(dataURL: string): Promise<Float32Array | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const descriptor = await getFaceDescriptor(img);
      resolve(descriptor);
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = dataURL;
  });
}

/**
 * Detect if a face is present in an image
 * Returns face detection results with bounding box
 */
export async function detectFaceInImage(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<{ detected: boolean; confidence: number; boundingBox?: any }> {
  try {
    await loadFaceModels();
    const detection = await faceapi.detectSingleFace(imageElement);

    if (!detection) {
      return { detected: false, confidence: 0 };
    }

    return {
      detected: true,
      confidence: Math.round(detection.score * 100),
      boundingBox: detection.box,
    };
  } catch (error) {
    console.error('Error in face detection:', error);
    return { detected: false, confidence: 0 };
  }
}

/**
 * Analyze image quality for face verification
 * Checks lighting, face position, etc.
 */
export async function analyzeImageQuality(
  canvas: HTMLCanvasElement
): Promise<{ quality: number; issues: string[] }> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { quality: 0, issues: ['Canvas context unavailable'] };

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const issues: string[] = [];

  let totalBrightness = 0;
  let darkPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    totalBrightness += brightness;

    if (brightness < 50) darkPixels++;
  }

  const avgBrightness = totalBrightness / (data.length / 4);
  const darkRatio = darkPixels / (data.length / 4);

  if (avgBrightness < 80) {
    issues.push('Image is too dark. Please improve lighting.');
  } else if (avgBrightness > 240) {
    issues.push('Image is overexposed. Please reduce lighting.');
  }

  if (darkRatio > 0.3) {
    issues.push('Too many dark areas in image.');
  }

  const quality = Math.max(0, Math.min(100, avgBrightness * 0.4 + (100 - darkRatio * 100) * 0.6));

  return { quality: Math.round(quality), issues };
}
