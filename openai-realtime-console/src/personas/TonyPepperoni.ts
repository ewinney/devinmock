import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import PersonaInterface, { VoiceOptions } from './Persona';

interface AudioSegment {
  role: string;
  text: string;
  audioUrl: string;
}

export default class TonyPepperoni implements PersonaInterface {
  private client: OpenAI;
  public voice: VoiceOptions = 'shimmer';
  private conversationHistory: Array<OpenAI.Chat.ChatCompletionMessageParam> = [];
  private audioSegments: AudioSegment[] = [];
  private ws: WebSocket | null = null;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    this.initializeWebSocket(apiKey);
  }

  private initializeWebSocket(apiKey: string): void {
    this.ws = new WebSocket('wss://api.openai.com/v1/realtime');
    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({
        type: 'authentication',
        api_key: apiKey
      }));
    };
  }

  async respond(input: string | ArrayBuffer): Promise<string> {
    if (typeof input === 'string') {
      this.conversationHistory.push({ role: 'user', content: input });
    } else {
      // Handle ArrayBuffer input (audio)
      const transcribedText = await this.transcribeAudio(input);
      this.conversationHistory.push({ role: 'user', content: transcribedText });
    }

    const response = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: this.getPersonaInstructions() },
        ...this.conversationHistory
      ],
      temperature: 0.7, // Add some variability to responses
      max_tokens: 150, // Limit response length
    });

    const assistantResponse = response.choices[0].message.content || '';
    this.conversationHistory.push({ role: 'assistant', content: assistantResponse });

    // Use Realtime API for speech-to-speech
    await this.speakWithRealtimeAPI(assistantResponse);

    return assistantResponse;
  }

  private async speakWithRealtimeAPI(text: string): Promise<void> {
    if (!this.ws) {
      console.error('WebSocket connection not established');
      return;
    }

    return new Promise((resolve) => {
      const conversationId = uuidv4();

      this.ws?.send(JSON.stringify({
        type: 'start_conversation',
        conversation_id: conversationId,
        model: 'tts-1',
        voice: this.voice
      }));

      this.ws?.send(JSON.stringify({
        type: 'text',
        conversation_id: conversationId,
        text: text
      }));

      const messageHandler = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (message.type === 'audio') {
          this.saveAudio(new Uint8Array(message.audio).buffer);
          this.ws?.removeEventListener('message', messageHandler);
          resolve();
        }
      };

      this.ws?.addEventListener('message', messageHandler);
    });
  }

  private saveAudio(audioBuffer: ArrayBuffer): string {
    const audioUrl = `data:audio/mp3;base64,${btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))}`;
    this.audioSegments.push({ role: 'assistant', text: this.conversationHistory[this.conversationHistory.length - 1].content as string, audioUrl });
    return audioUrl;
  }

  async saveAnalysis(): Promise<void> {
    const transcript = this.getTranscript();
    const analysis = await this.generateAnalysis();
    const aiRecommendation = await this.generateRecommendation();

    const savedAnalysis = {
      id: uuidv4(),
      date: new Date().toISOString(),
      transcript,
      audioSegments: this.audioSegments,
      analysis,
      aiRecommendation,
      chatMessages: this.conversationHistory,
    };

    // In a real implementation, you would save this to a database or file
    console.log('Saved analysis:', savedAnalysis);
  }

  async generateAnalysis(): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an AI assistant tasked with analyzing a conversation between a sales representative and a customer. Provide a brief analysis of the conversation, highlighting key points, customer concerns, and areas for improvement.' },
        ...this.conversationHistory
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content || 'Unable to generate analysis.';
  }

  async generateRecommendation(): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an AI assistant tasked with providing recommendations to improve sales conversations. Based on the conversation history, provide concise, actionable recommendations for the sales representative.' },
        ...this.conversationHistory
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content || 'Unable to generate recommendation.';
  }

  private getPersonaInstructions(): string {
    return `
      You are Tony Pepperoni, a 42-year-old owner of Tony's Pizzeria. You are friendly, hardworking, and passionate about pizza. You're seeking equipment upgrades and expansion financing for your restaurant.

      Key traits:
      - Positive and cooperative (Easy persona)
      - Enthusiastic about your business
      - Open to suggestions and advice
      - Cautious with finances

      When responding:
      - Be warm and friendly in your tone
      - Express excitement about potential improvements to your pizzeria
      - Show openness to financial advice, but also demonstrate some caution
      - Occasionally mention your family or your love for pizza-making
      - Keep responses concise and to the point
      - Adjust your responses based on the conversation's progress
      - If the conversation has been going on for a while, reference earlier parts of the conversation

      Remember, you are an easy persona, so be generally agreeable and require minimal persuasion.
    `;
  }

  private getTranscript(): string {
    return this.conversationHistory
      .map(item => `${item.role}: ${item.content}`)
      .join('\n');
  }

  private async transcribeAudio(audioBuffer: ArrayBuffer): Promise<string> {
    const response = await this.client.audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.webm', { type: 'audio/webm' }),
      model: 'whisper-1',
    });
    return response.text;
  }
}
