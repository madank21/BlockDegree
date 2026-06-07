import { DegreeApplication, User } from '../types';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  degree: DegreeApplication;
  user: User;
}

export default function DegreeCertificate({ degree, user }: Props) {
  return (
    <div
      id={`degree-certificate-${degree.id}`}
      className="bg-white text-black w-[900px] h-[650px] relative overflow-hidden page-break-after"
      style={{ fontFamily: 'Georgia, serif' }}
    >
      {/* Decorative Border */}
      <div className="absolute inset-2 border-4 border-double border-amber-700" />
      <div className="absolute inset-4 border border-amber-600" />

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-32 h-32 border-l-4 border-t-4 border-amber-700" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-r-4 border-b-4 border-amber-700" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col p-12">
        {/* Header Section */}
        <div className="text-center mb-6">
          {/* Logo placeholder */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-b from-amber-600 to-amber-700 mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold">
            IU
          </div>

          <h1 className="text-3xl font-bold tracking-widest text-amber-900 uppercase mb-1">
            Iqra University
          </h1>
          <p className="text-sm tracking-wider text-gray-700">
            Established 1998 • Karachi, Pakistan
          </p>
          <div className="w-64 h-px bg-gradient-to-r from-transparent via-amber-700 to-transparent mx-auto mt-4" />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center items-center text-center px-8">
          {/* Introductory Text */}
          <p className="text-sm tracking-widest text-gray-600 mb-3 uppercase">
            This Certificate is Proudly Presented to
          </p>

          {/* Student Name */}
          <h2 className="text-4xl font-bold text-gray-900 mb-2 tracking-wide">
            {user.name}
          </h2>

          {/* Father's Name */}
          {user.fatherName && (
            <p className="text-sm text-gray-700 mb-4">
              Son/Daughter of <span className="font-semibold">{user.fatherName}</span>
            </p>
          )}

          {/* Registration & CNIC */}
          <div className="text-xs text-gray-600 mb-4 space-y-1">
            <p>Registration Number: <span className="font-mono font-semibold">{user.registrationNumber}</span></p>
            {user.cnicNumber && (
              <p>CNIC: <span className="font-mono font-semibold">{user.cnicNumber}</span></p>
            )}
          </div>

          {/* Certificate Text */}
          <p className="text-sm text-gray-700 mt-4 mb-3">
            In recognition of successfully completing all requirements for the degree of
          </p>

          {/* Degree Title */}
          <h3 className="text-2xl font-bold text-blue-900 mb-3 px-6 py-2 border-t border-b border-amber-700">
            {degree.degreeTitle}
          </h3>

          {/* Program Details */}
          <div className="text-sm text-gray-700 mt-4 space-y-1">
            <p><span className="font-semibold">{degree.program}</span></p>
            <p>Department of {degree.department}</p>
            <p className="text-xs mt-2">
              Academic Year {degree.admissionYear} - {degree.graduationYear} • CGPA: {degree.cgpa}
            </p>
          </div>
        </div>

        {/* Footer Section */}
        <div className="border-t border-amber-600 pt-6 flex items-end justify-between">
          {/* Signature Lines */}
          <div className="text-center flex-1">
            <div className="w-32 h-12 mb-2 flex items-end justify-center">
              {/* Placeholder for signature */}
              <div className="w-24 h-px bg-gray-400" />
            </div>
            <p className="text-xs font-semibold text-gray-700">Controller of Examinations</p>
          </div>

          {/* Center: QR Code and Blockchain Info */}
          <div className="flex-1 flex flex-col items-center justify-end">
            {degree.qrCodeData && (
              <div className="text-center mb-2">
                <QRCodeSVG 
                  value={degree.qrCodeData} 
                  size={80} 
                  level="H"
                  includeMargin={false}
                />
                <p className="text-[8px] text-gray-500 mt-1 font-mono">
                  {degree.degreeId}
                </p>
              </div>
            )}
            {degree.blockchainHash && (
              <p className="text-[7px] text-gray-600 font-mono text-center break-all px-2">
                ✓ Blockchain Attested
              </p>
            )}
          </div>

          {/* Right Signature Line */}
          <div className="text-center flex-1">
            <div className="w-32 h-12 mb-2 flex items-end justify-center">
              {/* Placeholder for signature */}
              <div className="w-24 h-px bg-gray-400" />
            </div>
            <p className="text-xs font-semibold text-gray-700">Vice Chancellor</p>
          </div>
        </div>

        {/* Bottom Authentication Note */}
        <div className="text-center text-[7px] text-gray-500 mt-4 pt-3 border-t border-gray-300">
          <p>
            This degree is issued under the authority of Iqra University and is attested on the blockchain.
          </p>
          {degree.blockchainHash && (
            <p className="font-mono mt-1">
              Attestation: {degree.blockchainHash.substring(0, 32)}...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
