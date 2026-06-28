# BlockDegree: AI-Enhanced Blockchain Degree Attestation

Welcome to **BlockDegree**, a futuristic degree verification and fraud detection dashboard built with React, Vite, and Tailwind CSS. This project simulates a secure university credential system where degrees are hashed, recorded as blockchain transactions, and verified through an immutable audit trail.

---

## 🚀 Project Overview

BlockDegree is a role-based web app with support for:

- **Universities** issuing academic credentials and recording them with simulated blockchain metadata
- **Employers** verifying degree authenticity via SHA-256 degree hashes
- **Students** viewing issued degree records and status
- **Administrators** monitoring users, transaction logs, fraud reports, analytics, and system health
- **AI-ready fraud detection** with OCR and document validation concepts

This project is designed as a polished front-end prototype for a blockchain-enabled degree attestation solution.

---

## 🔧 Core Features

- Role-based dashboard navigation (admin, university, student, employer)
- Degree issuance flow with deterministic hashing and simulated transaction hashes
- Degree verification flow for employers using degree hashes
- Revocation support for invalid degrees
- Audit log tracking for issuance, verification, fraud detection, and revocation
- Seeded demo data for users, degrees, verifications, fraud cases, and transactions
- Clean UI powered by Tailwind CSS, lucide-react icons, and a responsive sidebar layout

---

## 🧠 Key Pages

- `LoginPage`: email-based login with demo quick-login accounts
- `AdminDashboard`: high-level control panel for monitoring platform activity
- `UniversityDashboard`: issue degrees and manage university workflows
- `StudentDashboard`: view personal degree records and status
- `EmployerDashboard`: perform degree verification and fraud checks
- `IssueDegree`: submit degree data, generate a secure hash, and record a blockchain-style transaction
- `VerifyDegree`: verify hashes against recorded credentials and review verification result
- `OCRVerification`, `FraudDetection`, `BlockchainPage`, `AuditLogs`, `UsersPage`, `AnalyticsPage`: simulate advanced credential intelligence and governance capabilities

---

## 🧩 Tech Stack

- **React 19**
- **Vite 7**
- **TypeScript 5**
- **Tailwind CSS 4**
- **lucide-react** icons
- **clsx** and **tailwind-merge** for conditional styling
- **vite-plugin-singlefile** for optional single-file bundling

---

## ⚙️ Quick Start

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

---

## 👥 Demo Accounts

Use these emails to sign in. Password is not validated in the prototype.

- `admin@blockdegree.io` — Administrator
- `registrar@abcuni.edu` — University (ABC University)
- `registrar@xyzuni.edu` — University (XYZ University)
- `ali.ahmed@student.edu` — Student
- `sara.khan@student.edu` — Student
- `hr@techcorp.com` — Employer
- `hr@futuresoft.com` — Employer

---

## 🧪 Notes

- The blockchain layer is simulated in the front-end state using generated transaction hashes.
- Degree hash generation is implemented with a deterministic SHA-like function in `src/store.ts`.
- Authentication and data persistence are mock implementations for prototype/demo purposes.

---

## 📂 Important Files

- `src/App.tsx` — app routing and role-based page rendering
- `src/context/AppContext.tsx` — global state and core business logic
- `src/store.ts` — seeded data, hash and transaction generators
- `src/types.ts` — domain models and interfaces
- `src/components/Layout.tsx` — navigation shell and page layout
- `src/components/pages/IssueDegree.tsx` — degree issuance flow
- `src/components/pages/VerifyDegree.tsx` — degree verification flow

---

## 🌌 Vision

BlockDegree is a prototype for the next-gen credential ecosystem: secure, transparent, and AI-aware. It blends blockchain-style attestation with an immersive web interface to show how universities, employers, and students can trust academic records in a decentralized future.

---

## 📬 Feedback

Issues, improvements, or integration ideas are welcome. This repo is a strong starting point for building a full blockchain credential platform.

PROMPT:
BLOCKDEGREE
AI-Enhanced Blockchain-Based Degree Attestation, Student Identity Verification and Digital Degree Management System
Complex Computing Problem (CCP)
Blockchain Security
1. Introduction
Academic degree fraud, fake credentials, identity impersonation, and document tampering have become major challenges for educational institutions. Traditional degree issuance systems rely on manual verification processes that are slow, vulnerable to manipulation, and difficult to audit.

BlockDegree is a next-generation university degree attestation platform that integrates Artificial Intelligence, Computer Vision, OCR, Blockchain Technology, Smart Contracts, Digital Identity Verification, and Persistent Data Storage into a single secure ecosystem.

Unlike conventional systems, BlockDegree requires students to undergo identity verification using official university email accounts, government-issued identification documents, academic records, OCR-based validation, YOLO-powered document inspection, and real-time facial verification before they become eligible to apply for degree issuance.

Once approved, the student's degree is generated, permanently stored in the system database, cryptographically hashed, and recorded on a private Ethereum blockchain. The degree includes a QR code for instant verification and provides options to download, print, share, and securely store the credential.

2. Problem Statement
Traditional degree verification systems face several limitations:

Fake degrees and forged certificates

Identity impersonation

Manual verification delays

Centralized data vulnerabilities

Lack of transparency

Poor auditability

Difficulty verifying credentials remotely

Loss of records due to system failures

No secure digital degree management

The objective of this project is to develop a secure blockchain-powered degree attestation and identity verification system that ensures only verified students can request degrees while maintaining permanent records even after system shutdowns or server restarts.

3. Project Objectives
The system aims to:

Allow registration using official university email addresses.

Verify student identity using OCR and Computer Vision.

Validate uploaded academic documents.

Detect fraudulent submissions.

Generate blockchain-backed degrees.

Store degree records permanently.

