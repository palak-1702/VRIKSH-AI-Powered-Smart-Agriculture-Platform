import React, { useState } from 'react';
import { classifyLeafImage, type LeafClassifyResponse } from '../lib/leafClassifier';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface LiveCameraProps {
  language: 'en' | 'hi';
}

export default function LiveCamera({ language }: LiveCameraProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<LeafClassifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const placeholderImages = [
    "https://images.unsplash.com/photo-1729015224555-50047f2fdb94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlbiUyMGZhcm0lMjBmaWVsZCUyMGhlYWx0aHklMjBjcm9wc3xlbnwxfHx8fDE3NTg0ODQ2ODl8MA&ixlib=rb-4.1.0&q=80&w=1080",
    "https://images.unsplash.com/photo-1662776704670-ba57453dfb47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpZmljaWFsJTIwaW50ZWxsaWdlbmNlJTIwcGxhbnQlMjBkZXRlY3Rpb24lMjBjYW1lcmF8ZW58MXx8fHwxNzU4NDg0Njk0fDA&ixlib=rb-4.1.0&q=80&w=1080"
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const startSimulation = () => {
    setIsSimulating(true);
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % placeholderImages.length);
    }, 2000);
    
    setTimeout(() => {
      clearInterval(interval);
      setIsSimulating(false);
    }, 10000);
  };

  const analyzeCurrentFrame = async () => {
    try {
      setError(null);
      setResult(null);
      const imageUrl = placeholderImages[currentImageIndex];
      const r = await fetch(imageUrl);
      const blob = await r.blob();
      const file = new File([blob], 'frame.jpg', { type: blob.type || 'image/jpeg' });
      const resp = await classifyLeafImage(file);
      setResult(resp);
      // show blob preview if needed
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="relative">
      <div className="bg-gray-800 rounded-xl overflow-hidden h-64 relative">
        <ImageWithFallback 
          src={placeholderImages[currentImageIndex]}
          alt="Live Camera Feed" 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          {language === 'en' ? 'LIVE' : 'लाइव'}
        </div>
        <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
          ESP32-CAM
        </div>
        {isSimulating && (
          <div className="absolute inset-0 border-4 border-green-400 animate-pulse rounded-xl"></div>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button 
          onClick={startSimulation}
          disabled={isSimulating}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg transition-colors"
        >
          {isSimulating 
            ? (language === 'en' ? 'Analyzing...' : 'विश्लेषण कर रहा है...')
            : (language === 'en' ? 'Start Detection' : 'पहचान शुरू करें')
          }
        </button>
        <button
          onClick={analyzeCurrentFrame}
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
        >
          {language === 'en' ? 'Analyze' : 'विश्लेषण करें'}
        </button>
      </div>
      {result && (
        <div className="mt-2 text-sm">
          <span className={`font-semibold ${result.class === 'healthy' ? 'text-green-700' : result.class === 'moderate' ? 'text-yellow-700' : 'text-red-700'}`}>
            {result.class.toUpperCase()}
          </span>
          <span className="text-gray-600"> · {(result.confidence * 100).toFixed(0)}%</span>
        </div>
      )}
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </div>
  );
}