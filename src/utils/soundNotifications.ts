// Web Audio Sound Notification Engine for Copper Waateh Platform
// High-grade synthesized audio chimes with zero external dependencies and guaranteed client-side playback

class SoundNotificationManager {
  private ctx: AudioContext | null = null;
  private isAudioUnlocked = false;

  constructor() {
    // Unlock on first user gesture
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudioContext();
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('click', unlock, { once: true, passive: true });
      window.addEventListener('touchstart', unlock, { once: true, passive: true });
      window.addEventListener('keydown', unlock, { once: true, passive: true });
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAudioContext(): boolean {
    try {
      const ctx = this.getContext();
      if (!ctx) return false;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      this.isAudioUnlocked = true;
      return true;
    } catch {
      return false;
    }
  }

  public isUnlocked(): boolean {
    return this.isAudioUnlocked && this.ctx?.state === 'running';
  }

  /**
   * Sound 1: Admin Alert for incoming client request (Deposit, Withdrawal, Buy, Sell)
   * High-priority dual melodic chime (E5 -> G#5 -> B5) designed for immediate attention
   */
  public playNewRequestAlert(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      // Melodic chime ring (Ding-Ding-Dong alert for manager)
      const notes = [
        { freq: 783.99, time: 0.0, duration: 0.22, vol: 0.45 }, // G5
        { freq: 987.77, time: 0.16, duration: 0.24, vol: 0.50 }, // B5
        { freq: 1174.66, time: 0.32, duration: 0.65, vol: 0.55 }, // D6
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        // Natural crisp chime bell envelope
        gain.gain.setValueAtTime(0.0001, now + note.time);
        gain.gain.exponentialRampToValueAtTime(note.vol, now + note.time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.duration + 0.05);
      });
    } catch (err) {
      console.warn('[SoundManager] Request alert error:', err);
    }
  }

  /**
   * Sound 2: Client Request Approved
   * Bright, cheerful ascending chime (C5 -> E5 -> G5 -> C6)
   */
  public playApprovedChime(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, duration: 0.15 }, // C5
        { freq: 659.25, time: 0.12, duration: 0.15 }, // E5
        { freq: 783.99, time: 0.24, duration: 0.20 }, // G5
        { freq: 1046.50, time: 0.38, duration: 0.60 }, // C6
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        gain.gain.setValueAtTime(0.001, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.3, now + note.time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.duration + 0.05);
      });
    } catch (err) {
      console.warn('[SoundManager] Approved chime error:', err);
    }
  }

  /**
   * Sound 3: Client Request Rejected
   * Subdued double low tone (F4 -> D4)
   */
  public playRejectedAlert(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 349.23, time: 0.0, duration: 0.22 }, // F4
        { freq: 293.66, time: 0.20, duration: 0.35 }, // D4
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        gain.gain.setValueAtTime(0.001, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.2, now + note.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.duration + 0.05);
      });
    } catch (err) {
      console.warn('[SoundManager] Rejected alert error:', err);
    }
  }
}

export const soundManager = new SoundNotificationManager();
