import { type RefObject, useEffect, useEffectEvent, useState } from "react";

const SCAN_INTERVAL_MS = 150;

export type QrScannerError =
  | "insecure-context"
  | "permission-denied"
  | "no-camera"
  | "failed";

function errorOf(error: unknown): QrScannerError {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") return "permission-denied";
    if (error.name === "NotFoundError") return "no-camera";
  }
  return "failed";
}

/**
 * Shows the back camera in `videoRef` and calls `onValues` with the QR codes of
 * each frame that has any, until unmounted or until it fails, either of which
 * turns the camera off.
 */
export function useQrScanner(
  videoRef: RefObject<HTMLVideoElement | null>,
  onValues: (values: string[]) => void,
) {
  const [error, setError] = useState<QrScannerError | null>(null);
  const [scanning, setScanning] = useState(false);
  const handleValues = useEffectEvent(onValues);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function start() {
      // `mediaDevices` only exists on HTTPS and localhost.
      if (!navigator.mediaDevices) {
        setError("insecure-context");
        return;
      }
      // In this order: a stream requested alongside the import would have no
      // owner to stop it if the import failed.
      const { createQrDetector } =
        await import("#/features/pay/utils/qr-detector");
      if (stopped) return;
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      const video = videoRef.current;
      // Unmounted while waiting for the camera: the cleanup already ran.
      if (stopped || !video) {
        stopCamera();
        return;
      }

      video.srcObject = stream;
      await video.play();
      if (stopped) return;
      setScanning(true);

      const detector = createQrDetector();
      async function scan() {
        // The browser can't read a frame until the video has one.
        if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const codes = await detector.detect(video);
          if (stopped) return;
          if (codes.length > 0) {
            handleValues(codes.map(({ rawValue }) => rawValue));
          }
        }
        if (!stopped) {
          timer = setTimeout(() => {
            scan().catch(fail);
          }, SCAN_INTERVAL_MS);
        }
      }
      await scan();
    }

    function stopCamera() {
      for (const track of stream?.getTracks() ?? []) track.stop();
    }

    function fail(reason: unknown) {
      if (!stopped) {
        stopCamera();
        setScanning(false);
        setError(errorOf(reason));
      }
    }

    start().catch(fail);

    return () => {
      stopped = true;
      clearTimeout(timer);
      stopCamera();
    };
  }, [videoRef]);

  return { error, scanning };
}
