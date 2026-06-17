// services/qrService.js
const QRCode = require('qrcode');

class QRService {
  /**
   * Generic QR generator – returns a data URL.
   */
  static async generateQR(data) {
    try {
      return await QRCode.toDataURL(data);
    } catch (err) {
      throw new Error('QR generation failed: ' + err.message);
    }
  }

  /**
   * BlockDegree‑specific QR for degree verification.
   * Payload includes degreeId, degreeHash, and transaction hash.
   */
  static async generateDegreeQR(degreeId, degreeHash, txHash) {
    const payload = {
      degreeId,
      degreeHash,
      txHash,
    };
    try {
      return await QRCode.toDataURL(JSON.stringify(payload, Object.keys(payload).sort()));
    } catch (err) {
      throw new Error('Degree QR generation failed: ' + err.message);
    }
  }
}

module.exports = QRService;