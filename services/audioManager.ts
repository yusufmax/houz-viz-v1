/**
 * Audio Manager for Gemini Realtime API
 * Handles recording (Input) and playback (Output) of PCM 16-bit 24kHz audio.
 */

export class AudioManager {
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private nextStartTime: number = 0;
    private isRecording: boolean = false;

    constructor(private onAudioData: (base64PCM: string) => void) { }

    async initialize() {
        if (!this.audioContext) {
            this.audioContext = new AudioContext({ sampleRate: 24000 });
            await this.audioContext.audioWorklet.addModule(
                `data:text/javascript;base64,${btoa(audioWorkletCode)}`
            );
        }
    }

    async startRecording() {
        if (this.isRecording) return;

        await this.initialize();
        if (!this.audioContext) return;

        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);

            this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

            this.workletNode.port.onmessage = (event) => {
                const float32Array = event.data;
                const int16Array = this.convertFloat32ToInt16(float32Array);
                const base64String = this.arrayBufferToBase64(int16Array.buffer);
                this.onAudioData(base64String);
            };

            source.connect(this.workletNode);
            this.workletNode.connect(this.audioContext.destination); // Keep alive
            this.isRecording = true;
        } catch (error) {
            console.error("Error starting recording:", error);
        }
    }

    stopRecording() {
        if (!this.isRecording) return;

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        if (this.workletNode) {
            this.workletNode.disconnect();
            this.workletNode = null;
        }

        this.isRecording = false;
    }

    /**
     * Queues and plays PCM 16-bit 24kHz audio chunks.
     */
    playAudioChunk(base64PCM: string) {
        if (!this.audioContext) return;

        const arrayBuffer = this.base64ToArrayBuffer(base64PCM);
        const int16Array = new Int16Array(arrayBuffer);
        const float32Array = this.convertInt16ToFloat32(int16Array);

        const buffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
        buffer.getChannelData(0).set(float32Array);

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);

        const currentTime = this.audioContext.currentTime;
        // Ensure we schedule slightly in the future to avoid glitches, but maintain stream continuity
        const startTime = Math.max(currentTime, this.nextStartTime);

        source.start(startTime);
        this.nextStartTime = startTime + buffer.duration;
    }

    interrupt() {
        // In a real implementation, we would keep track of active source nodes and stop them.
        // For now, we just reset the timing.
        if (this.audioContext) {
            this.nextStartTime = this.audioContext.currentTime;
        }
    }

    private convertFloat32ToInt16(float32Array: Float32Array): Int16Array {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return int16Array;
    }

    private convertInt16ToFloat32(int16Array: Int16Array): Float32Array {
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            const s = int16Array[i];
            float32Array[i] = s < 0 ? s / 0x8000 : s / 0x7FFF;
        }
        return float32Array;
    }

    private arrayBufferToBase64(buffer: ArrayBufferLike): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

// Inline AudioWorklet Processor code
const audioWorkletCode = `
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      this.port.postMessage(channelData);
    }
    return true;
  }
}
registerProcessor('audio-processor', AudioProcessor);
`;
