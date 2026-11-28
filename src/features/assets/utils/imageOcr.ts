const OCR_TIMEOUT_MS = 20_000;

/**
 * Extracts readable text from an uploaded airframe photo or certificate image in the browser using
 * Tesseract.js so scanning works even when server Vision AI is disabled.
 */
export async function extractImageText(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || typeof Worker === 'undefined') {
    return '';
  }

  let worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>> | null = null;
  try {
    const { createWorker } = await import('tesseract.js');
    worker = await createWorker('eng');
    const timeoutPromise = new Promise<string>((resolve) => {
      window.setTimeout(() => resolve(''), OCR_TIMEOUT_MS);
    });
    const ocrPromise = worker
      .recognize(file)
      .then((result) => result.data.text?.trim() ?? '');
    return await Promise.race([ocrPromise, timeoutPromise]);
  } catch {
    return '';
  } finally {
    if (worker) {
      await worker.terminate().catch(() => undefined);
    }
  }
}
