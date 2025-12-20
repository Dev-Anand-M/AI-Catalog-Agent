import { Camera, X, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { Button, Alert } from './ui';

export function CameraCapture({ onCapture, currentImage }) {
  const {
    isCapturing,
    capturedImage,
    error,
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
    clearImage,
    isSupported
  } = useCamera();

  const handleCapture = () => {
    const image = capturePhoto();
    if (image && onCapture) {
      onCapture(image);
    }
  };

  const handleRetake = () => {
    clearImage();
    if (onCapture) {
      onCapture(null);
    }
    startCamera();
  };

  const displayImage = capturedImage || currentImage;

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-700">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Camera not supported</span>
        </div>
        <p className="text-sm text-yellow-600 mt-1">
          Please use a modern browser with camera support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <Alert type="error" message={error} />
      )}

      {/* Camera Preview */}
      {isCapturing && (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={stopCamera}
              className="bg-white/90 hover:bg-white"
            >
              <X className="w-5 h-5 mr-1" />
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCapture}
              className="px-8"
            >
              <Camera className="w-5 h-5 mr-2" />
              Capture Photo
            </Button>
          </div>
          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Camera Active
          </div>
        </div>
      )}

      {/* Captured/Current Image Preview */}
      {!isCapturing && displayImage && (
        <div className="relative rounded-xl overflow-hidden">
          <img
            src={displayImage}
            alt="Product"
            className="w-full aspect-video object-cover"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleRetake}
              className="bg-white/90 hover:bg-white"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Retake Photo
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-green-500 hover:bg-green-600"
            >
              <Check className="w-5 h-5 mr-2" />
              Photo Ready
            </Button>
          </div>
        </div>
      )}

      {/* Start Camera Button */}
      {!isCapturing && !displayImage && (
        <div 
          onClick={startCamera}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all"
        >
          <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Camera className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-700 font-medium text-lg">Take Product Photo</p>
          <p className="text-sm text-gray-500 mt-1">Click to open camera</p>
        </div>
      )}
    </div>
  );
}