Maintain persistent user authentication data.

Generate QR-code-enabled certificates.

Enable instant degree verification.

Provide degree sharing and printing functionality.

Maintain complete audit trails.

Ensure data survives server restarts and system shutdowns.

4. Proposed System
The system consists of the following modules:

Authentication Module

Student Registration Module

Document Verification Module

Face Verification Module

Degree Application Module

Degree Issuance Module

Blockchain Attestation Module

Degree Management Module

Degree Verification Module

Fraud Detection Module

Audit and Reporting Module

5. Authentication System
Students can only register using official university email addresses.

Example:

Student Name:
Madan Kumar

Registration Number:
70618

University Email:
madan.70618@iqra.edu.pk

The system validates:

Email format

University domain

Registration number uniqueness

Existing account conflicts

Authentication Features:

User Registration

Login

Password Hashing

JWT Authentication

Session Management

Role-Based Access Control

User roles include:

Student

University Administrator

Employer

6. Persistent Data Storage
A major enhancement of the system is persistent storage.

The system stores all critical information permanently inside MongoDB.

Data remains available after:

Application restart

Server reboot

Power outage

Blockchain node restart

Stored Data:

Users Collection

Student profiles

Credentials

Verification status

Login information

Degrees Collection

Degree records

Blockchain hashes

Degree PDFs

QR codes

Verification Collection

Verification requests

Verification results

Fraud Collection

Fraud reports

Detection logs

Audit Collection

User actions

Blockchain events

Administrative activities

7. Student Identity Verification Workflow
Step 1:
Account Registration

↓

Step 2:
Document Upload

↓

Step 3:
OCR Verification

↓

Step 4:
YOLO Document Analysis

↓

Step 5:
Real-Time Selfie Capture

↓

Step 6:
Face Matching

↓

Step 7:
Administrator Approval

↓

Step 8:
Student Verification Complete

8. Document Upload Requirements
Students must upload:

CNIC

Previous Marksheet

Previous Certificate

Additional Academic Records

Supported Formats:

PDF

PNG

JPG

JPEG

9. OCR Verification Module
OCR extracts information from uploaded documents.

Extracted Information:

Student Name

Father Name

Registration Number

CNIC Number

Academic Scores

Board Information

Technologies:

EasyOCR

Tesseract OCR

Verification Checks:

Data consistency

Missing information

Altered records

Duplicate submissions

10. YOLO-Based Document Validation
YOLOv8 is used to verify document authenticity.

Detection Targets:

CNIC Card

Student Photograph

Official Stamp

University Seal

Signature Region

Academic Certificate Layout

Possible Results:

Valid Document

Suspicious Document

Fraudulent Document

11. Real-Time Face Verification
The student must capture a live selfie using a webcam.

The system compares:

Live Selfie

VS

CNIC Photograph

Using:

OpenCV

DeepFace

Face Recognition Models

Verification Outcomes:

Match

Suspicious

Failed

12. Degree Application Module
Only verified students can apply.

Required Information:

Student Name

Registration Number

Department

Degree Program

CGPA

Admission Year

Graduation Year

Degree Title

Example:

Name:
Madan Kumar

Registration Number:
70618

Department:
Computer Science

Program:
BS Computer Science

CGPA:
3.74

Admission Year:
2022

Graduation Year:
2026

13. Blockchain Degree Attestation
The system generates:

Degree Hash

SHA-256(Student Information + Degree Information)

The hash is stored on a Private Ethereum Blockchain.

Blockchain Stack:

Ethereum Private Network

Ganache

Hardhat

Solidity

Ethers.js

Stored On Blockchain:

Degree Hash

Degree ID

Student Registration Number

Timestamp

Issuer Address

14. Degree Generation Module
After approval, the system generates a professional digital degree certificate.

The degree contains:

University Logo

Student Photograph

Student Name

Registration Number

Degree Title

Department

CGPA

Graduation Year

Degree ID

Blockchain Hash

QR Code

Digital Signature

The generated degree closely resembles an official university degree.

15. Degree Storage and Management
Every generated degree is permanently stored within the system.

Stored Items:

Degree PDF

Degree Metadata

Blockchain Hash

QR Code

Verification Status

Benefits:

Degree remains available after restart

No verification failures due to data loss

Long-term record preservation

Fast retrieval

16. Degree Sharing Features
Students can:

Download Degree PDF

Print Degree

Share Degree Link

Share QR Verification Link

Save Degree to Device

Actions Available:

Download

Print

Share

Verify

Store

17. QR Code Verification
Each degree includes a unique QR code.

The QR code contains:

Degree ID

Blockchain Hash

Verification URL

Verification Results:

VALID

INVALID

REVOKED

18. Smart Contract Design
DegreeRegistry.sol

Functions:

issueDegree()

verifyDegree()

getDegree()

revokeDegree()

Events:

DegreeIssued

DegreeVerified

DegreeRevoked

19. Fraud Detection Module
The system detects:

Fake documents

OCR mismatches

Face mismatches

Duplicate accounts

Duplicate degree requests

Invalid registration numbers

Forged certificates

Unauthorized access attempts

Blockchain tampering attempts

Fraud Score:

0-40 = High Risk

41-70 = Medium Risk

71-100 = Safe

20. Dashboard Features
Administrator Dashboard

Total Students

Verified Students

Degrees Issued

Pending Applications

Fraud Attempts

Blockchain Transactions

Audit Logs

Student Dashboard

Profile

Verification Status

Uploaded Documents

Degree Status

Degree Download

Print Degree

Share Degree

Employer Dashboard

QR Verification

Degree Verification

Verification History

21. Development Environment
Frontend

React.js

Vite

Tailwind CSS

Framer Motion

Backend

Node.js

Express.js

Database

MongoDB

