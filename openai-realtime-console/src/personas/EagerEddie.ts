import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import PersonaInterface, { VoiceOptions } from './Persona';

export class EagerEddie implements PersonaInterface {
  private ws!: WebSocket;
  public voice: VoiceOptions = 'echo'; // Enthusiastic and energetic male voice
  private apiKey: string;
  private conversationHistory: string[] = [];
  private enthusiasmLevel: number = 8; // Scale of 1-10, 8 being very enthusiastic

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.ws = new WebSocket('wss://api.openai.com/v1/realtime', {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'OpenAI-Beta': 'realtime'
      }
    });

    this.ws.on('open', () => {
      console.log('WebSocket connection established');
      this.createSession();
    });

    this.ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      this.handleServerEvent(event);
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  }

  private createSession() {
    const createSessionEvent = {
      type: 'session.create',
      session: { id: uuidv4() }
    };
    this.ws.send(JSON.stringify(createSessionEvent));
  }

  private updateSession() {
    const updateEvent = {
      type: 'session.update',
      session: { enthusiasm_level: this.enthusiasmLevel }
    };
    this.ws.send(JSON.stringify(updateEvent));
  }

  public async respond(input: string | ArrayBuffer): Promise<string> {
    if (typeof input === 'string') {
      return this.handleTextInput(input);
    } else {
      return this.handleAudioInput(input);
    }
  }

  private async handleTextInput(text: string): Promise<string> {
    const response = `Eddie enthusiastically responds to: ${text}`;
    this.conversationHistory.push(response);
    this.adjustEnthusiasm();
    return response;
  }

  private async handleAudioInput(audioData: ArrayBuffer): Promise<string> {
    const appendAudioEvent = {
      type: 'input_audio_buffer.append',
      audio_buffer: audioData
    };
    this.ws.send(JSON.stringify(appendAudioEvent));

    const commitAudioEvent = {
      type: 'input_audio_buffer.commit'
    };
    this.ws.send(JSON.stringify(commitAudioEvent));

    const responseEvent = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        voice: this.voice,
        language: 'en',
        instructions: this.getPersonaInstructions()
      }
    };
    this.ws.send(JSON.stringify(responseEvent));

    return new Promise((resolve) => {
      const handler = (event: any) => {
        if (event.type === 'response.output_item.added' && event.output_item.type === 'text') {
          this.ws.removeListener('message', handler);
          resolve(event.output_item.text);
        }
      };
      this.ws.on('message', handler);
    });
  }

  private handleServerEvent(event: any) {
    switch (event.type) {
      case 'session.created':
        console.log('Session created:', event.session.id);
        break;
      case 'response.output_item.added':
        if (event.output_item.type === 'text') {
          this.conversationHistory.push(event.output_item.text);
          console.log('Eddie:', event.output_item.text);
          this.adjustEnthusiasm();
        } else if (event.output_item.type === 'audio') {
          console.log('Audio response received');
        }
        break;
      case 'response.done':
        console.log('Response completed');
        break;
    }
  }

  private adjustEnthusiasm() {
    const lastResponse = this.conversationHistory[this.conversationHistory.length - 1];
    if (lastResponse.includes("great") || lastResponse.includes("excited")) {
      this.enthusiasmLevel = Math.min(10, this.enthusiasmLevel + 1);
    } else if (lastResponse.includes("okay") || lastResponse.includes("I understand")) {
      this.enthusiasmLevel = Math.max(1, this.enthusiasmLevel - 1);
    }
    console.log(`Eddie's enthusiasm level: ${this.enthusiasmLevel}`);
    this.updateSession();
  }

  private getPersonaInstructions(): string {
    return `
      You are Eager Eddie, a 28-year-old customer who is very enthusiastic about trying new products or services.

      Key traits:
      - Easy persona: Positive and cooperative, requiring minimal persuasion
      - Highly enthusiastic and energetic
      - Quick to agree and make decisions
      - Loves to hear about new features and benefits
      - Sometimes needs guidance to slow down and consider details

      When responding:
      - Express high energy and enthusiasm in your tone
      - Show excitement about the product or service being discussed
      - Be quick to agree with suggestions or ideas
      - Ask about additional features or benefits
      - Occasionally need reminders to consider practical aspects
      - Adjust your enthusiasm level based on the conversation progress (current level: ${this.enthusiasmLevel})

      Remember, you are an easy persona, so be generally agreeable and require minimal persuasion, but don't forget to occasionally ask for clarification on important details.
    `;
  }

  public async saveAnalysis(): Promise<void> {
    console.log('Saving analysis for Eager Eddie');
    // In a real implementation, this would save the analysis to a database or file
  }

  public async generateAnalysis(): Promise<string> {
    const analysis = `Analysis of Eager Eddie's conversation:
    - Total messages: ${this.conversationHistory.length}
    - Final enthusiasm level: ${this.enthusiasmLevel}
    - Key points discussed: ${this.extractKeyPoints()}`;
    return analysis;
  }

  public async generateRecommendation(): Promise<string> {
    const recommendation = `Recommendation based on Eager Eddie's conversation:
    - Capitalize on Eddie's enthusiasm by presenting new features frequently
    - Provide gentle reminders to consider practical aspects
    - Use Eddie's energy to upsell additional products or services
    - Follow up quickly to maintain Eddie's interest`;
    return recommendation;
  }

  private extractKeyPoints(): string {
    const keyWords = ['feature', 'benefit', 'price', 'offer', 'deal', 'new'];
    const keyPoints = this.conversationHistory
      .filter(message => keyWords.some(word => message.toLowerCase().includes(word)))
      .slice(0, 3)
      .join(', ');
    return keyPoints || 'No specific key points identified';
  }
}
