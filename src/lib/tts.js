const KOKORO_URL = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOICE = 'af_sky';   // try af_bella, af_sky, af_nicole

let tts = null;
let loading = null;
let currentAudio = null;
let currentUrl = null;
let requestId = 0;

function loadModel() {
  if (!loading) {
    loading = import(KOKORO_URL)
      .then(({ KokoroTTS }) => KokoroTTS.from_pretrained(MODEL_ID, { dtype: 'q8', device: 'wasm' }))
      .then(model => { tts = model; console.log('AURA voice ready'); })
      .catch(err => { loading = null; console.warn('AURA voice failed to load:', err); });
  }
  return loading;
}
loadModel();

function releaseAudio() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = null; }
}

export function stopSpeaking() {
  requestId++;
  releaseAudio();
}

export async function prepareSpeech(text) {
  if (!tts) return null;
  const message = String(text || '').replace(/[\p{Extended_Pictographic}*_#`]/gu, '').trim();
  if (!message) return null;

  const thisRequest = requestId;
  const audio = await tts.generate(message, { voice: VOICE });
  if (thisRequest !== requestId) return null;

  const url = URL.createObjectURL(audio.toBlob());
  const el = new Audio(url);
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

export async function speakText(text) {
  const speech = await prepareSpeech(text);
  if (speech) await speech.play();
}