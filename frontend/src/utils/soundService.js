// Audio & Speech Synthesis Service for Kiosk & System Feedback

class SoundService {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.language = 'en-US'; // or 'hi-IN'
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  setMuted(muted) {
    this.isMuted = muted;
  }

  setLanguage(lang) {
    this.language = lang;
  }

  playSuccessChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      
      // Dual tone pleasant chime (E5 -> G#5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.exponentialRampToValueAtTime(830.61, now + 0.15); // G#5

      osc2.frequency.setValueAtTime(659.25, now);
      osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.2); // C6

      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio chime playback failed:', e);
    }
  }

  playWarningChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.setValueAtTime(200, now + 0.15);

      gainNode.gain.setValueAtTime(0.25, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn('Audio chime playback failed:', e);
    }
  }

  playAlreadyMarkedChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(523.25, now + 0.1);
      osc.frequency.setValueAtTime(659.25, now + 0.2); // E5

      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      console.warn('Audio chime playback failed:', e);
    }
  }

  speakGreeting(name, status, timeStr) {
    if (this.isMuted) return;
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Clear any ongoing speech

      let text = '';
      if (this.language === 'hi-IN') {
        if (status === 'Late') {
          text = `नमस्ते ${name}, आपकी उपस्थिति दर्ज कर ली गई है। आप लेट हैं।`;
        } else {
          text = `नमस्ते ${name}, आपकी उपस्थिति सफलतापूर्वक दर्ज हो गई है।`;
        }
      } else {
        if (status === 'Late') {
          text = `Welcome, ${name}! Attendance marked as Late at ${timeStr}.`;
        } else {
          text = `Welcome, ${name}! Attendance marked successfully. Have a great day!`;
        }
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.lang = this.language;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Text-to-speech failed:', e);
    }
  }

  speakAlreadyMarked(name) {
    if (this.isMuted) return;
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const text = this.language === 'hi-IN' 
        ? `${name}, आपकी उपस्थिति पहले ही दर्ज की जा चुकी है।`
        : `${name}, your attendance is already marked for today.`;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.lang = this.language;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Text-to-speech failed:', e);
    }
  }
}

export const soundService = new SoundService();
