'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// ─── public types ─────────────────────────────────────────────────────────────

export type QrCameraState =
  | 'idle'
  | 'starting'
  | 'ready'
  | 'paused'
  | 'unsupported'
  | 'denied'
  | 'error'
  | 'insecure';

export interface UseQrScannerOptions {
  elementId: string;
  onScan: (rawValue: string) => void;
  debounceMs?: number;
}

export interface UseQrScannerReturn {
  cameraState: QrCameraState;
  scannerReady: boolean;
  retry: () => void;
  /** Pause decoding while a confirmation modal is open (camera stays alive). */
  pause: () => void;
  /** Resume decoding after the modal is dismissed. */
  resume: () => void;
}

type CameraConfig =
  | { facingMode: 'environment' }
  | { facingMode: 'user' }
  | true;

const CAMERA_FALLBACKS: CameraConfig[] = [
  { facingMode: 'environment' },
  { facingMode: 'user' },
  true,
];

export function useQrScanner({
  elementId,
  onScan,
  debounceMs = 4000,
}: UseQrScannerOptions): UseQrScannerReturn {
  const [cameraState, setCameraState] = useState<QrCameraState>('idle');
  const [scannerReady, setScannerReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; });

  const pausedRef = useRef(false);
  const lastProcessedRef = useRef<{ value: string; at: number } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const s = scanner.getState();
      if (s === 2 || s === 3) await scanner.stop();
    } catch { /* ignore */ }
    finally {
      try { scanner.clear(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await stopScanner();
      if (cancelled) return;

      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setCameraState('insecure');
        return;
      }

      const element = document.getElementById(elementId);
      if (!element) { setCameraState('error'); return; }

      setCameraState('starting');
      setScannerReady(false);
      pausedRef.current = false;

      const scanner = new Html5Qrcode(elementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;

      const onSuccess = (decodedText: string) => {
        if (pausedRef.current) return; // ignore frames while confirmation is open
        const now = Date.now();
        const last = lastProcessedRef.current;
        if (last && last.value === decodedText && now - last.at < debounceMs) return;
        lastProcessedRef.current = { value: decodedText, at: now };
        onScanRef.current(decodedText);
      };

      const config = {
        fps: 10,
        qrbox: (w: number, h: number) => {
          const side = Math.max(200, Math.round(Math.min(w, h) * 0.7));
          return { width: side, height: side };
        },
        disableFlip: false,
        showTorchButtonIfSupported: true,
      };

      let lastError: unknown;

      for (const cameraConfig of CAMERA_FALLBACKS) {
        if (cancelled) return;
        try {
          await scanner.start(
            cameraConfig as Parameters<Html5Qrcode['start']>[0],
            config,
            onSuccess,
            () => {},
          );
          if (!cancelled) { setCameraState('ready'); setScannerReady(true); }
          return;
        } catch (err) {
          lastError = err;
          try { const s = scanner.getState(); if (s === 2 || s === 3) await scanner.stop(); } catch { /* ignore */ }
        }
      }

      if (cancelled) return;
      try { scanner.clear(); } catch { /* ignore */ }
      scannerRef.current = null;

      const msg = lastError instanceof Error ? lastError.message.toLowerCase() : String(lastError).toLowerCase();
      const isDenied = msg.includes('denied') || msg.includes('permission') || msg.includes('notallowed') || msg.includes('not allowed');
      const isUnsupported = msg.includes('nodevicefound') || msg.includes('no device') || msg.includes('enumerate') || msg.includes('no cameras found');
      setCameraState(isDenied ? 'denied' : isUnsupported ? 'unsupported' : 'error');
    };

    void run();
    return () => { cancelled = true; void stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, elementId, stopScanner, debounceMs]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setCameraState('paused');
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    // Reset last-processed so the same code can be re-scanned immediately after
    // the modal is dismissed (e.g. user scanned wrong QR and tries again).
    lastProcessedRef.current = null;
    setCameraState('ready');
  }, []);

  return { cameraState, scannerReady, retry, pause, resume };
}
