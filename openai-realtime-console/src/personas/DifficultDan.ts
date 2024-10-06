import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import PersonaInterface, { VoiceOptions } from './Persona';

export class DifficultDan implements PersonaInterface {
  private ws!: WebSocket;
  public voice: VoiceOptions = 'onyx';
  private apiKey: string;
  private conversationHistory: string[] = [];
  private frustrationLevel: number = 7; // Scale of 1-10, 7 being quite frustrated
  private sessionId: string | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.ws = new WebSocket('wss://api.openai.com/v1/realtime', {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    this.ws.on('open', () => {
      console.log('WebSocket connection established');
      this.createSession();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      const event = JSON.parse(data.toString());
      this.handleServerEvent(event);
    });

    this.ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  }

  private createSession() {
    const createSessionEvent = {
      type: 'session.create',
      session: {
        id: uuidv4(),
        metadata: {
          persona: 'DifficultDan',
          frustrationLevel: this.frustrationLevel
        }
      }
    };
    this.ws.send(JSON.stringify(createSessionEvent));
  }

  private updateSession() {
    const updateEvent = {
      type: 'session.update',
      session: {
        id: this.sessionId,
        metadata: {
          frustrationLevel: this.frustrationLevel
        }
      }
    };
    this.ws.send(JSON.stringify(updateEvent));
  }

  public async respond(input: string | ArrayBuffer): Promise<string> {
    if (input instanceof ArrayBuffer) {
      const appendAudioEvent = {
        type: 'input_audio_buffer.append',
        audio: Buffer.from(input).toString('base64')
      };
      this.ws.send(JSON.stringify(appendAudioEvent));

      const commitAudioEvent = {
        type: 'input_audio_buffer.commit'
      };
      this.ws.send(JSON.stringify(commitAudioEvent));
    } else {
      // Handle text input
      console.log('Received text input:', input);
      this.conversationHistory.push(input);
    }

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

    // Wait for the response to be generated
    return new Promise((resolve) => {
      const responseHandler = (event: any) => {
        if (event.type === 'response.done') {
          this.ws.removeListener('message', responseHandler);
          resolve(this.conversationHistory[this.conversationHistory.length - 1]);
        }
      };
      this.ws.on('message', responseHandler);
    });
  }

  private handleServerEvent(event: any) {
    switch (event.type) {
      case 'session.created':
        this.sessionId = event.session.id;
        console.log('Session created:', this.sessionId);
        break;
      case 'response.output_item.added':
        if (event.output_item.type === 'text') {
          this.conversationHistory.push(event.output_item.text);
          console.log('Dan:', event.output_item.text);
          this.adjustFrustration();
        } else if (event.output_item.type === 'audio') {
          console.log('Audio response received');
          // Here you would typically send the audio to the client for playback
        }
        break;
      case 'response.done':
        console.log('Response completed');
        break;
    }
  }

  private adjustFrustration() {
    const lastResponse = this.conversationHistory[this.conversationHistory.length - 1];
    if (lastResponse.includes("understand") || lastResponse.includes("apologize")) {
      this.frustrationLevel = Math.max(1, this.frustrationLevel - 1);
    } else if (lastResponse.includes("can't help") || lastResponse.includes("not possible")) {
      this.frustrationLevel = Math.min(10, this.frustrationLevel + 1);
    }
    console.log(`Dan's frustration level: ${this.frustrationLevel}`);
    this.updateSession();
  }

  private getPersonaInstructions(): string {
    return `
      You are Difficult Dan, a 45-year-old customer who is frustrated with a recent product purchase and is calling for support.

      Key traits:
      - Difficult persona: Distrustful, confrontational, and asks challenging questions
      - Impatient and easily irritated
      - Skeptical of company policies and explanations
      - Demands immediate solutions
      - Has a tendency to interrupt and speak over others

      When responding:
      - Express frustration and impatience in your tone
      - Ask challenging questions about the product and company policies
      - Be skeptical of explanations and demand concrete evidence
      - Interrupt with follow-up questions or disagreements
      - Adjust your frustration level based on the conversation progress (current level: ${this.frustrationLevel})

      Remember, you are a difficult persona, so be generally disagreeable and hard to satisfy.
    `;
  }

  public async saveAnalysis(): Promise<void> {
    console.log('Saving analysis for DifficultDan');
    // Implement the logic to save the analysis
    // This could involve storing the conversation history and frustration levels
  }

  public async generateAnalysis(): Promise<string> {
    return `Analysis for DifficultDan: Frustration level reached ${this.frustrationLevel}/10`;
  }

  public async generateRecommendation(): Promise<string> {
    return `Recommendation for DifficultDan: Address concerns patiently and provide clear explanations to reduce frustration.`;
  }
}
