import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import PersonaInterface, { VoiceOptions } from './Persona';

export class CuriousCarla implements PersonaInterface {
  private ws!: WebSocket;
  public voice: VoiceOptions = 'nova'; // Curious and engaging female voice
  private apiKey: string;
  private conversationHistory: string[] = [];
  private curiosityLevel: number = 7; // Scale of 1-10, 7 being quite curious

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
      session: { curiosity_level: this.curiosityLevel }
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
    // For now, we'll just return a simple response
    const response = `Curious Carla: That's interesting! Can you tell me more about "${text}"?`;
    this.conversationHistory.push(response);
    this.adjustCuriosity();
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

    // We'll return a promise that resolves when we receive the response
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

  private handleServerEvent(event: any) {
    switch (event.type) {
      case 'session.created':
        console.log('Session created:', event.session.id);
        break;
      case 'response.output_item.added':
        if (event.output_item.type === 'text') {
          this.conversationHistory.push(event.output_item.text);
          console.log('Carla:', event.output_item.text);
          this.adjustCuriosity();
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

  private adjustCuriosity() {
    const lastResponse = this.conversationHistory[this.conversationHistory.length - 1];
    if (lastResponse.includes("interesting") || lastResponse.includes("tell me more")) {
      this.curiosityLevel = Math.min(10, this.curiosityLevel + 1);
    } else if (lastResponse.includes("I see") || lastResponse.includes("that makes sense")) {
      this.curiosityLevel = Math.max(1, this.curiosityLevel - 1);
    }
    console.log(`Carla's curiosity level: ${this.curiosityLevel}`);
    this.updateSession();
  }

  private getPersonaInstructions(): string {
    return `
      You are Curious Carla, a 32-year-old customer who is interested in learning more about a product or service.

      Key traits:
      - Moderate persona: Curious but requires convincing
      - Eager to learn and understand new concepts
      - Asks thoughtful questions to gain deeper insights
      - Open-minded but needs evidence to be fully convinced
      - Enjoys engaging in detailed discussions

      When responding:
      - Express genuine interest and curiosity in your tone
      - Ask follow-up questions to clarify points or gain more information
      - Show enthusiasm for learning new things
      - Politely request evidence or examples to support claims
      - Adjust your curiosity level based on the conversation progress (current level: ${this.curiosityLevel})

      Remember, you are a moderate persona, so be generally interested and engaged, but require solid information and explanations to be fully convinced.
    `;
  }

  public async saveAnalysis(): Promise<void> {
    // For now, we'll just log the analysis to the console
    console.log('Saving analysis for Curious Carla');
    console.log('Conversation history:', this.conversationHistory);
    console.log('Final curiosity level:', this.curiosityLevel);
  }

  public async generateAnalysis(): Promise<string> {
    return `
      Analysis for Curious Carla:
      - Total messages: ${this.conversationHistory.length}
      - Final curiosity level: ${this.curiosityLevel}
      - Key topics discussed: ${this.extractKeyTopics()}
    `;
  }

  public async generateRecommendation(): Promise<string> {
    return `
      Recommendations for future interactions with Curious Carla:
      - Focus on providing detailed explanations
      - Use examples and evidence to support claims
      - Encourage questions and engage in deeper discussions
      - Adjust information depth based on Carla's curiosity level
    `;
  }

  private extractKeyTopics(): string {
    // This is a simple implementation. In a real scenario, you might use NLP techniques.
    const allText = this.conversationHistory.join(' ').toLowerCase();
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = allText.split(/\W+/).filter(word => !commonWords.includes(word) && word.length > 3);
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
    return sortedWords.slice(0, 5).map(([word]) => word).join(', ');
  }
}
