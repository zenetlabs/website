import type { MicResult } from '@/lib/voice-store';

// A call needs a secure page, a microphone API and WebRTC.
export function voiceSupported(): boolean {
  return (
    window.isSecureContext &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    'RTCPeerConnection' in window
  );
}

// Asks for the microphone and lets go of it at once: the SDK opens its own
// stream when the call starts. Asking first means a refusal costs nothing.
export async function requestMic(): Promise<MicResult> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) track.stop();
    return 'granted';
  } catch (error) {
    const refused =
      error instanceof DOMException &&
      (error.name === 'NotAllowedError' || error.name === 'SecurityError');
    return refused ? 'denied' : 'error';
  }
}
