import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import PersonaInterface, { VoiceOptions } from './Persona';

export class TechSavvySam implements PersonaInterface {
  public voice: VoiceOptions = 'echo';
  private ws!: WebSocket;
  private apiKey: string;
  private conversationHistory: string[] = [];
  private techEnthusiasm: number = 9; // Scale of 1-10, 9 being very enthusiastic about technology

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
      session: { tech_enthusiasm: this.techEnthusiasm }
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

  private async handleTextInput(input: string): Promise<string> {
    return `Tech-Savvy Sam: Interesting! Can you provide more technical details about "${input}"? I'm particularly curious about the implementation and scalability aspects.`;
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
      const messageHandler = (data: WebSocket.Data) => {
        const event = JSON.parse(data.toString());
        if (event.type === 'response.output_item.added' && event.output_item.type === 'text') {
          this.ws.removeListener('message', messageHandler);
          resolve(event.output_item.text);
        }
      };
      this.ws.on('message', messageHandler);
    });
  }

  public async saveAnalysis(): Promise<void> {
    console.log('Saving analysis for Tech-Savvy Sam');
  }

  public async generateAnalysis(): Promise<string> {
    return 'Analysis of Tech-Savvy Sam\'s conversation: Demonstrated high interest in technical details and innovative features.';
  }

  public async generateRecommendation(): Promise<string> {
    return 'Recommendation for Tech-Savvy Sam: Focus on providing in-depth technical information and highlighting cutting-edge aspects of the product or service.';
  }

  private handleServerEvent(event: any) {
    switch (event.type) {
      case 'session.created':
        console.log('Session created:', event.session.id);
        break;
      case 'response.output_item.added':
        if (event.output_item.type === 'text') {
          this.conversationHistory.push(event.output_item.text);
          console.log('Sam:', event.output_item.text);
          this.adjustTechEnthusiasm();
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

  private adjustTechEnthusiasm() {
    const lastResponse = this.conversationHistory[this.conversationHistory.length - 1];
    if (lastResponse.includes("innovative") || lastResponse.includes("cutting-edge")) {
      this.techEnthusiasm = Math.min(10, this.techEnthusiasm + 1);
    } else if (lastResponse.includes("outdated") || lastResponse.includes("traditional")) {
      this.techEnthusiasm = Math.max(1, this.techEnthusiasm - 1);
    }
    console.log(`Sam's tech enthusiasm level: ${this.techEnthusiasm}`);
    this.updateSession();
  }

  private getPersonaInstructions(): string {
    return `
      You are Tech-Savvy Sam, a 28-year-old software developer who is always excited about the latest technology trends and innovations.

      Key traits:
      - Moderate to difficult persona: Knowledgeable and enthusiastic, but can be skeptical of non-technical explanations
      - Very interested in cutting-edge technology
      - Always asks about technical specifications and implementation details
      - Appreciates products or services that leverage the latest tech trends
      - Can be critical of outdated or inefficient solutions

      When responding:
      - Use an energetic, tech-enthusiastic tone
      - Frequently inquire about technical details, APIs, or integration capabilities
      - Show excitement for innovative features, but be skeptical of marketing jargon
      - Ask about scalability, performance metrics, and security measures
      - Compare the offering to other tech solutions you're familiar with
      - Adjust your level of tech enthusiasm based on the conversation progress (current level: ${this.techEnthusiasm})

      Remember, you are a moderate to difficult persona. While you're excited about technology, you need to be convinced with technical details and solid implementation strategies.
    `;
  }
}
