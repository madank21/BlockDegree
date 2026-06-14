import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, CheckCircle2, Camera } from 'lucide-react';
import Html5Qrcode from 'html5-qrcode';

interface Props {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: Props) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader-' + Math.random().toString(36).slice(2, 9);

  useEffect(() => {
    // Check camera permissions status
    checkCameraPermissions();
    return () => {
      stopScanner();
    };
  }, []);

  const checkCameraPermissions = async () => {
    try {
      const status = await navigator.permissions.query({ name: 'camera' as any });
      setPermissionStatus(status.state as 'prompt' | 'granted' | 'denied');
      
      status.addEventListener('change', () => {
        setPermissionStatus(status.state as 'prompt' | 'granted' | 'denied');
      });

      if (status.state === 'granted') {
        startScanner();
      }
    } catch (err) {
      console.warn('Permission query not supported, attempting direct access', err);
      startScanner();
    }
  };

  const startScanner = async () => {
    try {
      setError(null);
      scannerRef.current = new Html5Qrcode(containerId);

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          setScanned(decodedText);
          stopScanner();
          onScan(decodedText);
        },
        (err) => {
          // Ignore scanning errors
          if (!err.toString().includes('NotFoundException')) {
            console.warn('QR Scan error:', err);
          }
        }
      );

      setScanning(true);
      setPermissionStatus('granted');
    } catch (err: any) {
      const errorMsg =
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permissions in your browser settings and try again.'
          : err.name === 'NotFoundError'
          ? 'No camera found on your device. Please connect a camera and try again.'
          : err.name === 'NotSupportedError'
          ? 'QR scanning is not supported on your browser or device.'
          : `Camera error: ${err.message || 'Unknown error'}`;

      setError(errorMsg);
      setScanning(false);
      
      if (err.name === 'NotAllowedError') {
        setPermissionStatus('denied');
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setScanning(false);
  };

  const handleRetry = async () => {
    setScanned(null);
    await startScanner();
  };

  const requestCameraPermission = async () => {
    await startScanner();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scanner Container */}
        <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Scan QR Code</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Scanner Area */}
          <div className="p-6">
            {permissionStatus === 'denied' ? (
              <div className="text-center">
                <AlertTriangle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-orange-400 mb-2">Camera Permission Denied</h3>
                <p className="text-gray-400 text-sm mb-6">
                  This browser doesn't have permission to access your camera. Please:
                </p>
                <div className="text-left bg-gray-800/50 rounded-lg p-4 mb-6 text-sm text-gray-300 space-y-2">
                  <p>1. Click the camera/lock icon in your browser address bar</p>
                  <p>2. Find "Camera" in the permissions list</p>
                  <p>3. Change it to "Allow"</p>
                  <p>4. Refresh the page and try again</p>
                </div>
                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white transition mb-3"
                >
                  Reload Page
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-white transition"
                >
                  Cancel
                </button>
              </div>
            ) : error && permissionStatus !== 'granted' ? (
              <div className="text-center">
                <Camera className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Request Camera Access</h3>
                <p className="text-gray-400 text-sm mb-6">
                  We need access to your camera to scan QR codes on degree certificates.
                </p>
                <button
                  onClick={requestCameraPermission}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white transition mb-3"
                >
                  Allow Camera Access
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-white transition"
                >
                  Cancel
                </button>
              </div>
            ) : error ? (
              <div className="text-center">
                <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-400 mb-2">Camera Error</h3>
                <p className="text-gray-400 text-sm mb-6">{error}</p>
                <button
                  onClick={handleRetry}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white transition"
                >
                  Try Again
                </button>
              </div>
            ) : scanned ? (
              <div className="text-center">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4 animate-bounce" />
                <h3 className="text-lg font-semibold text-green-400 mb-2">QR Code Scanned!</h3>
                <div className="bg-gray-800/50 rounded-lg p-4 mb-6 break-all">
                  <p className="text-xs text-gray-400 mb-2">Scanned Data:</p>
                  <p className="text-sm text-gray-200 font-mono">{scanned}</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium text-white transition"
                >
                  Close
                </button>
              </div>
            ) : scanning ? (
              <div>
                <div
                  id={containerId}
                  className="w-full rounded-xl overflow-hidden mb-4 bg-gray-800 aspect-square flex items-center justify-center"
                />
                <div className="text-center text-sm text-gray-400">
                  <div className="animate-pulse mb-2">📷 Scanning for QR code...</div>
                  <p>Position QR code within the frame</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="aspect-square bg-gray-800 rounded-xl flex items-center justify-center mb-4">
                  <div className="animate-spin">
                    <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">Initializing scanner...</p>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="bg-gray-800/30 border-t border-gray-800 px-6 py-4 text-xs text-gray-500 text-center">
            {scanning && !scanned && (
              <>
                <p className="mb-2">💡 Point camera at QR code on degree certificate</p>
                <button
                  onClick={() => {
                    stopScanner();
                    onClose();
                  }}
                  className="text-red-400 hover:text-red-300 transition"
                >
                  Cancel Scan
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