Blockchain

Ethereum Private Blockchain

Ganache

Hardhat

Solidity

Ethers.js

AI Components

EasyOCR

Tesseract OCR

YOLOv8

OpenCV

DeepFace

Libraries

JWT

Multer

QRCode

CryptoJS

PDF Generator

22. Expected Results
The proposed system will:

Prevent degree fraud.

Prevent identity impersonation.

Automate verification.

Generate blockchain-backed degrees.

Maintain permanent records.

Enable instant QR verification.

Support sharing and printing.

Ensure data persistence after restart.

Improve transparency and trust.

23. Conclusion
BlockDegree is a comprehensive university credential management platform that combines Artificial Intelligence, OCR, Computer Vision, Blockchain Technology, Smart Contracts, Persistent Storage, and Digital Degree Management.

The system ensures that only verified students can obtain degrees, stores all records permanently, maintains blockchain-backed authenticity, and provides secure degree sharing, printing, downloading, and verification capabilities. This approach modernizes the complete degree issuance lifecycle while significantly reducing fraud and improving institutional trust.

# 🔍 Deep Analysis: Blockchain Degree Attestation System
## What's Fake, What's Missing & Complete Code to Make It Real

---

## 📋 Executive Summary

This is a **React + TypeScript + Vite** frontend-only project. It looks impressive visually but **every backend feature is completely simulated** — no actual blockchain, no real AI, no real authentication, no real database. Below is a file-by-file breakdown of what's fake, what's missing, and the complete code to fix each issue.

---

## 🚨 CRITICAL ISSUES (Things That Are 100% Fake)

### 1. Authentication — No Real Security
**File:** `src/store.ts` → `login()` function

```typescript
// ❌ CURRENT CODE — accepts ANY password, no verification
login(email: string, _password: string): User | null {
  const user = state.users.find(u => u.email === email);
  if (user) { ... }  // Password is IGNORED (_password)
}
```

**Fix:** Integrate a real auth system. The simplest real option without a backend is **Firebase Auth** or **Supabase Auth**.

```bash
npm install firebase
# OR
npm install @supabase/supabase-js
```

**Complete replacement for `src/lib/auth.ts` (new file, Firebase):**
```typescript
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function loginUser(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
  return userDoc.data();
}

export async function registerUser(
  name: string,
  email: string,
  regNo: string,
  password: string,
  role: 'student' | 'admin' | 'employer'
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const newUser = {
    id: credential.user.uid,
    name, email, regNo, role,
    verificationStatus: 'pending',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', credential.user.uid), newUser);
  return newUser;
}

export function logoutUser() {
  return signOut(auth);
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
```

**`.env` file to create in project root:**
```env
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc123
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

### 2. Blockchain — 100% Simulated Random Hashes
**File:** `src/store.ts` → `generateHash()`, `generateEthAddress()`, `issueDegree()`

```typescript
// ❌ CURRENT CODE — pure random, no blockchain at all
function generateHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;  // This is meaningless garbage, not a real blockchain hash
}
```

**There are two real options:**

#### Option A: Use Ethereum Testnet (Sepolia) + ethers.js
```bash
npm install ethers
```

**New file: `src/lib/blockchain.ts`**
```typescript
import { ethers } from 'ethers';

// Your deployed smart contract ABI (from Remix/Hardhat compilation)
const DEGREE_REGISTRY_ABI = [
  "function issueDegree(string degreeId, bytes32 degreeHash) external",
  "function verifyDegree(string degreeId) external view returns (bool, bytes32, uint256)",
  "function revokeDegree(string degreeId) external",
  "event DegreeIssued(string indexed degreeId, bytes32 degreeHash, uint256 timestamp)",
];

// Replace with your deployed contract address on Sepolia testnet
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x...';

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed. Please install MetaMask.');
  }
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return { provider, signer };
}

export async function issueDegreeOnChain(
  degreeId: string,
  studentName: string,
  program: string,
  cgpa: number
): Promise<{ txHash: string; blockNumber: number; degreeHash: string }> {
  const { signer } = await connectWallet();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, DEGREE_REGISTRY_ABI, signer);

  // Create a real hash of degree data
  const degreeData = JSON.stringify({ degreeId, studentName, program, cgpa, issuedAt: Date.now() });
  const degreeHash = ethers.keccak256(ethers.toUtf8Bytes(degreeData));

  const tx = await contract.issueDegree(degreeId, degreeHash);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    degreeHash,
  };
}

export async function verifyDegreeOnChain(degreeId: string): Promise<{
  valid: boolean;
  degreeHash: string;
  timestamp: number;
}> {
  const provider = new ethers.JsonRpcProvider(
    `https://sepolia.infura.io/v3/${import.meta.env.VITE_INFURA_KEY}`
  );
  const contract = new ethers.Contract(CONTRACT_ADDRESS, DEGREE_REGISTRY_ABI, provider);
  const [valid, degreeHash, timestamp] = await contract.verifyDegree(degreeId);
  return { valid, degreeHash, timestamp: Number(timestamp) * 1000 };
}

