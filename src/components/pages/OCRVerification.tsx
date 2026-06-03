import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Upload, ScanEye, Loader2, CheckCircle, XCircle, AlertTriangle, FileText, Zap } from 'lucide-react';
import { generateHash } from '../../store';
import type { OCRResult, YOLODetection } from '../../types';

export default function OCRVerification() {
  const { currentUser, degrees, verifyDegreeByHash, addFraudReport } = useApp();
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [yoloResult, setYoloResult] = useState<YOLODetection | null>(null);
  const [verificationResult, setVerificationResult] = useState<'VALID' | 'INVALID' | 'REVOKED' | null>(null);
  const [mode, setMode] = useState<'genuine' | 'fake'>('genuine');

  const processDocument = async () => {
    setProcessing(true);
    setOcrResult(null);
    setYoloResult(null);
    setVerificationResult(null);

    // Step 1: OCR Processing
    setCurrentStep(1);
    await new Promise(r => setTimeout(r, 1500));

    let ocr: OCRResult;
    if (mode === 'genuine') {
      // Pick a random real degree
      const degree = degrees.find(d => d.status === 'ACTIVE') || degrees[0];
      ocr = {
        studentName: degree.studentName,
        studentId: degree.studentId,
        program: degree.program,
        university: degree.university,
        graduationDate: degree.graduationDate,
        confidence: 94.7,
        extractedHash: degree.degreeHash,
      };
    } else {
      ocr = {
        studentName: 'John Fake',
        studentId: 'STU-FAKE-999',
        program: 'BS Fraudulent Studies',
        university: 'Nonexistent University',
        graduationDate: '2024-01-01',
        confidence: 67.3,
        extractedHash: generateHash('John Fake|STU-FAKE-999|BS Fraudulent Studies|Nonexistent University|2024-01-01'),
      };
    }
    setOcrResult(ocr);

    // Step 2: YOLO Detection
    setCurrentStep(2);
    await new Promise(r => setTimeout(r, 1800));

    let yolo: YOLODetection;
    if (mode === 'genuine') {
      yolo = {
        logoDetected: true,
        logoConfidence: 96.2,
        stampDetected: true,
        stampConfidence: 91.8,
        signatureDetected: true,
        signatureConfidence: 89.5,
        qrDetected: true,
        qrConfidence: 98.1,
        overallFraudScore: 8,
        verdict: 'GENUINE',
      };
    } else {
      yolo = {
        logoDetected: false,
        logoConfidence: 12.3,
        stampDetected: false,
        stampConfidence: 8.7,
        signatureDetected: true,
        signatureConfidence: 45.2,
        qrDetected: false,
        qrConfidence: 0,
        overallFraudScore: 85,
        verdict: 'FRAUDULENT',
      };
    }
    setYoloResult(yolo);

    // Step 3: Blockchain Verification
    setCurrentStep(3);
    await new Promise(r => setTimeout(r, 1200));

    const res = verifyDegreeByHash(ocr.extractedHash, currentUser?.name || 'Unknown');
    setVerificationResult(res.result);

    // If fraudulent, add fraud report
    if (yolo.verdict === 'FRAUDULENT') {
      addFraudReport({
        id: `fraud-${Date.now()}`,
        fileName: fileName || 'uploaded_document.pdf',
        reason: `Missing ${[!yolo.logoDetected && 'logo', !yolo.stampDetected && 'stamp', !yolo.qrDetected && 'QR code'].filter(Boolean).join(', ')}`,
        timestamp: new Date().toISOString(),
        riskScore: yolo.overallFraudScore,
        details: {
          logoDetected: yolo.logoDetected,
          stampDetected: yolo.stampDetected,
          signatureDetected: yolo.signatureDetected,
          qrDetected: yolo.qrDetected,
        },
      });
    }

    setCurrentStep(4);
    setProcessing(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const steps = [
    { label: 'OCR Processing', desc: 'Tesseract.js extracting text fields' },
    { label: 'YOLO Detection', desc: 'YOLOv8 analyzing document elements' },
    { label: 'Blockchain Verify', desc: 'Comparing hash with smart contract' },
    { label: 'Complete', desc: 'Analysis finished' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Mode Selector */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4 backdrop-blur">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-medium">Simulation Mode</p>
        <div className="flex gap-3">
          <button
            onClick={() => { setMode('genuine'); setFileName(''); setOcrResult(null); setYoloResult(null); setVerificationResult(null); setCurrentStep(0); }}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition cursor-pointer ${mode === 'genuine' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-gray-900/50 border border-gray-700/50 text-gray-400 hover:text-gray-300'}`}
          >
            ✅ Genuine Degree
          </button>
          <button
            onClick={() => { setMode('fake'); setFileName(''); setOcrResult(null); setYoloResult(null); setVerificationResult(null); setCurrentStep(0); }}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition cursor-pointer ${mode === 'fake' ? 'bg-red-500/20 border border-red-500/50 text-red-400' : 'bg-gray-900/50 border border-gray-700/50 text-gray-400 hover:text-gray-300'}`}
          >
            ❌ Fake Degree (Fraud Test)
          </button>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white">
            <ScanEye className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI-Powered OCR Verification</h2>
            <p className="text-sm text-gray-400">Upload degree document for OCR + YOLO + Blockchain verification</p>
          </div>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition ${
            dragActive ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-300 font-medium mb-1">
            {fileName ? fileName : 'Drop degree document here'}
          </p>
          <p className="text-sm text-gray-500 mb-4">Supports PDF, JPG, PNG</p>
          <label className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm transition cursor-pointer">
            <FileText className="w-4 h-4" />
            Browse Files
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileInput} />
          </label>
        </div>

        <button
          onClick={processDocument}
          disabled={processing}
          className="w-full mt-4 py-3.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-400 hover:to-pink-500 transition shadow-lg shadow-purple-500/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing with AI...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Start AI Verification Pipeline
            </>
          )}
        </button>
      </div>

      {/* Processing Steps */}
      {currentStep > 0 && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
          <h3 className="text-sm font-semibold text-white mb-4">AI Pipeline Progress</h3>
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                {currentStep > i + 1 ? (
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                ) : currentStep === i + 1 && processing ? (
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin shrink-0" />
                ) : currentStep === i + 1 && !processing ? (
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-gray-700 shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-medium ${currentStep >= i + 1 ? 'text-gray-200' : 'text-gray-600'}`}>{s.label}</p>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OCR Results */}
      {ocrResult && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ScanEye className="w-5 h-5 text-purple-400" />
            OCR Extraction Results
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">Tesseract.js</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { label: 'Student Name', value: ocrResult.studentName },
              { label: 'Student ID', value: ocrResult.studentId },
              { label: 'Program', value: ocrResult.program },
              { label: 'University', value: ocrResult.university },
              { label: 'Graduation Date', value: ocrResult.graduationDate },
              { label: 'OCR Confidence', value: `${ocrResult.confidence}%` },
            ].map(item => (
              <div key={item.label} className="p-3 bg-gray-900/60 rounded-xl">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-sm text-white font-medium">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-gray-900/60 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Generated Hash (SHA-256)</p>
            <code className="text-xs text-cyan-400 font-mono break-all">{ocrResult.extractedHash}</code>
          </div>
        </div>
      )}

      {/* YOLO Results */}
      {yoloResult && (
        <div className={`rounded-2xl p-6 backdrop-blur border ${
          yoloResult.verdict === 'GENUINE'
            ? 'bg-green-500/5 border-green-500/30'
            : yoloResult.verdict === 'SUSPICIOUS'
            ? 'bg-yellow-500/5 border-yellow-500/30'
            : 'bg-red-500/5 border-red-500/30'
        }`}>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            🎯 YOLO Object Detection
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">YOLOv8</span>
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'University Logo', detected: yoloResult.logoDetected, conf: yoloResult.logoConfidence },
              { label: 'Official Stamp', detected: yoloResult.stampDetected, conf: yoloResult.stampConfidence },
              { label: 'Signature', detected: yoloResult.signatureDetected, conf: yoloResult.signatureConfidence },
              { label: 'QR Code', detected: yoloResult.qrDetected, conf: yoloResult.qrConfidence },
            ].map(item => (
              <div key={item.label} className="p-3 bg-gray-900/60 rounded-xl text-center">
                <div className="text-2xl mb-1">{item.detected ? '✅' : '❌'}</div>
                <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                <p className={`text-sm font-bold ${item.detected ? 'text-green-400' : 'text-red-400'}`}>
                  {item.conf.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>

          {/* Fraud Score */}
          <div className="p-4 bg-gray-900/60 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Fraud Risk Score</span>
              <span className={`text-lg font-bold ${
                yoloResult.overallFraudScore < 30 ? 'text-green-400' :
                yoloResult.overallFraudScore < 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {yoloResult.overallFraudScore}/100
              </span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  yoloResult.overallFraudScore < 30 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                  yoloResult.overallFraudScore < 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                  'bg-gradient-to-r from-red-500 to-red-400'
                }`}
                style={{ width: `${yoloResult.overallFraudScore}%` }}
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              {yoloResult.verdict === 'GENUINE' ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-sm font-bold ${yoloResult.verdict === 'GENUINE' ? 'text-green-400' : 'text-red-400'}`}>
                Verdict: {yoloResult.verdict}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Final Blockchain Result */}
      {verificationResult && (
        <div className={`rounded-2xl p-6 backdrop-blur border ${
          verificationResult === 'VALID' ? 'bg-green-500/10 border-green-500/30' :
          verificationResult === 'REVOKED' ? 'bg-red-500/10 border-red-500/30' :
          'bg-orange-500/10 border-orange-500/30'
        }`}>
          <div className="flex items-center gap-3">
            {verificationResult === 'VALID' ? (
              <CheckCircle className="w-10 h-10 text-green-400" />
            ) : verificationResult === 'REVOKED' ? (
              <AlertTriangle className="w-10 h-10 text-red-400" />
            ) : (
              <XCircle className="w-10 h-10 text-orange-400" />
            )}
            <div>
              <h3 className={`text-2xl font-bold ${
                verificationResult === 'VALID' ? 'text-green-400' :
                verificationResult === 'REVOKED' ? 'text-red-400' : 'text-orange-400'
              }`}>
                Final Result: {verificationResult}
              </h3>
              <p className="text-sm text-gray-400">
                {verificationResult === 'VALID' ? 'Degree is verified and authentic on blockchain' :
                 verificationResult === 'REVOKED' ? 'Degree has been revoked by issuing university' :
                 'No matching degree found on blockchain — potential fraud'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
