declare module '../lib/wavtools/lib/wav_recorder' {
  export class WavRecorder {
    record(): Promise<void>;
    stop(): Promise<ArrayBuffer>;
  }
}
