// services/qrService.js
const QRCode = require("qrcode");

class QRService {
  static async generateQR(data) {
    try {
      return await QRCode.toDataURL(data);
    } catch (err) {
      throw new Error("QR generation failed: " + err.message);
    }
  }
}

module.exports = QRService;