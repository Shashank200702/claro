import { useState, useRef } from "react";
import { Camera, Upload, X, Check, Loader } from "lucide-react";
import Groq from "groq-sdk";
import { smartCategorize, CATEGORIES } from "../utils/helpers";
import "./ReceiptScanner.css";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const client = new Groq({
  apiKey: GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function ReceiptScanner({ onResult, onClose }) {
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setResult(null);
    setError("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(",")[1];
      setImage({ base64, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  const scanReceipt = async () => {
    if (!image) return;
    setScanning(true);
    setError("");

    try {
      const response = await client.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${image.type};base64,${image.base64}`,
                },
              },
              {
                type: "text",
                text: `Analyze this receipt image and extract the following information. Return ONLY a valid JSON object, nothing else:
{
  "merchant": "store or restaurant name",
  "amount": 12.50,
  "date": "2026-05-22",
  "description": "brief description of what was purchased",
  "category": "one of: food, transport, shopping, bills, entertainment, health, education, travel, groceries, rent, other"
}

Rules:
- amount should be the TOTAL amount as a number (no currency symbol)
- date should be in YYYY-MM-DD format, use today if not visible
- if you cannot read the receipt clearly, make your best guess
- category must be exactly one of the options listed`,
              },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.1,
      });

      const text = response.choices[0].message.content.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse receipt");

      const data = JSON.parse(jsonMatch[0]);
      setResult(data);
    } catch (e) {
      console.error(e);
      setError("Could not read receipt. Please try a clearer photo.");
    } finally {
      setScanning(false);
    }
  };

  const handleUse = () => {
    if (!result) return;
    onResult({
      description: result.merchant || result.description || "Receipt",
      amount: parseFloat(result.amount) || 0,
      category: result.category || smartCategorize(result.merchant || ""),
      date: result.date || new Date().toISOString().split("T")[0],
      type: "expense",
      notes: result.description || "",
    });
    onClose();
  };

  const getCategoryColor = (catId) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    return cat?.color || "#7c3aed";
  };

  return (
    <div className="scanner-overlay" onClick={onClose}>
      <div className="scanner-modal" onClick={e => e.stopPropagation()}>
        <div className="scanner-header">
          <div className="scanner-title">
            <Camera size={20} strokeWidth={1.5} />
            Scan Receipt
          </div>
          <button className="scanner-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="scanner-body">
          {!imageUrl ? (
            <div className="scanner-upload-area">
              <div className="sua-icon">
                <Camera size={32} strokeWidth={1} />
              </div>
              <div className="sua-title">Take a photo or upload</div>
              <div className="sua-sub">Point your camera at any receipt and AI will extract the details automatically</div>
              <div className="sua-buttons">
                {/* Camera button - opens camera on mobile */}
                <button className="sua-camera-btn" onClick={() => cameraRef.current?.click()}>
                  <Camera size={18} strokeWidth={1.5} />
                  Take Photo
                </button>
                {/* Upload button */}
                <button className="sua-upload-btn" onClick={() => fileRef.current?.click()}>
                  <Upload size={18} strokeWidth={1.5} />
                  Upload Image
                </button>
              </div>

              {/* Hidden camera input (mobile) */}
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])}
              />
              {/* Hidden file input */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="scanner-preview">
              <img src={imageUrl} alt="Receipt" className="receipt-img" />
              <button className="change-photo-btn" onClick={() => { setImageUrl(null); setImage(null); setResult(null); }}>
                Change photo
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="scanner-error">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="scanner-result">
              <div className="sr-title">Receipt detected</div>
              <div className="sr-fields">
                <div className="sr-field">
                  <span className="sr-label">Merchant</span>
                  <span className="sr-value">{result.merchant || "Unknown"}</span>
                </div>
                <div className="sr-field">
                  <span className="sr-label">Amount</span>
                  <span className="sr-value sr-amount">${parseFloat(result.amount || 0).toFixed(2)}</span>
                </div>
                <div className="sr-field">
                  <span className="sr-label">Date</span>
                  <span className="sr-value">{result.date}</span>
                </div>
                <div className="sr-field">
                  <span className="sr-label">Category</span>
                  <span className="sr-value sr-cat" style={{ color: getCategoryColor(result.category), background: `${getCategoryColor(result.category)}15` }}>
                    {result.category}
                  </span>
                </div>
                {result.description && (
                  <div className="sr-field">
                    <span className="sr-label">Items</span>
                    <span className="sr-value">{result.description}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="scanner-footer">
          {imageUrl && !result && (
            <button className="scan-btn" onClick={scanReceipt} disabled={scanning}>
              {scanning ? (
                <><Loader size={16} className="spin" /> Scanning…</>
              ) : (
                <><Camera size={16} /> Scan Receipt</>
              )}
            </button>
          )}
          {result && (
            <button className="use-btn" onClick={handleUse}>
              <Check size={16} />
              Add to Transactions
            </button>
          )}
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
