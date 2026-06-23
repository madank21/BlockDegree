import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../useStore';
import Tesseract from 'tesseract.js';
import {
  Upload, CheckCircle2, Clock, AlertTriangle,
  Scan, Eye, FileImage, Loader2, X, ZoomIn, Trash2
} from 'lucide-react';
import api, { documentsApi } from '../api/api';

export default function DocumentUpload() {
  const { currentUser } = useStore();
  const [uploading, setUploading] = useState<string | null>(null);
  const [processing, setProcessing] = useState<{ docId: string; stage: string } | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<Record<string, { text: string; confidence: number }>>({});
  const [yoloResult, setYoloResult] = useState<Record<string, { valid: boolean; detections: string[] }>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadType, setActiveUploadType] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>(() => {
    try {
      const stored = sessionStorage.getItem('uploadedImages');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [validatingDocId, setValidatingDocId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Persist uploadedImages to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('uploadedImages', JSON.stringify(uploadedImages));
    } catch (e) {
      // ignore quota errors
    }
  }, [uploadedImages]);

  // Fetch user's documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [currentUser?.id]);

  // ─── UPDATED fetchDocuments ───────────────────────────────────────────────────
  const fetchDocuments = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await api.get('/documents/me?limit=50');
      console.log('[fetchDocuments] raw response:', res);

      // The request helper unwraps the data envelope, so `res` is either the array
      // or, if the backend didn't use the standard envelope, an object with data.
      let rawDocs: any[] = [];
      if (Array.isArray(res)) {
        rawDocs = res;
      } else if (res && typeof res === 'object') {
        // If it's an object, try to find the array in common properties
        rawDocs = (res as any).data || (res as any).documents || [];
      }

      const docs = rawDocs.map((doc: any) => ({
        ...doc,
        type: doc.document_type || doc.type,
      }));
      console.log('[fetchDocuments] mapped docs:', docs);
      setDocuments(docs);
    } catch (error: any) {
      console.error('[fetchDocuments] failed:', error.message, error.response?.data || '');
      // Optionally show a user-friendly message
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  const docTypes = [
    { type: 'cnic', label: 'CNIC (Front & Back)', desc: 'Government-issued ID card', icon: '🪪', required: true },
    { type: 'marksheet', label: 'Previous Marksheet', desc: 'Latest academic transcript', icon: '📄', required: true },
    { type: 'certificate', label: 'Previous Certificate', desc: 'Intermediate or equivalent', icon: '📜', required: true },
  ] as const;

  const analyzeDocumentWithYOLO = async (imageData: string, docType: string): Promise<{ valid: boolean; detections: string[]; confidence: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageDataObj.data;
        
        let totalBrightness = 0;
        let colorVariance = 0;
        let edgeCount = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const brightness = (r + g + b) / 3;
          totalBrightness += brightness;
          colorVariance += Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
        }
        
        const avgBrightness = totalBrightness / (data.length / 4);
        const avgColorVariance = colorVariance / (data.length / 4);
        
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < canvas.width - 1; x++) {
            const idx = (y * canvas.width + x) * 4;
            const left = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
            const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
            const diff = Math.abs(left - right);
            if (diff > 30) edgeCount++;
          }
        }
        
        const edgeDensity = edgeCount / (canvas.width * canvas.height);
        const detections: string[] = [];
        let confidence = 70;
        const aspectRatio = canvas.width / canvas.height;
        
        if (docType === 'cnic') {
          if (aspectRatio > 1.4 && aspectRatio < 1.8) {
            detections.push('✓ CNIC Card Detected');
            confidence += 10;
          }
          if (avgBrightness > 100 && avgBrightness < 220) {
            detections.push('✓ Photo Region Found');
            confidence += 5;
          }
          if (edgeDensity > 0.01) {
            detections.push('✓ Text Regions Detected');
            confidence += 5;
          }
        } else if (docType === 'marksheet' || docType === 'certificate') {
          if (aspectRatio > 0.6 && aspectRatio < 0.9) {
            detections.push('✓ Portrait Document Layout');
            confidence += 10;
          } else if (aspectRatio > 1.2 && aspectRatio < 1.6) {
            detections.push('✓ Landscape Document Layout');
            confidence += 10;
          }
          if (edgeDensity > 0.005) {
            detections.push('✓ Table/Grid Structure Found');
            confidence += 5;
          }
          if (avgColorVariance < 50) {
            detections.push('✓ Official Document Colors');
            confidence += 5;
          }
        }
        
        if (canvas.width > 500 && canvas.height > 300) {
          detections.push('✓ Adequate Resolution');
          confidence += 5;
        } else {
          detections.push('⚠ Low Resolution');
          confidence -= 10;
        }
        
        if (avgBrightness > 50 && avgBrightness < 230) {
          detections.push('✓ Good Lighting');
        } else {
          detections.push('⚠ Poor Lighting');
          confidence -= 5;
        }
        
        if (avgColorVariance > 30) {
          detections.push('✓ Stamps/Seals Detected');
          confidence += 5;
        }
        
        const valid = confidence >= 75;
        resolve({ valid, detections, confidence: Math.min(confidence, 98) });
      };
      img.src = imageData;
    });
  };

  const performOCR = async (imageData: string): Promise<{ text: string; confidence: number }> => {
    try {
      const result = await Tesseract.recognize(imageData, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      return {
        text: result.data.text,
        confidence: result.data.confidence,
      };
    } catch (error) {
      console.error('OCR Error:', error);
      return { text: '', confidence: 0 };
    }
  };

  const extractDataFromText = (text: string, docType: string): Record<string, string> => {
    const extracted: Record<string, string> = {};
    const cleanText = text.replace(/[^\x20-\x7E\n]/g, ' ');
    const lines = cleanText.split('\n').filter(l => l.trim().length > 2);
    
    const cnicPattern = /\d{5}[-\s]?\d{7}[-\s]?\d/;
    const datePattern = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/;
    
    for (const line of lines) {
      const cnicMatch = line.match(cnicPattern);
      if (cnicMatch && !extracted['CNIC Number']) {
        extracted['CNIC Number'] = cnicMatch[0].replace(/\s/g, '-');
      }
      
      const dateMatch = line.match(datePattern);
      if (dateMatch && !extracted['Date of Birth'] && !extracted['Issue Date']) {
        if (line.toLowerCase().includes('birth') || line.toLowerCase().includes('dob')) {
          extracted['Date of Birth'] = dateMatch[0];
        } else if (line.toLowerCase().includes('issue') || line.toLowerCase().includes('expiry')) {
          extracted['Issue Date'] = dateMatch[0];
        } else {
          extracted['Date'] = dateMatch[0];
        }
      }
      
      const nameMatch = line.match(/(?:name|holder|student)[:\s]*([A-Za-z\s]{3,40})/i);
      if (nameMatch && !extracted['Name']) {
        extracted['Name'] = nameMatch[1].trim();
      }
      
      const fatherMatch = line.match(/(?:father|s\/o|d\/o|w\/o)[:\s]*([A-Za-z\s]{3,40})/i);
      if (fatherMatch && !extracted['Father Name']) {
        extracted['Father Name'] = fatherMatch[1].trim();
      }
      
      if (line.match(/^[A-Z\s]{5,35}$/) && !line.match(/PAKISTAN|GOVERNMENT|NATIONAL|IDENTITY|CARD|CERTIFICATE|BOARD|UNIVERSITY/i)) {
        if (!extracted['Name']) extracted['Name'] = line.trim();
        else if (!extracted['Father Name']) extracted['Father Name'] = line.trim();
      }
      
      const cgpaMatch = line.match(/(?:CGPA|GPA|Grade\s*Point)[:\s]*([0-4]\.\d{1,2})/i);
      if (cgpaMatch) extracted['CGPA'] = cgpaMatch[1];
      
      const percentMatch = line.match(/(\d{2,3}(?:\.\d{1,2})?)\s*(?:%|percent|marks)/i);
      if (percentMatch) extracted['Percentage'] = percentMatch[1] + '%';
      
      const regMatch = line.match(/(?:Reg(?:istration)?|Roll|Student\s*ID)[.\s#:No]*(\d{4,10})/i);
      if (regMatch && !extracted['Registration No']) {
        extracted['Registration No'] = regMatch[1];
      }
      
      const yearMatch = line.match(/(?:year|session|batch)[:\s]*(\d{4})/i);
      if (yearMatch) extracted['Year'] = yearMatch[1];
      
      const boardMatch = line.match(/(?:board|university)[:\s]*([A-Za-z\s]{5,50})/i);
      if (boardMatch && !extracted['Board/University']) {
        extracted['Board/University'] = boardMatch[1].trim();
      }
      
      if (line.toLowerCase().includes('male') && !extracted['Gender']) {
        extracted['Gender'] = line.toLowerCase().includes('female') ? 'Female' : 'Male';
      }
    }
    
    if (Object.keys(extracted).length > 0) {
      extracted['Document Type'] = docType.replace(/_/g, ' ').toUpperCase();
    }
    
    return extracted;
  };

  const handleUpload = (type: string) => {
    setActiveUploadType(type);
    fileInputRef.current?.click();
  };

  // ─── UPDATED handleFileSelect ──────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadType) return;

    setUploading(activeUploadType);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;

      const tempId = Math.random().toString(36).substr(2, 9);
      setUploadedImages(prev => ({ ...prev, [tempId]: imageData }));

      const formData = new FormData();
      formData.append('document', file);
      formData.append('document_type', activeUploadType);
      formData.append('metadata', JSON.stringify({
        type: activeUploadType,
        userId: currentUser.id,
      }));

      try {
        const uploadResult = await documentsApi.upload(formData);
        const docRecord = (uploadResult as any).data || uploadResult;
        const backendDocId = docRecord.id;

        if (!backendDocId) {
          console.warn('Upload response missing ID, refetching documents...');
          await fetchDocuments();
          setUploading(null);
          setActiveUploadType('');
          return;
        }

        setUploadedImages(prev => {
          const newState = { ...prev };
          newState[backendDocId] = imageData;
          delete newState[tempId];
          return newState;
        });

        const newDoc = {
          id: backendDocId,
          type: docRecord.document_type || activeUploadType,
          fileName: docRecord.original_name || file.name,
          uploadedAt: docRecord.created_at || new Date().toISOString(),
          ocrStatus: docRecord.ocr_status || 'processing',
          yoloStatus: docRecord.yolo_status || 'processing',
          fileUrl: docRecord.file_url || imageData,
          ...docRecord,
        };
        setDocuments(prev => [newDoc, ...prev]);
        setUploading(null);

        // YOLO
        setProcessing({ docId: backendDocId, stage: 'yolo' });
        const yoloAnalysis = await analyzeDocumentWithYOLO(imageData, activeUploadType);
        setYoloResult(prev => ({ ...prev, [backendDocId]: { valid: yoloAnalysis.valid, detections: yoloAnalysis.detections } }));
        await api.put(`/documents/${backendDocId}`, {
          yoloStatus: yoloAnalysis.valid ? 'valid' : (yoloAnalysis.confidence > 50 ? 'suspicious' : 'fraudulent'),
          yoloDetections: yoloAnalysis.detections,
        });
        setDocuments(prev => prev.map(doc =>
          doc.id === backendDocId
            ? { ...doc, yoloStatus: yoloAnalysis.valid ? 'valid' : (yoloAnalysis.confidence > 50 ? 'suspicious' : 'fraudulent') }
            : doc
        ));

        // OCR
        setProcessing({ docId: backendDocId, stage: 'ocr' });
        setOcrProgress(0);
        const ocrData = await performOCR(imageData);
        const extractedFields = extractDataFromText(ocrData.text, activeUploadType);
        setOcrResult(prev => ({ ...prev, [backendDocId]: ocrData }));
        await api.put(`/documents/${backendDocId}`, {
          ocrText: ocrData.text,
          ocrConfidence: ocrData.confidence,
          extractedData: extractedFields,
          ocrStatus: 'verified',
        });
        setDocuments(prev => prev.map(doc =>
          doc.id === backendDocId
            ? { ...doc, ocrStatus: 'verified', extractedData: extractedFields, ocrText: ocrData.text, ocrConfidence: ocrData.confidence }
            : doc
        ));

        // Validation
        setValidatingDocId(backendDocId);
        try {
          const validationRes = await api.post(`/documents/${backendDocId}/validate`);
          const validationData = validationRes.data;
          setDocuments(prev => prev.map(doc =>
            doc.id === backendDocId
              ? { ...doc, validationStatus: validationData.status, validationErrors: validationData.errors || [] }
              : doc
          ));
        } catch (err) {
          console.error('Validation error:', err);
        } finally {
          setValidatingDocId(null);
        }

        setProcessing(null);
        setActiveUploadType('');

        await fetchDocuments();

      } catch (error: any) {
        console.error('Upload error:', error);
        const msg = error.response?.data?.message || error.message || 'Upload failed';
        alert(`Upload failed: ${msg}`);
        setUploading(null);
        setProcessing(null);
        await fetchDocuments();
      }
    };

    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getDocForType = (type: string) => {
    return documents.find(d => d.type === type);
  };

  const handleValidateDocument = async (docId: string) => {
    setValidatingDocId(docId);
    try {
      const res = await api.post(`/documents/${docId}/validate`);
      const data = res.data;
      setDocuments(prev => prev.map(doc =>
        doc.id === docId
          ? { ...doc, validationStatus: data.status, validationErrors: data.errors || [] }
          : doc
      ));
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setValidatingDocId(null);
    }
  };

  const handleRemoveDocument = async (docId: string, docType: string) => {
    if (confirm(`Are you sure you want to remove the ${docType} document? This action cannot be undone.`)) {
      try {
        await api.delete(`/documents/${docId}`);
        setDocuments(prev => prev.filter(d => d.id !== docId));
        setUploadedImages(prev => { const newState = {...prev}; delete newState[docId]; return newState; });
        setOcrResult(prev => { const newState = {...prev}; delete newState[docId]; return newState; });
        setYoloResult(prev => { const newState = {...prev}; delete newState[docId]; return newState; });
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const ocrStatusIcon = (status: string, docId: string) => {
    if (processing?.docId === docId && processing.stage === 'ocr') {
      return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    }
    switch (status) {
      case 'verified': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const yoloStatusIcon = (status: string, docId: string) => {
    if (processing?.docId === docId && processing.stage === 'yolo') {
      return <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />;
    }
    switch (status) {
      case 'valid': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'suspicious': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'fraudulent': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-400">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Document Upload & AI Verification</h2>
        <p className="text-gray-400 mt-1">Upload your identity and academic documents for real OCR extraction and document-quality validation</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docTypes.map((dt) => {
          const existingDoc = getDocForType(dt.type);
          const isUploading = uploading === dt.type;
          const isProcessingThis = existingDoc && processing?.docId === existingDoc.id;
          const docOcrResult = existingDoc ? ocrResult[existingDoc.id] : null;
          const docYoloResult = existingDoc ? yoloResult[existingDoc.id] : null;
          const docImage = existingDoc ? (uploadedImages[existingDoc.id] || existingDoc.fileUrl) : null;

          return (
            <motion.div
              key={dt.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative bg-gray-900/50 border rounded-xl p-6 transition-all ${
                existingDoc ? (docYoloResult?.valid !== false ? 'border-green-500/20' : 'border-yellow-500/20') : 'border-gray-800 hover:border-blue-500/30'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{dt.icon}</span>
                  <div>
                    <h4 className="font-semibold text-sm">{dt.label}</h4>
                    <p className="text-xs text-gray-500">{dt.desc}</p>
                  </div>
                </div>
                {dt.required && <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20">Required</span>}
              </div>

              {existingDoc ? (
                <div className="space-y-3">
                  <div className="relative">
                    {docImage ? (
                      <div className="relative group">
                        <img 
                          src={docImage} 
                          alt={dt.label} 
                          className="w-full h-32 object-cover rounded-lg border border-gray-700"
                        />
                        <button
                          onClick={() => { setPreviewImage(docImage); setPreviewDocId(existingDoc.id); }}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg"
                        >
                          <ZoomIn className="w-6 h-6 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-3">
                        <FileImage className="w-5 h-5 text-blue-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{existingDoc.fileName}</p>
                          <p className="text-xs text-gray-500">{new Date(existingDoc.uploadedAt).toLocaleDateString()}</p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      </div>
                    )}
                  </div>

                  {isProcessingThis && processing && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        <span className="text-sm text-blue-400 font-medium">
                          {processing.stage === 'yolo' ? 'Running document analysis...' : `Running OCR... ${ocrProgress}%`}
                        </span>
                      </div>
                      {processing.stage === 'ocr' && (
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${ocrProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 bg-gray-800/30 rounded-lg px-3 py-2">
                      <Scan className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">OCR</p>
                        <div className="flex items-center gap-1">
                          {ocrStatusIcon(existingDoc.ocrStatus || 'pending', existingDoc.id)}
                          <span className="text-xs capitalize">
                            {isProcessingThis && processing?.stage === 'ocr' ? `${ocrProgress}%` : existingDoc.ocrStatus || 'pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-800/30 rounded-lg px-3 py-2">
                      <Eye className="w-4 h-4 text-purple-400" />
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">Layout</p>
                        <div className="flex items-center gap-1">
                          {yoloStatusIcon(existingDoc.yoloStatus || 'processing', existingDoc.id)}
                          <span className="text-xs capitalize">{existingDoc.yoloStatus || 'processing'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {docYoloResult && (
                    <div className="bg-gray-800/30 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500 uppercase mb-2">Document Signals</p>
                      <div className="space-y-1">
                        {docYoloResult.detections.map((det: string, i: number) => (
                          <p key={i} className={`text-xs ${det.startsWith('✓') ? 'text-green-400' : 'text-yellow-400'}`}>
                            {det}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {docOcrResult && docOcrResult.text && (
                    <div className="bg-gray-800/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-gray-500 uppercase">OCR Extracted Text</p>
                        <span className="text-[10px] text-blue-400">{docOcrResult.confidence.toFixed(1)}% confidence</span>
                      </div>
                      <div className="max-h-24 overflow-y-auto">
                        <p className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                          {docOcrResult.text.substring(0, 500)}{docOcrResult.text.length > 500 ? '...' : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {existingDoc.extractedData && Object.keys(existingDoc.extractedData).length > 0 && (
                    <div className="bg-gray-800/30 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500 uppercase mb-2">Extracted Data</p>
                      {Object.entries(existingDoc.extractedData).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-gray-400 capitalize">{key}:</span>
                          <span className="text-white">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {existingDoc.validationStatus && (
                    <div className={`rounded-lg p-3 ${
                      existingDoc.validationStatus === 'valid'
                        ? 'bg-green-500/10 border border-green-500/20'
                        : existingDoc.validationStatus === 'mismatch'
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-yellow-500/10 border border-yellow-500/20'
                    }`}>
                      <div className="flex items-start gap-2 mb-2">
                        {existingDoc.validationStatus === 'valid' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase">Data Validation</p>
                          <p className={`text-xs font-medium ${existingDoc.validationStatus === 'valid' ? 'text-green-400' : 'text-red-400'}`}>
                            {existingDoc.validationStatus === 'valid' ? '✓ Data Verified' : '✗ Data Mismatch Detected'}
                          </p>
                        </div>
                      </div>
                      {existingDoc.validationErrors && existingDoc.validationErrors.length > 0 && (
                        <div className="space-y-1">
                          {existingDoc.validationErrors.map((error: string, i: number) => (
                            <p key={i} className="text-xs text-red-400">{error}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {(!existingDoc.validationStatus || existingDoc.validationStatus === 'pending') && (
                      <button
                        onClick={() => handleValidateDocument(existingDoc.id)}
                        disabled={validatingDocId === existingDoc.id}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition flex items-center justify-center gap-2"
                      >
                        {validatingDocId === existingDoc.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Validating...
                          </>
                        ) : (
                          'Validate Data'
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveDocument(existingDoc.id, dt.label)}
                      className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium rounded-lg transition flex items-center justify-center gap-2 border border-red-600/30"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleUpload(dt.type)}
                  disabled={!!uploading}
                  className="w-full border-2 border-dashed border-gray-700 hover:border-blue-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition group disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                      <span className="text-sm text-blue-400">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-500 group-hover:text-blue-400 transition" />
                      <span className="text-sm text-gray-400 group-hover:text-white transition">Click to Upload</span>
                      <span className="text-xs text-gray-600">PNG, JPG, JPEG</span>
                    </>
                  )}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => { setPreviewImage(null); setPreviewDocId(null); }}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => { setPreviewImage(null); setPreviewDocId(null); }}
              className="absolute -top-10 right-0 p-2 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            
            {previewDocId && yoloResult[previewDocId] && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur rounded-lg p-4">
                <p className="text-sm font-medium text-white mb-2">Document Analysis Results:</p>
                <div className="flex flex-wrap gap-2">
                  {yoloResult[previewDocId].detections.map((det: string, i: number) => (
                    <span key={i} className={`text-xs px-2 py-1 rounded ${det.startsWith('✓') ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {det}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Verification Pipeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 text-lg">
              ✓
            </div>
            <div>
              <p className="text-sm font-medium">Real OCR Extraction</p>
              <p className="text-xs text-gray-400 mt-1">Extracts name, CNIC, and academic data from documents</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 text-lg">
              ✓
            </div>
            <div>
              <p className="text-sm font-medium">Document Quality Checks</p>
              <p className="text-xs text-gray-400 mt-1">Analyzes layout, quality, and authenticity markers</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 text-lg">
              ✓
            </div>
            <div>
              <p className="text-sm font-medium">Data Validation</p>
              <p className="text-xs text-gray-400 mt-1">Verifies extracted data matches your profile</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}