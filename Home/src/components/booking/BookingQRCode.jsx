// Member 2 – BookingQRCode component (shows QR code for approved bookings)
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import "../../styles/booking/bookingQR.css";

export default function BookingQRCode({ booking, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!booking) return;
    setIsGenerating(true);
    setError("");

    // Create QR code data for the booking
    const qrData = JSON.stringify({
      bookingId: booking.id,
      facilityName: booking.facilityName,
      startTime: booking.startTime,
      endTime: booking.endTime,
      userName: booking.userName,
      userEmail: booking.userEmail,
      status: booking.status,
      qrCode: booking.qrCode,
      timestamp: new Date().toISOString()
    });

    // Generate QR code using qrcode library
    QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
      .then(setQrDataUrl)
      .catch((err) => setError(err.message || "Failed to generate QR code"))
      .finally(() => setIsGenerating(false));
  }, [booking]);

  function handleDownload() {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `booking-${booking.id}-qr.png`;
    link.href = qrDataUrl;
    link.click();
  }

  function formatDateTime(dt) {
    if (!dt) return "";
    return new Date(dt).toLocaleString("en-US", { 
      dateStyle: "medium", 
      timeStyle: "short" 
    });
  }

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <header className="qr-modal__header">
          <h3 className="qr-modal__title">Check-in QR Pass</h3>
          <button className="qr-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="qr-modal__content">
          {isGenerating && (
            <div className="qr-modal__loading">
              <p>Generating QR code...</p>
            </div>
          )}

          {error && (
            <div className="qr-modal__error">
              <p>{error}</p>
            </div>
          )}

          {qrDataUrl && !isGenerating && !error && (
            <>
              <div className="qr-code-container">
                <img 
                  src={qrDataUrl} 
                  alt={`QR code for booking #${booking.id}`}
                  className="qr-code-img"
                />
              </div>

              <div className="booking-details">
                <h4>Booking Details</h4>
                <div className="detail-row">
                  <span className="detail-label">Booking ID:</span>
                  <span className="detail-value">#{booking.id}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Facility:</span>
                  <span className="detail-value">{booking.facilityName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date & Time:</span>
                  <span className="detail-value">{formatDateTime(booking.startTime)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Duration:</span>
                  <span className="detail-value">
                    {formatDateTime(booking.startTime)} → {formatDateTime(booking.endTime)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Booked by:</span>
                  <span className="detail-value">{booking.userName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value status-approved">Approved</span>
                </div>
              </div>

              <div className="qr-modal__actions">
                <button 
                  className="qr-modal__download"
                  onClick={handleDownload}
                  aria-label="Download QR code"
                >
                  📥 Download QR Code
                </button>
                <button 
                  className="qr-modal__print"
                  onClick={() => window.print()}
                  aria-label="Print QR code"
                >
                  🖨️ Print
                </button>
              </div>

              <div className="qr-modal__instructions">
                <p><strong>Instructions:</strong></p>
                <ul>
                  <li>Show this QR code at the facility entrance for check-in</li>
                  <li>The QR code contains your booking details and can be scanned by staff</li>
                  <li>Keep this QR code handy until your booking is completed</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