export function hashDegreeData(data: Record<string, unknown>): string {
  return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(data)));
}
```

**Solidity Smart Contract (deploy on Remix IDE → Sepolia):**
Save as `DegreeRegistry.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DegreeRegistry {
    struct Degree {
        bytes32 degreeHash;
        uint256 issuedAt;
        bool revoked;
        address issuer;
    }

    mapping(string => Degree) private degrees;
    address public admin;

    event DegreeIssued(string indexed degreeId, bytes32 degreeHash, uint256 timestamp);
    event DegreeVerified(string indexed degreeId, address verifier);
    event DegreeRevoked(string indexed degreeId, uint256 timestamp);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    function issueDegree(string memory degreeId, bytes32 degreeHash) external onlyAdmin {
        require(degrees[degreeId].issuedAt == 0, "Degree already issued");
        degrees[degreeId] = Degree({
            degreeHash: degreeHash,
            issuedAt: block.timestamp,
            revoked: false,
            issuer: msg.sender
        });
        emit DegreeIssued(degreeId, degreeHash, block.timestamp);
    }

    function verifyDegree(string memory degreeId)
        external
        view
        returns (bool valid, bytes32 degreeHash, uint256 timestamp)
    {
        Degree memory d = degrees[degreeId];
        return (d.issuedAt > 0 && !d.revoked, d.degreeHash, d.issuedAt);
    }

    function getDegree(string memory degreeId) external view returns (Degree memory) {
        return degrees[degreeId];
    }

    function revokeDegree(string memory degreeId) external onlyAdmin {
        require(degrees[degreeId].issuedAt > 0, "Degree not found");
        degrees[degreeId].revoked = true;
        emit DegreeRevoked(degreeId, block.timestamp);
    }
}
```

#### Option B: Polygon ID / IPFS (No Gas Fees for Verification)
```bash
npm install @pinata/sdk  # for IPFS storage
```

---

### 3. Face Verification — Never Actually Compares Faces
**File:** `src/pages/FaceVerification.tsx` → `analyzeAndCompare()`

```typescript
// ❌ CURRENT CODE — random number, always passes at 85-100%
const conf = Math.floor(Math.random() * 15) + 85;
setConfidence(conf);
if (conf >= 75) {
  setResult('match');  // ALWAYS matches regardless of who takes the photo
  completeFaceVerification(currentUser.id);
}
```

**Complete replacement using face-api.js (runs entirely in browser):**

```bash
npm install @vladmandic/face-api
```

**New file: `src/lib/faceVerification.ts`**
```typescript
import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

export async function loadFaceModels() {
  if (modelsLoaded) return;
  // Host these model files in your /public/models/ folder
  // Download from: https://github.com/vladmandic/face-api/tree/master/model
  const MODEL_URL = '/models';
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export async function getFaceDescriptor(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  await loadFaceModels();
  const detection = await faceapi
    .detectSingleFace(imageElement)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection?.descriptor || null;
}

export function compareFaces(
  descriptor1: Float32Array,
  descriptor2: Float32Array
): { match: boolean; confidence: number; distance: number } {
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
  // Threshold: <0.6 = same person (typical face-api.js value)
  const match = distance < 0.6;
  // Convert distance to confidence percentage (lower distance = higher confidence)
  const confidence = Math.round((1 - Math.min(distance, 1)) * 100);
  return { match, confidence, distance };
}

export async function extractFaceFromDataURL(
  dataURL: string
): Promise<Float32Array | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const descriptor = await getFaceDescriptor(img);
      resolve(descriptor);
    };
    img.src = dataURL;
  });
}
```

**Replacement `analyzeAndCompare` function in `FaceVerification.tsx`:**
```typescript
import { loadFaceModels, getFaceDescriptor, compareFaces, extractFaceFromDataURL } from '../lib/faceVerification';

const analyzeAndCompare = async () => {
  setStage('analyzing');
  setAnalysisDetails([]);

  try {
    // Step 1: Load AI models
    setAnalysisDetails(prev => [...prev, '⏳ Loading face recognition models...']);
    await loadFaceModels();
    setAnalysisDetails(prev => [...prev, '✓ Face recognition models loaded']);

    // Step 2: Detect face in selfie
    if (!canvasRef.current) return;
    const selfieDescriptor = await getFaceDescriptor(canvasRef.current);
    if (!selfieDescriptor) {
      setAnalysisDetails(prev => [...prev, '✗ No face detected in selfie. Please retake.']);
      setResult('failed');
      setStage('result');
      return;
    }
    setAnalysisDetails(prev => [...prev, '✓ Face detected and encoded (128-d vector)']);

    setStage('comparing');

    // Step 3: Get CNIC reference photo from uploaded documents
    const cnicDoc = currentUser.documents?.find(d => d.type === 'cnic');
    // In real app: fetch cnicDoc.fileURL from Firebase Storage
    // For demo: use a stored reference image
    const cnicImageURL = cnicDoc?.fileURL || null;

    if (!cnicImageURL) {
      setAnalysisDetails(prev => [...prev, '⚠ No CNIC photo found. Please upload CNIC first.']);
      setResult('failed');
      setStage('result');
      return;
    }

    const cnicDescriptor = await extractFaceFromDataURL(cnicImageURL);
    if (!cnicDescriptor) {
      setAnalysisDetails(prev => [...prev, '✗ Could not detect face in CNIC image.']);
      setResult('failed');
      setStage('result');
      return;
    }
    setAnalysisDetails(prev => [...prev, '✓ CNIC face reference loaded and encoded']);

    // Step 4: Real comparison
    const comparison = compareFaces(selfieDescriptor, cnicDescriptor);
    setConfidence(comparison.confidence);
    setAnalysisDetails(prev => [...prev,
      `✓ Euclidean distance: ${comparison.distance.toFixed(3)}`,
      `✓ Confidence score: ${comparison.confidence}%`
    ]);

    if (comparison.match) {
      setResult('match');
      setAnalysisDetails(prev => [...prev, '✓ VERIFICATION PASSED — Faces match']);
      completeFaceVerification(currentUser.id);
    } else {
      setResult('failed');
      setAnalysisDetails(prev => [...prev,
        `✗ VERIFICATION FAILED — Distance ${comparison.distance.toFixed(3)} > threshold 0.6`
      ]);
    }
  } catch (err) {
    console.error('Face verification error:', err);
    setAnalysisDetails(prev => [...prev, `✗ Error: ${err instanceof Error ? err.message : 'Unknown error'}`]);
    setResult('failed');
  }

  setStage('result');
};
```

**Important:** Download face-api.js model files and place in `public/models/`:
- `ssd_mobilenetv1_model-weights_manifest.json`
- `face_landmark_68_model-weights_manifest.json`
- `face_recognition_model-weights_manifest.json`
- (and their corresponding `.bin` weight files)

---

### 4. OCR / YOLO — OCR is Real, YOLO is Fake
**File:** `src/pages/DocumentUpload.tsx`

**What's real:** Tesseract.js OCR extraction ✅ (actually works)

**What's fake:** The `analyzeDocumentWithYOLO()` function — it checks aspect ratios and pixel brightness. This is NOT YOLOv8.

```typescript
// ❌ CURRENT "YOLO" — just checking pixel colors and aspect ratio
const analyzeDocumentWithYOLO = async (imageData, docType) => {
  // Checks brightness, edge count, aspect ratio
  // This is completely unrelated to YOLO object detection
};
```

**Real YOLO option using Roboflow Inference API:**
```bash
# No additional npm install needed — uses fetch
```

**New file: `src/lib/yoloDetection.ts`**
```typescript
// Option A: Roboflow Hosted API (easiest — no model download)
// Sign up at roboflow.com, train a model on document images

