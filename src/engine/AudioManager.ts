export class AudioManager {
    private ctx: AudioContext | null = null;
    private music: HTMLAudioElement | null = null;
    settings = {
        sfxVolume: 0.3,
        musicVolume: 0.2,
        muted: false
    };

    constructor() {
        // Init on first interaction usually, but we can setup the object
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error('AudioContext not supported');
        }
    }

    private ensureContext() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playClick() {
        if (this.settings.muted || !this.ctx) return;
        this.ensureContext();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(this.settings.sfxVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playVirusDeath() {
        if (this.settings.muted || !this.ctx) return;
        this.ensureContext();

        // Noise burst approximation using oscillator modulation
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const mod = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();

        mod.connect(modGain);
        modGain.connect(osc.frequency);
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.value = 150;

        mod.type = 'square';
        mod.frequency.value = 1000;
        modGain.gain.value = 500;

        gain.gain.setValueAtTime(this.settings.sfxVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.start();
        mod.start();
        osc.stop(this.ctx.currentTime + 0.2);
        mod.stop(this.ctx.currentTime + 0.2);
    }

    playLand() {
        if (this.settings.muted || !this.ctx) return;
        this.ensureContext();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        gain.gain.setValueAtTime(this.settings.sfxVolume * 0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playGameOver() {
        if (this.settings.muted || !this.ctx) return;
        this.ensureContext();
        // Sad melody
        const now = this.ctx.currentTime;
        [440, 392, 349, 329].forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.connect(gain);
            gain.connect(this.ctx!.destination);

            osc.frequency.value = freq;
            gain.gain.setValueAtTime(this.settings.sfxVolume, now + i * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.3 + 0.25);

            osc.start(now + i * 0.3);
            osc.stop(now + i * 0.3 + 0.3);
        });
    }

    playMusic(url: string = '/assets/fever.mp3') {
        if (!this.music) {
            this.music = new window.Audio(url);
            this.music.loop = true;
        }
        this.updateMusicVolume();
        // User interaction required for this usually
        this.music.play().catch(e => console.log('Music play failed (needs interaction):', e));
    }

    stopMusic() {
        if (this.music) {
            this.music.pause();
            this.music.currentTime = 0;
        }
    }

    setMuted(mute: boolean) {
        this.settings.muted = mute;
        this.updateMusicVolume();
    }

    private updateMusicVolume() {
        if (this.music) {
            this.music.volume = this.settings.muted ? 0 : this.settings.musicVolume;
        }
    }
}

export const GameAudio = new AudioManager();
