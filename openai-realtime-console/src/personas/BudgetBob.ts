import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import PersonaInterface, { VoiceOptions } from './Persona';

export class BudgetBob implements PersonaInterface {
  public voice: VoiceOptions = 'onyx';
  private ws!: WebSocket;
  private apiKey: string;
  private conversationHistory: string[] = [];
  private budgetConcern: number = 8; // Scale of 1-10, 8 being quite concerned about budget

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
      session: { budget_concern: this.budgetConcern }
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
    return `Budget Bob: I'm considering the cost implications of "${input}". Can you provide more details about the pricing?`;
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
    console.log('Saving analysis for Budget Bob');
  }

  public async generateAnalysis(): Promise<string> {
    return 'Analysis of Budget Bob\'s conversation: Focused heavily on cost considerations.';
  }

  public async generateRecommendation(): Promise<string> {
    return 'Recommendation for Budget Bob: Emphasize value for money and long-term cost savings in future interactions.';
  }

  private handleServerEvent(event: any) {
    switch (event.type) {
      case 'session.created':
        console.log('Session created:', event.session.id);
        break;
      case 'response.output_item.added':
        if (event.output_item.type === 'text') {
          this.conversationHistory.push(event.output_item.text);
          console.log('Bob:', event.output_item.text);
          this.adjustBudgetConcern();
        } else if (event.output_item.type === 'audio') {
          console.log('Audio response received');
        }
        break;
      case 'response.done':
        console.log('Response completed');
        break;
    }
  }

  private adjustBudgetConcern() {
    const lastResponse = this.conversationHistory[this.conversationHistory.length - 1];
    if (lastResponse.includes("expensive") || lastResponse.includes("cost")) {
      this.budgetConcern = Math.min(10, this.budgetConcern + 1);
    } else if (lastResponse.includes("affordable") || lastResponse.includes("savings")) {
      this.budgetConcern = Math.max(1, this.budgetConcern - 1);
    }
    console.log(`Bob's budget concern level: ${this.budgetConcern}`);
    this.updateSession();
  }

  private getPersonaInstructions(): string {
    return `
      You are Budget Bob, a 45-year-old accountant who is very conscious about spending and always looking for the best value for money.

      Key traits:
      - Moderate to difficult persona: Interested but very price-sensitive
      - Cautious about spending
      - Always asks about costs, discounts, and long-term value
      - Appreciates transparency in pricing
      - Can be skeptical of "too good to be true" offers

      When responding:
      - Use a steady, cautious tone
      - Frequently inquire about prices, discounts, or payment plans
      - Show interest in the product or service, but always circle back to cost considerations
      - Ask about long-term costs or potential hidden fees
      - Compare the offering to alternatives you might be aware of
      - Adjust your level of budget concern based on the conversation progress (current level: ${this.budgetConcern})

      Remember, you are a moderate to difficult persona. While you're interested in the product or service, you need to be convinced of its value for money. Don't be afraid to express concerns about costs or ask for better deals.
    `;
  }
}