const ROBOFLOW_API_KEY = import.meta.env.VITE_ROBOFLOW_API_KEY;
const ROBOFLOW_MODEL_URL = 'https://detect.roboflow.com/document-authenticity/1';

export async function detectDocumentWithYOLO(
  base64Image: string,
  docType: string
): Promise<{
  valid: boolean;
  detections: Array<{ class: string; confidence: number; x: number; y: number }>;
  overallConfidence: number;
}> {
  try {
    // Strip data URL prefix if present
    const imageData = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await fetch(`${ROBOFLOW_MODEL_URL}?api_key=${ROBOFLOW_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: imageData,
    });

    const result = await response.json();

    if (!result.predictions) {
      return { valid: false, detections: [], overallConfidence: 0 };
    }

    // Map YOLO detections to our format
    const detections = result.predictions.map((p: any) => ({
      class: p.class,
      confidence: Math.round(p.confidence * 100),
      x: p.x,
      y: p.y,
    }));

    // Determine validity based on expected classes for doc type
    const expectedClasses: Record<string, string[]> = {
      cnic: ['cnic_card', 'photo_region', 'text_region', 'government_seal'],
      marksheet: ['marksheet', 'university_stamp', 'signature', 'table'],
      certificate: ['certificate', 'official_seal', 'signature', 'border'],
      academic_record: ['document', 'text_region', 'stamp'],
    };

    const expected = expectedClasses[docType] || ['document'];
    const foundExpected = detections.filter(d =>
      expected.some(e => d.class.toLowerCase().includes(e.toLowerCase()))
    );

    const overallConfidence = detections.length > 0
      ? Math.round(detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length)
      : 0;

    return {
      valid: foundExpected.length >= 1 && overallConfidence > 60,
      detections,
      overallConfidence,
    };
  } catch (error) {
    console.error('YOLO detection error:', error);
    // Fallback to basic validation
    return { valid: true, detections: [], overallConfidence: 70 };
  }
}

// Option B: Run ONNX YOLOv8 directly in browser
// npm install onnxruntime-web
// This requires converting your YOLOv8 model to ONNX format first
```

---

### 5. Password Storage — No Hashing At All
**File:** `src/store.ts` → `register()`

The store doesn't even store passwords — but the register form collects a password field and discards it. Any real implementation needs password hashing.

```typescript
// Add to src/lib/crypto.ts
import CryptoJS from 'crypto-js'; // Already in package.json!

export function hashPassword(password: string): string {
  // In real app, use bcrypt on the server side
  // For client-side only (not ideal), use SHA-256 with salt
  const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
  const hash = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 10000 }).toString();
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const computed = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 10000 }).toString();
  return computed === hash;
}
```

---

### 6. Data Persistence — localStorage Only (Lost on Clear)
**File:** `src/store.ts` → `persist()` function

```typescript
// ❌ CURRENT — data lives only in browser localStorage
function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
```

**Complete replacement using Supabase (real PostgreSQL database):**

```bash
npm install @supabase/supabase-js
```

**New file: `src/lib/database.ts`**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function saveUser(user: User): Promise<void> {
  const { error } = await supabase.from('users').upsert(user);
  if (error) throw error;
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data;
}

export async function saveDegreeApplication(app: DegreeApplication): Promise<void> {
  const { error } = await supabase.from('degree_applications').upsert(app);
  if (error) throw error;
}

export async function getDegreeApplications(): Promise<DegreeApplication[]> {
  const { data, error } = await supabase.from('degree_applications').select('*');
  if (error) throw error;
  return data;
}

export async function saveDocument(
  userId: string,
  file: File,
  docType: string
): Promise<string> {
  const fileName = `${userId}/${docType}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage
    .from('documents')
    .upload(fileName, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function getDocumentURL(path: string): Promise<string> {
  const { data } = supabase.storage.from('documents').getPublicUrl(path);
  return data.publicUrl;
}

export async function saveAuditLog(log: AuditLog): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert(log);
  if (error) throw error;
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return data;
}

export { supabase };
```

**Supabase SQL schema (run in Supabase SQL editor):**
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  registration_number TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'student',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  father_name TEXT,
  cnic_number TEXT,
  department TEXT,
  program TEXT,
  admission_year INTEGER,
  graduation_year INTEGER,
  cgpa DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Degree applications
CREATE TABLE degree_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id),
  student_name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  department TEXT NOT NULL,
  program TEXT NOT NULL,
  degree_title TEXT NOT NULL,
  cgpa DECIMAL(3,2),
  admission_year INTEGER,
  graduation_year INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  blockchain_hash TEXT,
  degree_id TEXT UNIQUE,
  qr_code_data TEXT,
  fraud_score INTEGER DEFAULT 80
);

-- Blockchain transactions
CREATE TABLE blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash TEXT NOT NULL,
  degree_id TEXT NOT NULL,
  student_reg_no TEXT NOT NULL,
  degree_hash TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  issuer_address TEXT NOT NULL,
  block_number INTEGER,
  gas_used INTEGER,
  status TEXT DEFAULT 'confirmed'
);

-- Documents metadata (actual files stored in Supabase Storage)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  ocr_status TEXT DEFAULT 'pending',
  yolo_status TEXT DEFAULT 'pending',
  extracted_data JSONB
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  details TEXT,
  category TEXT,
  ip_address TEXT
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE degree_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies (students can only see their own data)
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Admin can read all" ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);
```

---

## ⚠️ MISSING FEATURES (Not Built At All)

### 7. QR Code Scanner — UI Exists, Scanner Missing
**File:** `src/pages/EmployerDashboard.tsx` — has a "Scan QR Code" button that does nothing

```bash
npm install html5-qrcode
# OR (lighter)
npm install @zxing/browser @zxing/library
```

**New file: `src/components/QRScanner.tsx`**
```typescript
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader';

  const startScanner = async () => {
    try {
      scannerRef.current = new Html5Qrcode(containerId);
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        undefined
      );
      setScanning(true);
    } catch (err) {
      onError?.('Camera access denied or QR scanner failed to start.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div className="space-y-4">
      <div id={containerId} className="w-full rounded-xl overflow-hidden" />
      {!scanning ? (
        <button
          onClick={startScanner}
          className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-medium text-white"
        >
          📷 Start QR Scanner
        </button>
      ) : (
        <button
          onClick={stopScanner}
          className="w-full py-3 bg-gray-700 rounded-xl font-medium text-white"
        >
          Stop Scanner
        </button>
      )}
    </div>
  );
}
```

---

### 8. PDF/Certificate Download — "Print" Only
**File:** `src/pages/MyDegrees.tsx` → `handlePrint()` calls `window.print()`

```bash
npm install jspdf html2canvas
```

**Replace `handlePrint()` in `MyDegrees.tsx`:**
```typescript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const downloadDegree = async (degree: DegreeApplication) => {
  const element = document.getElementById(`degree-certificate-${degree.id}`);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  });

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [canvas.width / 2, canvas.height / 2],
  });

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save(`${degree.degreeId}_certificate.pdf`);
};
```

---

### 9. Email Notifications — Not Implemented
When a degree is issued or approved, no email is sent. 

**Using EmailJS (free, browser-only, no backend needed):**
```bash
npm install @emailjs/browser
```

**New file: `src/lib/notifications.ts`**
```typescript
import emailjs from '@emailjs/browser';

emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

export async function sendDegreeIssuedEmail(
  studentEmail: string,
  studentName: string,
  degreeId: string,
  degreeTitle: string,
  blockchainHash: string
) {
  return emailjs.send(
    import.meta.env.VITE_EMAILJS_SERVICE_ID,
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    {
      to_email: studentEmail,
      to_name: studentName,
      degree_id: degreeId,
      degree_title: degreeTitle,
      blockchain_hash: blockchainHash,
      verify_url: `https://yourapp.com/verify/${degreeId}`,
    }
  );
}

export async function sendVerificationApprovalEmail(
  studentEmail: string,
  studentName: string
) {
  return emailjs.send(
    import.meta.env.VITE_EMAILJS_SERVICE_ID,
    'template_approval',
    { to_email: studentEmail, to_name: studentName }
  );
}
```

---

### 10. Route Protection — Any URL is Accessible
**File:** `src/App.tsx` — no proper role-based access control

```typescript
// ❌ CURRENT — employer can navigate to 'blockchain', student to 'students', etc.
const renderPage = () => {
  switch (page) {
    case 'students': return <StudentsManagement />;  // No admin check!
    case 'fraud': return <FraudDetection />;          // No admin check!
  }
};
```

**Replace the renderPage logic in `App.tsx`:**
```typescript
// Define which roles can access which pages
const PAGE_ACCESS: Record<string, UserRole[]> = {
  'dashboard': ['student'],
  'documents': ['student'],
  'face-verify': ['student'],
  'apply-degree': ['student'],
  'my-degrees': ['student'],
  'profile': ['student', 'admin', 'employer'],
  'verify': ['student', 'admin', 'employer'],
  'admin-dashboard': ['admin'],
  'students': ['admin'],
  'degree-management': ['admin'],
  'blockchain': ['admin'],
  'fraud': ['admin'],
  'audit': ['admin'],
  'employer-dashboard': ['employer'],
};

