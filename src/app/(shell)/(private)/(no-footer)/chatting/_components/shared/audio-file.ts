/**
 * Client-side mirror of the uploader limits (`mutler-s3-uploader.ts` fileFilter
 * + multer 50 MB) so a doomed upload fails before it is sent.
 */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/3gpp",
  "audio/amr",
  "audio/opus",
]);

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function isAcceptedAudioFile(file: File): boolean {
  if (file.size > MAX_UPLOAD_BYTES) return false;
  // Same rule the server applies: compare the base type, so MediaRecorder
  // codec suffixes ("audio/webm;codecs=opus") still pass while formats the
  // uploader rejects fail here instead of after a full upload.
  const baseType = file.type.split(";")[0].trim().toLowerCase();
  return !baseType || AUDIO_MIME_TYPES.has(baseType);
}

export function isAcceptedImageFile(file: File): boolean {
  return file.size <= MAX_UPLOAD_BYTES && IMAGE_MIME_TYPES.has(file.type);
}

/**
 * The backend requires `duration` but offers no transcoding on the client, so
 * read it from the file itself before the multipart request.
 */
export function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();

    const cleanup = () => {
      audio.removeAttribute("src");
      URL.revokeObjectURL(url);
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      cleanup();

      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Invalid audio duration"));
        return;
      }

      resolve(duration);
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("Could not read audio duration"));
    };
    audio.src = url;
  });
}
