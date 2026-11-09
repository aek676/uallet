import { BarcodeDetector, prepareZXingModule } from "barcode-detector/ponyfill";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

// Serve the .wasm from our app instead of the default CDN.
prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) =>
      path.endsWith(".wasm") ? wasmUrl : `${prefix}${path}`,
  },
});

/**
 * QR reader. The ponyfill rather than the native API: iOS and Firefox don't
 * have it, and this way every device reads the same. Import this module
 * dynamically: only the scanner needs it. The .wasm is fetched when the
 * detector is created.
 */
export function createQrDetector(): BarcodeDetector {
  return new BarcodeDetector({ formats: ["qr_code"] });
}
