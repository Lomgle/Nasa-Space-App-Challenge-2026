import { attachSpeakingFx } from './speakingFx.js';

const KOKORO_URL = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOICE = 'af_heart';   // try af_bella, af_sky, af_nicole
const PITCH = 1.1;          // 1 = normal, higher = cuter

let currentAudio = null;
let currentAudioUrl = null;
let requestId = 0;
let speechWorker = null;
let speechWorkerUrl = null;
let nextSpeechId = 0;
let fallbackTtsPromise = null;
let preloadPromise = null;
const pendingSpeech = new Map();

function createSpeechWorker() {
  const source = `
    import { KokoroTTS } from "${KOKORO_URL}";

    const MODEL_ID = "${MODEL_ID}";
    const VOICE = "${VOICE}";
    let ttsPromise = null;
    let queue = Promise.resolve();

    function getTts() {
      if (!ttsPromise) {
        ttsPromise = KokoroTTS.from_pretrained(MODEL_ID, { dtype: "q8" })
          .catch((error) => {
            ttsPromise = null;
            throw error;
          });
      }
      return ttsPromise;
    }

    self.addEventListener("message", (event) => {
      const { id, text, speed, preload } = event.data;
      queue = queue.then(async () => {
        try {
          const tts = await getTts();
          if (preload) {
            self.postMessage({ id, ready: true });
            return;
          }
          const audio = await tts.generate(text, { voice: VOICE, speed });
          self.postMessage({ id, audio: audio.toBlob() });
        } catch (error) {
          self.postMessage({ id, error: error.message || String(error) });
        }
      });
    });
  `;
  speechWorkerUrl = URL.createObjectURL(
    new Blob([source], { type: "text/javascript" }),
  );
  speechWorker = new Worker(speechWorkerUrl, { type: "module" });
  speechWorker.addEventListener("message", ({ data }) => {
    const pending = pendingSpeech.get(data.id);
    if (!pending) return;
    pendingSpeech.delete(data.id);
    if (data.error) pending.reject(new Error(data.error));
    else pending.resolve(data.audio);
  });
  speechWorker.addEventListener("error", (event) => {
    event.preventDefault();
    speechWorker?.terminate();
    speechWorker = null;
    if (speechWorkerUrl) URL.revokeObjectURL(speechWorkerUrl);
    speechWorkerUrl = null;
    for (const pending of pendingSpeech.values())
      pending.reject(new Error(event.message || "Speech generation failed."));
    pendingSpeech.clear();
  });
  return speechWorker;
}

async function getFallbackTts() {
  if (!fallbackTtsPromise) {
    fallbackTtsPromise = (async () => {
      try {
        const { KokoroTTS } = await import(KOKORO_URL);
        return await KokoroTTS.from_pretrained(MODEL_ID, { dtype: "q8" });
      } catch (error) {
        fallbackTtsPromise = null;
        throw error;
      }
    })();
  }
  return fallbackTtsPromise;
}

async function generateSpeech(message) {
  const id = ++nextSpeechId;
  try {
    const worker = speechWorker || createSpeechWorker();
    return await new Promise((resolve, reject) => {
      pendingSpeech.set(id, { resolve, reject });
      worker.postMessage({ id, text: message, speed: 1 / PITCH });
    });
  } catch (error) {
    pendingSpeech.delete(id);
    console.warn("Speech worker unavailable; using browser fallback.", error);
    const tts = await getFallbackTts();
    const audio = await tts.generate(message, {
      voice: VOICE,
      speed: 1 / PITCH,
    });
    return audio.toBlob();
  }
}

export function preloadSpeech() {
  if (preloadPromise) return preloadPromise;
  const id = ++nextSpeechId;
  preloadPromise = new Promise((resolve, reject) => {
    try {
      const worker = speechWorker || createSpeechWorker();
      pendingSpeech.set(id, { resolve, reject });
      worker.postMessage({ id, preload: true });
    } catch (error) {
      reject(error);
    }
  }).catch((error) => {
    preloadPromise = null;
    throw error;
  });
  return preloadPromise;
}

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
  const audio = await generateSpeech(message);
  if (thisRequest !== requestId) return null;

  const url = URL.createObjectURL(audio);
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
      currentAudioUrl = url;
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