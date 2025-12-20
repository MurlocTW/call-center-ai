const toggleButton = document.getElementById('toggleButton');
const statusMessage = document.getElementById('statusMessage');
const reportDiv = document.getElementById('report');

let isRecording = false;
let websocket = null;
let audioContext = null;
let mediaStream = null;
let mediaProcessor = null;
let audioQueueTime = 0;

async function startRecording() {
  isRecording = true;
  toggleButton.textContent = 'Stop Conversation';
  statusMessage.textContent = 'Recording...';

  // Initialize AudioContext with 16kHz sample rate (Azure Speech Services format)
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    audioQueueTime = audioContext.currentTime;
  }

  // Open WebSocket connection to ccai backend
  const mainHost = window.location.host;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  websocket = new WebSocket(`${protocol}//${mainHost}/webmic/wss`);

  websocket.onopen = () => {
    console.log('WebSocket connection opened');
    statusMessage.textContent = 'Connected - Speak now...';
  };

  websocket.onmessage = event => {
    // Expecting raw PCM audio data or JSON messages
    if (event.data instanceof Blob) {
      // Binary audio data
      event.data.arrayBuffer().then(buffer => {
        playAudio(buffer);
      });
    } else {
      // Text message (JSON)
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
        handleWebSocketMessage(message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    }
  };

  websocket.onclose = () => {
    console.log('WebSocket connection closed');
    if (isRecording) {
      stopRecording();
    }
  };

  websocket.onerror = event => {
    console.error('WebSocket error:', event);
    statusMessage.textContent = 'Connection error';
  };

  // Start recording audio from microphone
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(mediaStream);

    mediaProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    source.connect(mediaProcessor);
    mediaProcessor.connect(audioContext.destination);

    mediaProcessor.onaudioprocess = e => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32Array to Int16Array (PCM 16-bit)
        const int16Data = float32ToInt16(inputData);
        // Send raw binary data
        websocket.send(int16Data.buffer);
      }
    };
  } catch (error) {
    console.error('Error accessing microphone:', error);
    statusMessage.textContent = 'Microphone access denied';
    stopRecording();
  }
}

function stopRecording() {
  isRecording = false;
  toggleButton.textContent = 'Start Conversation';
  statusMessage.textContent = 'Stopped';

  if (mediaProcessor) {
    mediaProcessor.disconnect();
    mediaProcessor.onaudioprocess = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }

  if (websocket) {
    websocket.close();
    websocket = null;
  }
}

function onToggleListening() {
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
}

toggleButton.addEventListener('click', onToggleListening);

function handleWebSocketMessage(message) {
  // Handle JSON messages from server (if any)
  switch (message.type) {
    case 'audio':
      // Base64 encoded audio
      if (message.data) {
        const binary = atob(message.data);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        playAudio(bytes.buffer);
      }
      break;
    case 'transcript':
      // Display transcript if provided
      console.log('Transcript:', message.text);
      break;
    case 'error':
      console.error('Error from server:', message.message);
      statusMessage.textContent = 'Error: ' + message.message;
      break;
    default:
      console.log('Unhandled message type:', message.type);
  }
}

let assistantAudioSources = [];

function playAudio(arrayBuffer) {
  const int16Array = new Int16Array(arrayBuffer);

  // Convert Int16Array to Float32Array
  const float32Array = int16ToFloat32(int16Array);

  // Create an AudioBuffer and play it
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    audioQueueTime = audioContext.currentTime;
  }

  const audioBuffer = audioContext.createBuffer(1, float32Array.length, 16000);
  audioBuffer.copyToChannel(float32Array, 0);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);

  // Schedule the audio chunk to play at the correct time
  const currentTime = audioContext.currentTime;
  const startTime = Math.max(audioQueueTime, currentTime + 0.05);
  source.start(startTime);

  // Keep track of audio sources
  assistantAudioSources.push(source);

  // Update the audioQueueTime to the end of this buffer
  audioQueueTime = startTime + audioBuffer.duration;

  source.onended = () => {
    // Remove source from array when it finishes playing
    assistantAudioSources = assistantAudioSources.filter(s => s !== source);
  };
}

function stopAssistantAudio() {
  // Stop all assistant audio sources
  assistantAudioSources.forEach(source => {
    try {
      source.stop();
    } catch (e) {
      console.error('Error stopping audio source:', e);
    }
  });
  assistantAudioSources = [];
  if (audioContext) {
    audioQueueTime = audioContext.currentTime;
  }
}

function float32ToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

function int16ToFloat32(int16Array) {
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    let int = int16Array[i];
    // Convert back to float
    let float = int < 0 ? int / 0x8000 : int / 0x7fff;
    float32Array[i] = float;
  }
  return float32Array;
}
