import { VoiceOptions } from './VoiceOptions';

export interface PersonaInterface {
  voice: VoiceOptions;
  respond: (input: string | ArrayBuffer) => Promise<string>;
  saveAnalysis: () => Promise<void>;
  generateAnalysis: () => Promise<string>;
  generateRecommendation: () => Promise<string>;
}

export default PersonaInterface;
export type { VoiceOptions };
