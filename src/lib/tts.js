const TTS_URL = 'http://127.0.0.1:8081/v1/audio/speech';
const TTS_VOICE = 'vivian';

let currentAudio = null;
let currentAudioUrl = null;
let requestId = 0;

function releaseAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
}

export function stopSpeaking() {
  requestId++;
  releaseAudio();
}

// Generates the audio but does NOT play it yet.
// Returns { play() }, or null if there is nothing to say.
export async function prepareSpeech(text, timeoutMs = 20000) {
  const message = String(text || '')
    .replace(/[\p{Extended_Pictographic}*_#`]/gu, '')
    .trim();
  if (!message) return null;

  const thisRequest = requestId;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        input: message,
        voice: TTS_VOICE,
        language: 'English',
        response_format: 'wav'
      })
    });

    if (!response.ok) throw new Error(`TTS server error: ${response.status}`);

    const blob = await response.blob();
    if (thisRequest !== requestId) return null; // a newer request replaced this one

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = 'auto';

    return {
      play() {
        if (thisRequest !== requestId) {
          URL.revokeObjectURL(url);
          return Promise.resolve();
        }
        releaseAudio();
        currentAudio = audio;
        currentAudioUrl = url;
        const cleanup = () => {
          if (currentAudio === audio) {
            currentAudio = null;
            currentAudioUrl = null;
          }
          URL.revokeObjectURL(url);
        };
        audio.addEventListener('ended', cleanup, { once: true });
        audio.addEventListener('error', cleanup, { once: true });
        return audio.play();
      }
    };
  } finally {
    clearTimeout(timer);
  }
}

// Still available if you want the old "generate and play" behaviour elsewhere.
export async function speakText(text) {
  const speech = await prepareSpeech(text);
  if (speech) await speech.play();
}