const renderPage = () => {
  const allowedRoles = PAGE_ACCESS[page];

  if (!allowedRoles) {
    // Unknown page — redirect to appropriate dashboard
    if (currentUser.role === 'admin') return <AdminDashboard onNavigate={setPage} />;
    if (currentUser.role === 'employer') return <EmployerDashboard onNavigate={setPage} />;
    return <StudentDashboard onNavigate={setPage} />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    // Unauthorized — show access denied
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-400">Access Denied</h2>
          <p className="text-gray-400 mt-2">You don't have permission to view this page.</p>
          <button
            onClick={() => {
              if (currentUser.role === 'admin') setPage('admin-dashboard');
              else if (currentUser.role === 'employer') setPage('employer-dashboard');
              else setPage('dashboard');
            }}
            className="mt-4 px-6 py-2 bg-blue-600 rounded-lg text-white"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  switch (page) {
    case 'dashboard': return <StudentDashboard onNavigate={setPage} />;
    case 'documents': return <DocumentUpload />;
    case 'face-verify': return <FaceVerification />;
    case 'apply-degree': return <ApplyDegree onNavigate={setPage} />;
    case 'my-degrees': return <MyDegrees />;
    case 'verify': return <VerifyDegree />;
    case 'admin-dashboard': return <AdminDashboard onNavigate={setPage} />;
    case 'students': return <StudentsManagement />;
    case 'degree-management': return <DegreeManagement />;
    case 'blockchain': return <BlockchainView />;
    case 'fraud': return <FraudDetection />;
    case 'audit': return <AuditLogs />;
    case 'employer-dashboard': return <EmployerDashboard onNavigate={setPage} />;
    case 'profile': return <Profile />;
    default: return <StudentDashboard onNavigate={setPage} />;
  }
};
```

---

### 11. Fraud Detection — Static Hardcoded Data
**File:** `src/pages/FraudDetection.tsx`

The fraud reports are completely hardcoded sample data in `store.ts`. No real detection logic runs.

**Complete real fraud detection module — `src/lib/fraudDetection.ts`:**
```typescript
import { User, DegreeApplication, UploadedDocument } from '../types';

export interface FraudCheckResult {
  score: number;       // 0-100, higher = safer
  flags: string[];     // Issues found
  severity: 'safe' | 'medium' | 'high';
}

export function runFraudChecks(
  user: User,
  allUsers: User[],
  application: DegreeApplication
): FraudCheckResult {
  const flags: string[] = [];
  let deductions = 0;

  // Check 1: Duplicate CNIC
  if (user.cnicNumber) {
    const duplicateCNIC = allUsers.filter(
      u => u.id !== user.id && u.cnicNumber === user.cnicNumber
    );
    if (duplicateCNIC.length > 0) {
      flags.push(`CNIC ${user.cnicNumber} is linked to ${duplicateCNIC.length} other account(s)`);
      deductions += 40;
    }
  }

  // Check 2: Multiple degree applications for same program
  // (This would need access to all degree applications)
  
  // Check 3: CGPA anomaly (too high for program)
  if (application.cgpa > 4.0) {
    flags.push(`CGPA ${application.cgpa} exceeds maximum possible value of 4.0`);
    deductions += 30;
  }
  if (application.cgpa > 3.99) {
    flags.push(`Suspiciously perfect CGPA: ${application.cgpa}`);
    deductions += 10;
  }

  // Check 4: Graduation year sanity
  const studyDuration = application.graduationYear - application.admissionYear;
  if (studyDuration < 2 || studyDuration > 8) {
    flags.push(`Study duration (${studyDuration} years) is unusual for ${application.program}`);
    deductions += 15;
  }

  // Check 5: Email format validation
  const emailRegex = /^[a-zA-Z]+\.\d{5}@iqra\.edu\.pk$/;
  if (!emailRegex.test(user.email)) {
    flags.push(`Email format doesn't match university pattern: ${user.email}`);
    deductions += 10;
  }

  // Check 6: Document completeness
  const docs = user.documents || [];
  const requiredDocTypes = ['cnic', 'marksheet', 'certificate'];
  const missingDocs = requiredDocTypes.filter(
    type => !docs.some(d => d.type === type && d.ocrStatus === 'verified')
  );
  if (missingDocs.length > 0) {
    flags.push(`Missing verified documents: ${missingDocs.join(', ')}`);
    deductions += missingDocs.length * 10;
  }

  // Check 7: Documents with failed YOLO
  const fraudulentDocs = docs.filter(d => d.yoloStatus === 'fraudulent');
  if (fraudulentDocs.length > 0) {
    flags.push(`${fraudulentDocs.length} document(s) flagged as fraudulent by YOLO`);
    deductions += 35;
  }

  const score = Math.max(0, 100 - deductions);
  const severity = score < 40 ? 'high' : score < 70 ? 'medium' : 'safe';

  return { score, flags, severity };
}

export function checkDuplicateDegree(
  newApplication: Partial<DegreeApplication>,
  existingApplications: DegreeApplication[]
): boolean {
  return existingApplications.some(
    app =>
      app.studentId === newApplication.studentId &&
      app.program === newApplication.program &&
      app.status !== 'revoked'
  );
}

export function detectOCRMismatch(
  extractedData: Record<string, string>,
  user: User
): string[] {
  const mismatches: string[] = [];

  if (extractedData['Name'] && user.name) {
    const extractedName = extractedData['Name'].toLowerCase().trim();
    const registeredName = user.name.toLowerCase().trim();
    // Fuzzy match — allow for minor OCR errors
    if (!extractedName.includes(registeredName.split(' ')[0].toLowerCase()) &&
        !registeredName.includes(extractedName.split(' ')[0].toLowerCase())) {
      mismatches.push(
        `Name mismatch: OCR extracted "${extractedData['Name']}", registered as "${user.name}"`
      );
    }
  }

  if (extractedData['CNIC Number'] && user.cnicNumber) {
    const clean = (s: string) => s.replace(/[-\s]/g, '');
    if (clean(extractedData['CNIC Number']) !== clean(user.cnicNumber)) {
      mismatches.push(
        `CNIC mismatch: Document shows "${extractedData['CNIC Number']}", registered as "${user.cnicNumber}"`
      );
    }
  }

  return mismatches;
}
```

---

### 12. Missing: Degree Certificate Template (Visual)
The system issues degrees but has no actual visual certificate. Students see text data, not a proper certificate.

**New file: `src/components/DegreeCertificate.tsx`**
```typescript
import { DegreeApplication } from '../types';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  degree: DegreeApplication;
  studentName: string;
  fatherName?: string;
  cnicNumber?: string;
}

