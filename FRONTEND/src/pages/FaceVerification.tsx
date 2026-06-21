import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../useStore';
import { Camera, CheckCircle2, ScanFace, Shield, User, AlertTriangle, RefreshCw, X } from 'lucide-react';
// ✅ Correct import: default object containing postForm, request, etc.
import api from '../api/api';

export default function FaceVerification() {
  const { currentUser } = useStore();
  const [stage, setStage] = useState<'ready' | 'permission' | 'camera' | 'captured' | 'analyzing' | 'comparing' | 'result'>('ready');
  const [result, setResult] = useState<'match' | 'failed' | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cnicImage, setCnicImage] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [analysisDetails, setAnalysisDetails] = useState<string[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  if (!currentUser) return null;

  // Load CNIC image from user documents
  useEffect(() => {
    const cnicDoc = currentUser.documents?.find(d => d.type === 'cnic');
    if (cnicDoc && (cnicDoc as any).fileUrl) {
      setCnicImage((cnicDoc as any).fileUrl);
    }
  }, [currentUser]);

  const alreadyVerified = currentUser.verificationStatus === 'face_verified' || currentUser.verificationStatus === 'approved';

  // Check camera permissions
  useEffect(() => {
    checkCameraPermissions();
  }, []);

  const checkCameraPermissions = async () => {
    try {
      const status = await navigator.permissions.query({ name: 'camera' as any });
      setPermissionStatus(status.state as 'prompt' | 'granted' | 'denied');
      status.addEventListener('change', () => {
        setPermissionStatus(status.state as 'prompt' | 'granted' | 'denied');
      });
    } catch (err) {
      console.warn('Permission query not supported', err);
    }
  };

  // Start camera
  const startCamera = async () => {
    setCameraError(null);
    setStage('permission');
    setFaceDetected(false);
    setCapturedImage(null);
    setResult(null);
    setConfidence(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      streamRef.current = stream;
      setStage('camera');
      setPermissionStatus('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          const playPromise = videoRef.current.play();
          if (playPromise && typeof (playPromise as any).then === 'function') {
            await playPromise;
          }
        } catch (playErr) {
          console.error('video.play() failed:', playErr);
          setCameraError(
            `Camera started but preview did not play automatically.\nReason: ${(playErr as any)?.message ?? String(playErr)}\nTry: click the Start Camera button again or interact with the page.`
          );
        }
        startFaceDetection();
      }
    } catch (err: any) {
      console.error('Camera error:', err);

      if (err.name === 'NotAllowedError') {
        setPermissionStatus('denied');
        setCameraError(
          'Camera access denied. Please allow camera permissions in your browser settings:\n1. Click the camera/lock icon in your address bar\n2. Find "Camera" in permissions\n3. Change to "Allow"\n4. Refresh and try again'
        );
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found. Please connect a camera and try again.');
      } else if (err.name === 'NotSupportedError') {
        setCameraError('QR scanning is not supported on your browser or device.');
      } else {
        setCameraError('Failed to access camera. Please check your device settings.');
      }

      setStage('ready');
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Simple face detection (kept for UI feedback)
  const detectFace = (imageData: ImageData): { detected: boolean; x: number; y: number; width: number; height: number } => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    let skinPixels = 0;
    let minX = width, maxX = 0, minY = height, maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const isSkin = (
          r > 95 && g > 40 && b > 20 &&
          r > g && r > b &&
          Math.abs(r - g) > 15 &&
          r - g > 15 && r - b > 15
        );

        if (isSkin) {
          skinPixels++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const totalPixels = width * height;
    const skinRatio = skinPixels / totalPixels;
    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;

    const detected = skinRatio > 0.05 && skinRatio < 0.5 &&
      faceWidth > width * 0.15 && faceHeight > height * 0.15 &&
      faceWidth < width * 0.8 && faceHeight < height * 0.8;

    return {
      detected,
      x: minX,
      y: minY,
      width: faceWidth,
      height: faceHeight
    };
  };

  const startFaceDetection = () => {
    const detect = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx || video.readyState !== 4) {
        animationRef.current = requestAnimationFrame(detect);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const faceResult = detectFace(imageData);

      setFaceDetected(faceResult.detected);

      if (faceResult.detected) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.strokeRect(faceResult.x, faceResult.y, faceResult.width, faceResult.height);
      }

      animationRef.current = requestAnimationFrame(detect);
    };

    detect();
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    setStage('captured');
    stopCamera();
  };

  // --- Updated analyzeAndCompare: uses api.postForm ---
  const analyzeAndCompare = async () => {
    setStage('analyzing');
    setAnalysisDetails([]);

    try {
      setAnalysisDetails(prev => [...prev, '⏳ Preparing selfie for verification...']);

      if (!canvasRef.current) {
        setAnalysisDetails(prev => [...prev, '✗ Capture canvas not available']);
        setResult('failed');
        setStage('result');
        return;
      }

      // Get the selfie image as a blob
      const canvas = canvasRef.current;
      const selfieBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
      });

      setAnalysisDetails(prev => [...prev, '✓ Selfie captured, sending to backend for verification...']);

      // Get CNIC image blob
      let cnicBlob: Blob | null = null;
      if (cnicImage) {
        try {
          const response = await fetch(cnicImage);
          cnicBlob = await response.blob();
        } catch (e) {
          setAnalysisDetails(prev => [...prev, '⚠️ Could not retrieve CNIC image, sending selfie only']);
        }
      }

      // Prepare FormData
      const formData = new FormData();
      formData.append('selfie', selfieBlob, 'selfie.jpg');
      if (cnicBlob) {
        formData.append('cnic', cnicBlob, 'cnic.jpg');
      }
      formData.append('userId', currentUser.id);

      setAnalysisDetails(prev => [...prev, '📤 Uploading to backend...']);

      // ✅ Use api.postForm for multipart upload
      const response = await api.postForm<{ match: boolean; confidence: number; details?: string }>(
        '/face/verify',
        formData
      );

      setAnalysisDetails(prev => [...prev, '✅ Verification completed.']);

      setConfidence(response.confidence);
      if (response.match) {
        setResult('match');
        setAnalysisDetails(prev => [...prev, `✅ VERIFICATION PASSED — ${response.confidence}% confidence`]);
      } else {
        setResult('failed');
        setAnalysisDetails(prev => [...prev, `❌ VERIFICATION FAILED — ${response.confidence}% confidence`]);
      }
    } catch (err) {
      console.error('Face verification error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setAnalysisDetails(prev => [...prev, `✗ Error: ${errorMsg}`]);
      setResult('failed');
    }

    setStage('result');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const reset = () => {
    stopCamera();
    setCapturedImage(null);
    setResult(null);
    setConfidence(0);
    setFaceDetected(false);
    setAnalysisDetails([]);
    setCameraError(null);
    setStage('ready');
  };

  if (alreadyVerified) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Face Verification</h2>
          <p className="text-gray-400 mt-1">Live selfie capture and CNIC photo comparison</p>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center"
        >
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-green-400">Face Verification Complete</h3>
          <p className="text-gray-400 mt-2">Your identity has been verified successfully</p>
        </motion.div>
      </div>
    );
  }

  // --- JSX (unchanged) ---
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Face Verification</h2>
        <p className="text-gray-400 mt-1">Live selfie capture with browser-based face presence checks</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-400" />
              <span className="font-medium text-sm">Live Camera</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                stage === 'camera' ? (faceDetected ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-600'
              } ${stage === 'camera' ? 'animate-pulse' : ''}`} />
              <span className="text-xs text-gray-500">
                {stage === 'camera' ? (faceDetected ? 'Face Detected' : 'No Face') : 
                 stage === 'captured' ? 'Photo Captured' :
                 stage === 'analyzing' || stage === 'comparing' ? 'Processing...' :
                 stage === 'result' ? (result === 'match' ? 'Verified' : 'Failed') : 'Standby'}
              </span>
            </div>
          </div>

          <div className="aspect-4/3 bg-gray-800 relative flex items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} className="hidden" />
            
            {stage === 'ready' && (
              <div className="text-center p-6">
                {permissionStatus === 'denied' ? (
                  <>
                    <AlertTriangle className="w-24 h-24 text-orange-400 mx-auto mb-4" />
                    <h3 className="font-semibold text-orange-400 mb-2">Camera Permission Denied</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Please allow camera access in your browser settings:
                    </p>
                    <div className="text-left bg-gray-800/50 rounded-lg p-4 mb-4 text-xs text-gray-300 space-y-2">
                      <p>1. Click the camera/lock icon in your address bar</p>
                      <p>2. Find "Camera" in the permissions list</p>
                      <p>3. Change it to "Allow"</p>
                      <p>4. Refresh the page and try again</p>
                    </div>
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white transition"
                    >
                      Reload Page
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-24 h-24 rounded-full bg-gray-700/50 flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-600">
                      <User className="w-12 h-12 text-gray-500" />
                    </div>
                    <p className="text-gray-400 text-sm">Click the button below to start camera</p>
                    <p className="text-gray-500 text-xs mt-1">Ensure good lighting and face the camera directly</p>
                    
                    {cameraError && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                          <AlertTriangle className="w-4 h-4" />
                          {cameraError}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            
            {stage === 'camera' && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-48 h-60 border-2 rounded-[50%] transition-colors ${
                    faceDetected ? 'border-green-500' : 'border-white/30'
                  }`} />
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className={`text-sm font-medium px-4 py-2 rounded-lg inline-block ${
                    faceDetected ? 'bg-green-500/20 text-green-400' : 'bg-gray-900/80 text-white'
                  }`}>
                    {faceDetected ? '✓ Face detected - Ready to capture!' : 'Position your face in the oval'}
                  </p>
                </div>
              </>
            )}
            
            {(stage === 'captured' || stage === 'analyzing' || stage === 'comparing' || stage === 'result') && capturedImage && (
              <div className="absolute inset-0">
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                
                {(stage === 'analyzing' || stage === 'comparing') && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                      <div className="relative w-24 h-24 mx-auto mb-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          className="absolute inset-0 border-4 border-blue-500/30 border-t-blue-500 rounded-full"
                        />
                        <ScanFace className="absolute inset-0 m-auto w-10 h-10 text-blue-400" />
                      </div>
                      <p className="text-blue-400 font-medium">
                        {stage === 'analyzing' ? 'Analyzing face...' : 'Comparing with CNIC...'}
                      </p>
                    </div>
                  </div>
                )}
                
                {stage === 'result' && (
                  <div className={`absolute inset-0 flex items-center justify-center ${
                    result === 'match' ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center"
                    >
                      {result === 'match' ? (
                        <>
                          <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-3" />
                          <p className="text-green-400 font-bold text-xl">Face Match!</p>
                          <p className="text-white text-sm mt-1">{confidence}% confidence</p>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-20 h-20 text-red-400 mx-auto mb-3" />
                          <p className="text-red-400 font-bold text-xl">Verification Failed</p>
                          <p className="text-white text-sm mt-1">Face does not match CNIC</p>
                        </>
                      )}
                    </motion.div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-800 flex gap-3">
            {stage === 'ready' && (
              <>
                {permissionStatus === 'denied' ? (
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 py-3 bg-linear-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-xl font-medium flex items-center justify-center gap-2 transition text-white"
                  >
                    <AlertTriangle className="w-5 h-5" /> Reload to Allow Camera
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="flex-1 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-medium flex items-center justify-center gap-2 transition text-white"
                  >
                    <Camera className="w-5 h-5" /> Start Camera
                  </button>
                )}
              </>
            )}
            
            {stage === 'camera' && (
              <>
                <button
                  onClick={() => { stopCamera(); setStage('ready'); }}
                  className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition text-white"
                >
                  <X className="w-5 h-5" />
                </button> 
                <button
                  onClick={capturePhoto}
                  disabled={!faceDetected}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  <Camera className="w-5 h-5" /> Capture Photo
                </button>
              </>
            )}
            
            {stage === 'captured' && (
              <>
                <button
                  onClick={reset}
                  className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium flex items-center gap-2 transition text-white"
                >
                  <RefreshCw className="w-5 h-5" /> Retake
                </button>
                <button
                  onClick={analyzeAndCompare}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-medium flex items-center justify-center gap-2 transition text-white"
                >
                  <ScanFace className="w-5 h-5" /> Verify Face
                </button>
              </>
            )}
            
            {stage === 'result' && (
              <button
                onClick={reset}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium flex items-center justify-center gap-2 transition text-white"
              >
                <RefreshCw className="w-5 h-5" /> Try Again
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              CNIC Reference Photo
            </h4>
            <div className="aspect-3/2 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700 overflow-hidden">
              {cnicImage ? (
                <img src={cnicImage} alt="CNIC" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <span className="text-4xl">🪪</span>
                  <p className="text-sm text-gray-400 mt-2">CNIC Photo Loaded</p>
                  <p className="text-xs text-gray-500">{currentUser.cnicNumber || 'From uploaded documents'}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h4 className="font-semibold mb-3">Verification Process</h4>
            <div className="space-y-3">
              {[
                { label: 'Open Camera', desc: 'WebRTC camera access', done: stage !== 'ready' },
                { label: 'Capture Selfie', desc: 'Take a clear photo', done: stage === 'captured' || stage === 'analyzing' || stage === 'comparing' || stage === 'result' },
                { label: 'Analyze Face', desc: 'Extract facial features (backend)', done: stage === 'comparing' || stage === 'result' },
                { label: 'Compare Faces', desc: 'Match with CNIC photo', done: stage === 'result' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                    step.done ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  <div>
                    <p className={`text-sm transition-colors ${step.done ? 'text-white' : 'text-gray-500'}`}>{step.label}</p>
                    <p className="text-[10px] text-gray-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {analysisDetails.length > 0 && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <h4 className="font-semibold mb-3">Analysis Log</h4>
              <div className="space-y-1.5 font-mono text-xs">
                {analysisDetails.map((detail, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={detail.includes('✓') ? 'text-green-400' : 'text-red-400'}
                  >
                    {detail}
                  </motion.p>
                ))}
              </div>
            </div>
          )}

          {stage === 'result' && result === 'match' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center"
            >
              <p className="text-green-400 font-medium">✓ Verification Successful</p>
              <p className="text-xs text-gray-400 mt-1">Your face has been verified against your CNIC photo</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}