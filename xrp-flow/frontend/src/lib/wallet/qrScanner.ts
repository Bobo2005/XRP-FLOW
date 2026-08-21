import { useState, useEffect, useCallback, useRef } from "react";

interface QRCodeOptions {
  /** Constraints for the video scan */
  constraints?: MediaStreamConstraints;
  /** Default: 300ms */
  delay?: number;
  /** Whether to show the video element */
  showVideo?: boolean;
  /** Callback when a QR code is scanned */
  onScan?: (decodedText: string) => void;
  /** Callback when there's an error */
  onError?: (error: Error) => void;
}

interface QRScannerState {
  /** Whether the scanner is currently active */
  isScanning: boolean;
  /** Whether the scanner has permission to use the camera */
  hasPermission: boolean;
  /** Error if scanner failed to initialize */
  error: Error | null;
  /** Video element reference */
  videoRef: RefObject<HTMLVideoElement>;
  /** Start the scanner */
  start: () => Promise<void>;
  /** Stop the scanner */
  stop: () => void;
}

/**
 * Hook for scanning QR codes using the device camera
 * @param options Configuration options for the QR scanner
 * @returns QRScannerState object with scanning controls and state
 */
export function useQRScanner(options: QRCodeOptions = {}): QRScannerState {
  const {
    constraints = { video: { facingMode: "environment" } },
    delay = 300,
    showVideo = true,
    onScan,
    onError,
  } = options;

  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  // Initialize camera and check permissions
  const initCamera = useCallback(async () => {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "getUserMedia is not supported in this browser"
        );
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setVideoStream(stream);
      setHasPermission(true);
      setError(null);

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setHasPermission(false);
      setError(
        err instanceof Error
          ? err
          : new Error(
              "An unknown error occurred while accessing the camera"
            )
      );
      if (onError) {
        onError(
          err instanceof Error
            ? err
            : new Error(
                "An unknown error occurred while accessing the camera"
              )
        );
      }
    }
  }, [constraints]);

  // Start scanning
  const start = useCallback(async () => {
    if (isScanning) return;

    try {
      await initCamera();
      setIsScanning(true);

      // Create image capture and QR code detector
      if (!videoStream || !videoRef.current) {
        throw new Error("Video stream not available");
      }

      // Create ImageBitmap from video frame and detect QR codes
      const detectQRCode = async () => {
        if (!isScanning || !videoRef.current || !videoStream) return;

        try {
          // Create offscreen canvas for image capture
          const offscreen = new OffscreenCanvas(
            videoRef.current.videoWidth,
            videoRef.current.videoHeight
          );
          const ctx = offscreen.getContext("2d");

          if (!ctx) {
            setTimeout(detectQRCode, delay);
            return;
          }

          // Draw current video frame to canvas
          ctx.drawImage(videoRef.current, 0, 0);

          // Get image data
          const imageData = ctx.getImageData(
            0,
            0,
            offscreen.width,
            offscreen.height
          );

          // Try to detect QR code using a library or API
          // Note: Browser QR code detection is still experimental
          // For production, consider using a library like @zxing/browser
          // For now, we'll simulate or use a placeholder implementation

          // In a real implementation, you would use:
          // const codeDetector = new BarcodeDetector({ formats: ["qr_code"] });
          // const barcodes = await codeDetector.detect(imageData);
          // if (barcodes.length > 0) {
          //   const barcode = barcodes[0];
          //   if ("rawValue" in barcode) {
          //     setIsScanning(false); // Stop scanning after first detection
          //     stop();
          //     if (onScan) onScan(barcode.rawValue);
          //     return;
          //   }
          // }

          // Placeholder: Simulate QR detection for demo purposes
          // Remove this in production and implement actual QR detection
          // if (Math.random() < 0.001) { // 0.1% chance per frame
          //   setIsScanning(false);
          //   stop();
          //   if (onScan) onScan("SIMULATED_QR_CODE_DATA");
          //   return;
          // }

          // Continue scanning
          setTimeout(detectQRCode, delay);
        } catch (err) {
          console.error("Error during QR code detection:", err);
          setError(
            err instanceof Error
              ? err
              : new Error("Error during QR code scanning")
          );
          setTimeout(detectQRCode, delay);
        }
      };

      // Start detection loop
      detectQRCode();
    } catch (err) {
      console.error("Failed to start QR scanner:", err);
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to start QR scanner")
      );
      if (onError) {
        onError(
          err instanceof Error
            ? err
            : new Error("Failed to start QR scanner")
        );
      }
    }
  }, [isScanning, delay, onScan, onError, initCamera, videoStream]);

  // Stop scanning
  const stop = useCallback(() => {
    setIsScanning(false);

    // Stop all video tracks
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [videoStream]);

  return {
    isScanning,
    hasPermission,
    error,
    videoRef: videoRef as RefObject<HTMLVideoElement>,
    start,
    stop,
  };
}

// Hook that returns a simpler API for common use cases
export function useSimpleQRScanner(
  onScan: (decodedText: string) => void,
  onError?: (error: Error) => void
) {
  const scanner = useQRScanner({
    onScan,
    onError,
    showVideo: false, // Usually don't need to show video in simple use cases
  });

  const { start, stop, isScanning, error } = scanner;

  return {
    startScanning: start,
    stopScanning: stop,
    isScanning,
    error,
  };
}