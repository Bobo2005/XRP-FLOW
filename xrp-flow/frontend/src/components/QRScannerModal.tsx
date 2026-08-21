

// import { useEffect } from "react";
// import { useQRScanner } from "../lib/wallet/qrScanner";
// import { X, Camera, AlertCircle } from "lucide-react";

// interface QRScannerModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onScan: (data: string) => void;
// }

// export default function QRScannerModal({ isOpen, onClose, onScan }: QRScannerModalProps) {
//   const { videoRef, start, stop, isScanning, error } = useQRScanner({
//     onScan: (data) => {
//       onScan(data);
//       onClose();
//     },
//   });

//   useEffect(() => {
//     if (isOpen) {
//       start();
//     } else {
//       stop();
//     }
//     return () => {
//       stop();
//     };
//   }, [isOpen, start, stop]);

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
//       <div className="relative w-full max-w-md rounded-2xl border border-border bg-bg-base p-6 shadow-2xl space-y-4">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <Camera className="h-5 w-5 text-success-green" />
//             <h3 className="text-lg font-bold text-text-primary">Scan QR Code</h3>
//           </div>
//           <button
//             type="button"
//             onClick={onClose}
//             className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-surface text-text-muted hover:text-text-primary transition-colors"
//           >
//             <X className="h-4 w-4" />
//           </button>
//         </div>

//         <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black border border-border flex items-center justify-center">
//           <video
//             ref={videoRef}
//             playsInline
//             muted
//             className="absolute inset-0 h-full w-full object-cover"
//           />
//           {!isScanning && !error && (
//             <div className="absolute inset-0 flex items-center justify-center bg-bg-surface/80 backdrop-blur-xs text-sm text-text-muted">
//               Initializing camera...
//             </div>
//           )}
//           {error && (
//             <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-surface/90 p-4 text-center text-danger-red">
//               <AlertCircle className="h-8 w-8 mb-2" />
//               <p className="text-xs font-medium">{error.message}</p>
//             </div>
//           )}
//         </div>

//         <p className="text-center text-xs text-text-muted">
//           Position the wallet QR code within the frame to scan automatically.
//         </p>
//       </div>
//     </div>
//   );
// }

import { useEffect } from "react";
import { useQRScanner } from "../lib/wallet/qrScanner";
import { X, Camera, AlertCircle } from "lucide-react";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export default function QRScannerModal({ isOpen, onClose, onScan }: QRScannerModalProps) {
  const { videoRef, start, stop, isScanning, error } = useQRScanner({
    onScan: (data) => {
      onScan(data);
      onClose();
    },
  });

  useEffect(() => {
    if (isOpen) {
      start();
    } else {
      stop();
    }
    return () => {
      stop();
    };
  }, [isOpen, start, stop]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-bg-base p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-success-green" />
            <h3 className="text-lg font-bold text-text-primary">Scan QR Code</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-surface text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black border border-border flex items-center justify-center">
          <video
            ref={videoRef as React.RefObject<HTMLVideoElement>}
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
          />
          {!isScanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-surface/80 backdrop-blur-xs text-sm text-text-muted">
              Initializing camera...
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-surface/90 p-4 text-center text-danger-red">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="text-xs font-medium">{error.message}</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-text-muted">
          Position the wallet QR code within the frame to scan automatically.
        </p>
      </div>
    </div>
  );
}