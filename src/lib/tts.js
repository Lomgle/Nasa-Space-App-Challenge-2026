import { attachSpeakingFx } from './speakingFx.js';

const KOKORO_URL = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOICE = 'af_heart';   // try af_bella, af_sky, af_nicole
const PITCH = 1.1;          // 1 = normal, higher = cuter

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
  const audio = await tts.generate(message, { voice: VOICE, speed: 1 / PITCH });
  if (thisRequest !== requestId) return null;

  const url = URL.createObjectURL(audio.toBlob());
  const el = new Audio(url);
  el.preservesPitch = false;
  el.playbackRate = PITCH;
  console.log('attaching speaking effects');
  attachSpeakingFx(el);

  return {
    play() {
      if (thisRequest !== requestId) { URL.revokeObjectURL(url); return Promise.resolve(); }
      releaseAudio();
      currentAudio = el;
      currentUrl = url;
      el.addEventListener('ended', () => { if (currentAudio === el) releaseAudio(); }, { once: true });
      return el.play();
    }
  };
}

// Still available if you want the old "generate and play" behaviour elsewhere.
export async function speakText(text) {
  const speech = await prepareSpeech(text);
  if (speech) await speech.play();
}