import { VoiceOptions } from '../personas/VoiceOptions';

declare module '@openai/realtime-api-beta' {
  export class RealtimeClient {
    conversation(): Conversation;
  }

  export interface Conversation {
    sendAudio(audio: ArrayBuffer): Promise<void>;
    sendMessage(message: string, options: { model: string; voice: VoiceOptions }): Promise<void>;
    iterateMessages(): AsyncIterableIterator<Message>;
  }

  export interface Message {
    role: 'user' | 'assistant';
    content: string | ArrayBuffer;
  }
}

declare global {
  class WavRecorder {
    record(): Promise<void>;
    stop(): Promise<ArrayBuffer>;
  }
}
