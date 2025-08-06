
let audioCtx: AudioContext | null = null;
let isSpeechInitialized = false;

export const initializeAudio = () => {
    if (typeof window !== 'undefined' && !audioCtx) {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioCtx = new AudioContext();
            // Play a silent sound to unlock audio on mobile browsers
            const buffer = audioCtx.createBuffer(1, 1, 22050);
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start(0);
        } catch(e) {
            console.error("Could not initialize AudioContext", e);
        }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && !isSpeechInitialized) {
        // Warm up speech synthesis
        window.speechSynthesis.getVoices();
        isSpeechInitialized = true;
    }
};

export const playBeep = (volume = 0.5) => {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.value = volume;
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1);
    oscillator.stop(audioCtx.currentTime + 1);
};

export const speakText = (text: string, lang = 'tr-TR', volume = 0.5) => {
    // SSR-safe: ensure window and speechSynthesis exist
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.volume = volume;
    window.speechSynthesis.speak(utter);
};