export default function DegreeCertificate({ degree, studentName, fatherName, cnicNumber }: Props) {
  return (
    <div
      id={`degree-certificate-${degree.id}`}
      className="bg-white text-black w-[800px] h-[566px] relative overflow-hidden"
      style={{ fontFamily: 'Georgia, serif' }}
    >
      {/* Border */}
      <div className="absolute inset-2 border-4 border-double border-yellow-700" />
      <div className="absolute inset-4 border border-yellow-600" />

      {/* Header */}
      <div className="text-center pt-10 pb-4">
        <img src="/images/university-logo.png" alt="University Logo" className="h-16 mx-auto mb-3" />
        <h1 className="text-2xl font-bold tracking-widest text-yellow-800 uppercase">
          Iqra University
        </h1>
        <p className="text-sm tracking-wider text-gray-600">Established 1998 • Karachi, Pakistan</p>
        <div className="w-48 h-px bg-yellow-700 mx-auto mt-3" />
      </div>

      {/* Title */}
      <div className="text-center py-4">
        <p className="text-sm tracking-widest text-gray-500 uppercase">This is to certify that</p>
        <h2 className="text-3xl font-bold text-gray-900 mt-1">{studentName}</h2>
        {fatherName && (
          <p className="text-sm text-gray-500 mt-1">Son/Daughter of {fatherName}</p>
        )}
        {cnicNumber && <p className="text-xs text-gray-400 mt-0.5">CNIC: {cnicNumber}</p>}
      </div>

      {/* Degree Info */}
      <div className="text-center py-2">
        <p className="text-sm text-gray-500">has successfully completed the requirements for the degree of</p>
        <h3 className="text-xl font-bold text-blue-900 mt-2 px-8">{degree.degreeTitle}</h3>
        <p className="text-sm text-gray-600 mt-1">{degree.department}</p>
        <p className="text-sm text-gray-500 mt-1">
          CGPA: <strong>{degree.cgpa}</strong> &nbsp;|&nbsp;
          Batch: {degree.admissionYear}–{degree.graduationYear}
        </p>
      </div>

      {/* Bottom */}
      <div className="absolute bottom-10 left-0 right-0 px-12 flex justify-between items-end">
        <div className="text-center">
          <div className="w-32 h-px bg-gray-400 mb-1" />
          <p className="text-xs text-gray-500">Controller of Examinations</p>
        </div>

        <div className="text-center">
          <p className="text-[9px] text-gray-400 font-mono break-all max-w-[160px]">
            {degree.blockchainHash?.substring(0, 20)}...
          </p>
          <p className="text-[9px] text-gray-400">Blockchain Verified</p>
          {degree.qrCodeData && (
            <QRCodeSVG value={degree.qrCodeData} size={60} className="mx-auto mt-1" />
          )}
          <p className="text-[8px] text-gray-400 mt-0.5">Degree ID: {degree.degreeId}</p>
        </div>

        <div className="text-center">
          <div className="w-32 h-px bg-gray-400 mb-1" />
          <p className="text-xs text-gray-500">Vice Chancellor</p>
        </div>
      </div>
    </div>
  );
}
```

---

## 📦 Summary: Complete Dependency List

```bash
# Run this to install everything needed for the real implementation:
npm install \
  firebase \
  @supabase/supabase-js \
  ethers \
  @vladmandic/face-api \
  html5-qrcode \
  jspdf \
  html2canvas \
  @emailjs/browser
```

---

## 🗺️ Implementation Priority Roadmap

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 🔴 Critical | Real Authentication (Firebase/Supabase) | 1 day | Foundational |
| 🔴 Critical | Real Database (Supabase) | 1 day | Foundational |
| 🔴 Critical | Route Protection / RBAC | 2 hours | Security |
| 🟠 High | Real Face Verification (face-api.js) | 1 day | Core feature |
| 🟠 High | Real Blockchain (Ethereum Sepolia) | 2 days | Core feature |
| 🟠 High | PDF Certificate Download | 3 hours | Core feature |
| 🟡 Medium | QR Code Scanner | 3 hours | UX |
| 🟡 Medium | Real YOLO (Roboflow API) | 1 day | Accuracy |
| 🟡 Medium | Email Notifications (EmailJS) | 3 hours | UX |
| 🟢 Low | Fraud Detection Engine | 4 hours | Admin UX |
| 🟢 Low | Password Hashing | 1 hour | Security |

---

## 🔑 Architecture for a Real Production System

```
┌─────────────────────────────────────────┐
│           Frontend (React/Vite)         │
│  - face-api.js (browser face matching)  │
│  - Tesseract.js (OCR — already works)   │
│  - ethers.js (blockchain interaction)   │
│  - QR scanner + PDF generator           │
└──────────────┬──────────────────────────┘
               │
       ┌───────┼───────┐
       ▼       ▼       ▼
  Firebase  Supabase  Ethereum
   (Auth)  (Database  (Sepolia
           + Storage)  Testnet)
                │
         Roboflow API
         (YOLO document
          detection)
```

This architecture requires **zero backend server** — everything runs either in the browser or through third-party APIs with free tiers.

---

*Total estimated time to make this a fully working real system: 5–7 days of development*

verification is not working properly it should reject if data in documents does not match with given data also also it should have a option to remove the documents i uploaded, it should request sys to access the camera, for now it doess not has camera access, and QR code should be printed on the degree and remove extra options, make sure they are working properly. Also manage the data of the user along with their degrees and crendentials in a file or folder setup this feature properly to avoid loss of data.
now complete these missing features one by one correctly



TO UNTRACK .env
pip install git-filter-repo
git filter-repo --path .env --invert-paths
git push --force --all