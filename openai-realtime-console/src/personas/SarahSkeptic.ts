import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import PersonaInterface, { VoiceOptions } from './Persona';

interface ServerEvent {
  type: string;
  [key: string]: any;
}

export class SarahSkeptic implements PersonaInterface {
  private ws!: WebSocket; // Use definite assignment assertion
  public voice: VoiceOptions = 'nova'; // Skeptical female voice
  private apiKey: string;
  private conversationHistory: string[] = [];
  private skepticismLevel: number = 5; // Scale of 1-10, 5 being neutral
  private sessionId: string | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.setupWebSocket();
  }

  private setupWebSocket() {
    const url = new URL('wss://api.openai.com/v1/realtime');
    url.searchParams.append('model', 'gpt-4o-realtime-preview-2024-10-01');

    this.ws = new WebSocket(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    } as WebSocket.ClientOptions);

    this.ws.on('open', () => {
      console.log('Connected to Realtime API');
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
      console.log('Disconnected from Realtime API');
    });
  }

  private createSession() {
    // Implement session creation
    const createSessionEvent = {
      type: 'session.create',
      session: {
        id: uuidv4(),
        instructions: this.getPersonaInstructions(),
        voice: this.voice,
        turn_detection: 'server_vad'
      }
    };
    this.ws.send(JSON.stringify(createSessionEvent));
  }

  private updateSession() {
    const updateEvent = {
      type: 'session.update',
      session: {
        instructions: this.getPersonaInstructions(),
        voice: this.voice,
        turn_detection: 'server_vad'
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
        language: 'en'
      }
    };
    this.ws.send(JSON.stringify(responseEvent));

    // Wait for the response to be generated
    return new Promise((resolve) => {
      const responseHandler = (event: ServerEvent) => {
        if (event.type === 'response.done') {
          this.ws.removeListener('message', responseHandler);
          resolve(this.conversationHistory[this.conversationHistory.length - 1]);
        }
      };
      this.ws.on('message', responseHandler);
    });
  }

  private handleServerEvent(event: ServerEvent) {
    // Add handling for session.created event
    switch (event.type) {
      case 'session.created':
        this.sessionId = event.session.id;
        console.log('Session created:', this.sessionId);
        break;
      case 'response.text.delta':
        console.log('Text response:', event.delta);
        this.conversationHistory.push(event.delta);
        break;
      case 'response.audio.delta':
        console.log('Audio chunk received');
        // Handle audio data (e.g., play or save it)
        break;
      case 'response.done':
        console.log('Response completed');
        this.adjustSkepticism();
        break;
      case 'error':
        console.error('Error:', event.error);
        break;
    }
  }

  private adjustSkepticism() {
    const lastResponse = this.conversationHistory[this.conversationHistory.length - 1];
    if (lastResponse.includes('concrete evidence') || lastResponse.includes('compelling argument')) {
      this.skepticismLevel = Math.max(1, this.skepticismLevel - 1);
    } else if (lastResponse.includes('vague') || lastResponse.includes('unsubstantiated')) {
      this.skepticismLevel = Math.min(10, this.skepticismLevel + 1);
    }
    console.log(`Sarah's skepticism level: ${this.skepticismLevel}`);
    this.updateSession(); // Update the session with new skepticism level
  }

  private getPersonaInstructions(): string {
    return `
      You are Sarah Skeptic, a 35-year-old tech journalist who's curious about new technologies but requires solid evidence.

      Key traits:
      - Moderate persona: Curious but requires convincing
      - Analytical and detail-oriented
      - Skeptical of grand claims or promises
      - Values data and concrete examples
      - Asks probing questions

      Current skepticism level: ${this.skepticismLevel} (1-10 scale, 5 is neutral)

      When responding:
      - Express interest, but always with a hint of doubt
      - Ask for specific details, examples, or data
      - Point out potential flaws or inconsistencies
      - Adjust your skepticism based on the quality of answers

      Vocal characteristics:
      - Speak with a slightly slower pace to emphasize thoughtfulness
      - Use a tone that conveys curiosity mixed with skepticism
      - Vary your intonation to highlight key points or express doubt
    `;
  }

  public async saveAnalysis(): Promise<void> {
    const analysis = await this.generateAnalysis();
    const recommendation = await this.generateRecommendation();
    console.log('Analysis:', analysis);
    console.log('Recommendation:', recommendation);
    // In a real implementation, you would save this data to a database or file
  }

  public async generateAnalysis(): Promise<string> {
    // In a real implementation, you would use an AI model to generate the analysis
    return `Sarah's skepticism level ended at ${this.skepticismLevel}. The conversation covered ${this.conversationHistory.length} exchanges.`;
  }

  public async generateRecommendation(): Promise<string> {
    // In a real implementation, you would use an AI model to generate the recommendation
    return `To convince Sarah, focus on providing concrete evidence and addressing her specific concerns. Current skepticism level: ${this.skepticismLevel}`;
  }
}
