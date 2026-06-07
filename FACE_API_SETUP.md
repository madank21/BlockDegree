# Face-API.js Model Setup Instructions

## Overview
For real face verification, you need to download pre-trained ML models from face-api.js repository.

## Required Models
Face-API.js requires 3 neural network models:
1. **SSD MobileNet** - Face detection
2. **Face Landmark** - Face geometry (68 points)
3. **Face Recognition (Facenet)** - Face descriptors (128-d vectors)

## Download Models

### Method 1: Using npm (Recommended)
```bash
# Install face-api models
npm install face-api.js-models@latest
```

### Method 2: Manual Download
Download from GitHub: https://github.com/vladmandic/face-api/tree/master/model

The models directory should contain these files:
```
public/models/
├── face_landmark_68_model-weights_manifest.json
├── face_landmark_68_model-weights.bin
├── face_recognition_model-weights_manifest.json
├── face_recognition_model-weights.bin
├── ssd_mobilenetv1_model-weights_manifest.json
└── ssd_mobilenetv1_model-weights.bin
```

### Method 3: Using CDN (Development)
Add to your HTML `<head>`:
```html
<script async defer src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js"></script>
<script>
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model/';
</script>
```

## Step-by-Step Setup

### Step 1: Create Models Directory
```bash
mkdir -p public/models
```

### Step 2: Download Model Files
Using wget (Linux/Mac):
```bash
cd public/models

# SSD MobileNet
wget https://github.com/vladmandic/face-api/raw/master/model/ssd_mobilenetv1_model-weights_manifest.json
wget https://github.com/vladmandic/face-api/raw/master/model/ssd_mobilenetv1_model-weights.bin

# Face Landmarks
wget https://github.com/vladmandic/face-api/raw/master/model/face_landmark_68_model-weights_manifest.json
wget https://github.com/vladmandic/face-api/raw/master/model/face_landmark_68_model-weights.bin

# Face Recognition
wget https://github.com/vladmandic/face-api/raw/master/model/face_recognition_model-weights_manifest.json
wget https://github.com/vladmandic/face-api/raw/master/model/face_recognition_model-weights.bin
```

Using PowerShell (Windows):
```powershell
cd public\models

$urls = @(
  "https://github.com/vladmandic/face-api/raw/master/model/ssd_mobilenetv1_model-weights_manifest.json",
  "https://github.com/vladmandic/face-api/raw/master/model/ssd_mobilenetv1_model-weights.bin",
  "https://github.com/vladmandic/face-api/raw/master/model/face_landmark_68_model-weights_manifest.json",
  "https://github.com/vladmandic/face-api/raw/master/model/face_landmark_68_model-weights.bin",
  "https://github.com/vladmandic/face-api/raw/master/model/face_recognition_model-weights_manifest.json",
  "https://github.com/vladmandic/face-api/raw/master/model/face_recognition_model-weights.bin"
)

foreach ($url in $urls) {
  $filename = $url.Split('/')[-1]
  Invoke-WebRequest -Uri $url -OutFile $filename
}
```

### Step 3: Verify Files
Check that all 6 files are present:
```bash
ls -la public/models/
```

Expected output:
```
-rw-r--r--  face_landmark_68_model-weights.bin
-rw-r--r--  face_landmark_68_model-weights_manifest.json
-rw-r--r--  face_recognition_model-weights.bin
-rw-r--r--  face_recognition_model-weights_manifest.json
-rw-r--r--  ssd_mobilenetv1_model-weights.bin
-rw-r--r--  ssd_mobilenetv1_model-weights_manifest.json
```

### Step 4: Test Loading
Run your dev server and check browser console:
```bash
npm run dev
```

Open http://localhost:5173 and navigate to Face Verification page. Check console for:
- ✓ Models loaded successfully
- ✓ Face detection working

## Model Details

### SSD MobileNet V1 (ssd_mobilenetv1)
- **Size**: ~27 MB (weights)
- **Speed**: Very fast (~50-100ms per frame)
- **Accuracy**: Good for most use cases
- **Use**: Face detection

### Face Landmark (face_landmark_68)
- **Size**: ~350 KB
- **Output**: 68 facial landmark points
- **Use**: Face alignment and geometry

### Face Recognition (face_recognition / Facenet)
- **Size**: ~131 MB (weights)
- **Speed**: ~100-200ms per image
- **Output**: 128-dimensional face descriptor vector
- **Use**: Face matching and recognition

## Model Download Sizes
- **Total**: ~160 MB (all models combined)
- **Compressed**: ~40 MB (for CDN delivery)
- **Load Time**: 2-5 seconds on first load, then cached

## Performance Tips

1. **Lazy Load Models** - Models are loaded on-demand (not on app startup)
2. **Cache** - Browser caches models after first load
3. **CPU Usage** - Face verification uses WebGL acceleration
4. **Memory** - Typical: 200-300 MB while face detection is active

## Troubleshooting

### Models Not Loading
- Check browser console for CORS errors
- Verify files are in `public/models/`
- Check file permissions
- Try CDN version instead

### Slow Face Detection
- Reduce video resolution
- Use canvas resize before detection
- Check if other CPU-intensive tasks are running

### Memory Leaks
- Ensure canvas cleanup after use
- Properly dispose of video streams
- Test in Incognito mode

## Alternative: Roboflow Models
For higher accuracy, use Roboflow's hosted face detection:
```javascript
// See roboflowYOLO.ts for implementation
```

## Legal Notes
Face-API.js models are trained on:
- VGGFace2 (face recognition)
- Wikipedia & UTK face datasets (face landmarks)
- COCO (object detection base model)

All under Apache 2.0 / MIT licenses. Refer to original repositories for usage terms.
