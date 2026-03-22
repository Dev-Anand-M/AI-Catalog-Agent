import { useState, useRef } from 'react';
import { Camera, Upload, X, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { Button, Alert } from './ui';

// Compress image to max 800px wide and ~200KB
function compressImage(dataUrl, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

export function ImageInput({ onImageSelect, currentImage }) {
  const [mode, setMode] = useState(null); // 'camera' or 'upload'
  const [uploadedImage, setUploadedImage] = useState(null);
  const fileInputRef = useRef(null);
  
  const {
    isCapturing,
    capturedImage,
    error: cameraError,
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
    clearImage,
    isSupported: cameraSupported
  } = useCamera();

  const displayImage = capturedImage || uploadedImage || currentImage;

  const handleCapture = async () => {
    const image = capturePhoto();
    if (image && onImageSelect) {
      const compressed = await compressImage(image);
      onImageSelect(compressed);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size should be less than 10MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const compressed = await compressImage(event.target.result);
        setUploadedImage(compressed);
        if (onImageSelect) {
          onImageSelect(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = () => {
    setUploadedImage(null);
    clearImage();
    setMode(null);
    if (onImageSelect) {
      onImageSelect(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartCamera = () => {
    setMode('camera');
    startCamera();
  };

  const handleOpenUpload = () => {
    setMode('upload');
    fileInputRef.current?.click();
  };

  // Show image preview if we have an image
  if (displayImage && !isCapturing) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-xl overflow-hidden border-2 border-green-400">
          <img
            src={displayImage}
            alt="Product"
            className="w-full aspect-video object-cover"
          />
          <div className="absolute top-2 right-2">
            <button
              type="button"
              onClick={handleClear}
              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <p className="text-white text-sm font-medium">✓ Product image ready</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Change Image
        </Button>
      </div>
    );
  }

  // Camera is active
  if (isCapturing) {
    return (
      <div className="space-y-4">
        {cameraError && <Alert type="error" message={cameraError} />}
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Camera Active
          </div>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { stopCamera(); setMode(null); }}
              size="sm"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCapture}
            >
              <Camera className="w-5 h-5 mr-2" />
              Take Photo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Initial state - show options
  return (
    <div className="space-y-4">
      {cameraError && <Alert type="error" message={cameraError} />}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="grid grid-cols-2 gap-4">
        {/* Camera Option */}
        <button
          type="button"
          onClick={handleStartCamera}
          disabled={!cameraSupported}
          className={`p-6 rounded-xl border-2 border-dashed flex flex-col items-center gap-3 transition-all ${
            cameraSupported 
              ? 'border-primary-300 hover:border-primary-500 hover:bg-primary-50 cursor-pointer' 
              : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          }`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            cameraSupported ? 'bg-primary-100' : 'bg-gray-100'
          }`}>
            <Camera className={`w-7 h-7 ${cameraSupported ? 'text-primary-600' : 'text-gray-400'}`} />
          </div>
          <div className="text-center">
            <p className={`font-medium ${cameraSupported ? 'text-gray-900' : 'text-gray-400'}`}>
              Take Photo
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {cameraSupported ? 'Use camera' : 'No camera found'}
            </p>
          </div>
        </button>

        {/* Upload Option */}
        <button
          type="button"
          onClick={handleOpenUpload}
          className="p-6 rounded-xl border-2 border-dashed border-accent-300 hover:border-accent-500 hover:bg-accent-50 flex flex-col items-center gap-3 transition-all cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-accent-100 flex items-center justify-center">
            <Upload className="w-7 h-7 text-accent-600" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-900">Upload Photo</p>
            <p className="text-xs text-gray-500 mt-1">From gallery</p>
          </div>
        </button>
      </div>

      <p className="text-center text-sm text-gray-500">
        Add a product image to make your listing more attractive
      </p>
    </div>
  );
}
