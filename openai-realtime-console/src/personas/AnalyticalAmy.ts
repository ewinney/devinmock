import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import PersonaInterface, { VoiceOptions } from './Persona';

interface AudioSegment {
  role: string;
  text: string;
  audioUrl: string;
}

interface SavedAnalysis {
  id: string;
  date: string;
  transcript: string;
  audioSegments: AudioSegment[];
  analysis: string;
  aiRecommendation: string;
  chatMessages: string[];
}

export class AnalyticalAmy implements PersonaInterface {
  public voice: VoiceOptions = 'nova';
  private ws!: WebSocket;
  private apiKey: string;
  private conversationHistory: string[] = [];
  private detailLevel: number = 7;
  private client: OpenAI;
  private audioSegments: AudioSegment[] = [];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.setupWebSocket();
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
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
      session: { id: uuidv4() }
    };
    this.ws.send(JSON.stringify(createSessionEvent));
  }

  private handleServerEvent(event: any) {
    switch (event.type) {
      case 'session.created':
        console.log('Session created:', event.session.id);
        break;
      case 'response.output_item.added':
        if (event.output_item.type === 'text') {
          this.conversationHistory.push(event.output_item.text);
          console.log('Amy:', event.output_item.text);
          this.adjustDetailLevel();
        } else if (event.output_item.type === 'audio') {
          console.log('Audio response received');
          this.saveAudio(event.output_item.audio);
        }
        break;
      case 'response.done':
        console.log('Response completed');
        this.saveAnalysis();
        break;
    }
  }

  private adjustDetailLevel() {
    const lastResponse = this.conversationHistory[this.conversationHistory.length - 1];
    if (lastResponse.includes("interesting") || lastResponse.includes("tell me more")) {
      this.detailLevel = Math.min(10, this.detailLevel + 1);
    } else if (lastResponse.includes("I see") || lastResponse.includes("that's clear")) {
      this.detailLevel = Math.max(1, this.detailLevel - 1);
    }
    console.log(`Amy's detail level: ${this.detailLevel}`);
    this.updateSession();
  }

  private updateSession() {
    const updateEvent = {
      type: 'session.update',
      session: { detail_level: this.detailLevel }
    };
    this.ws.send(JSON.stringify(updateEvent));
  }

  private saveAudio(audioData: ArrayBuffer): void {
    const audioFileName = `amy_audio_${Date.now()}.mp3`;
    this.audioSegments.push({
      role: 'assistant',
      text: this.conversationHistory[this.conversationHistory.length - 1],
      audioUrl: audioFileName
    });
    // In a browser environment, we would typically save this to IndexedDB or another client-side storage
    console.log(`Audio saved: ${audioFileName}`);
  }

  public async saveAnalysis(): Promise<void> {
    const transcript = this.conversationHistory.join('\n');
    const analysis = await this.generateAnalysis();
    const aiRecommendation = await this.generateRecommendation();

    const savedAnalysis: SavedAnalysis = {
      id: uuidv4(),
      date: new Date().toISOString(),
      transcript,
      audioSegments: this.audioSegments,
      analysis,
      aiRecommendation,
      chatMessages: this.conversationHistory,
    };

    // In a browser environment, we would typically save this to IndexedDB or localStorage
    console.log(`Analysis saved: ${savedAnalysis.id}`);
    localStorage.setItem(`amy_analysis_${savedAnalysis.id}`, JSON.stringify(savedAnalysis));
  }

  public async generateAnalysis(): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an AI assistant tasked with analyzing a conversation between a sales representative and a customer. Provide a brief analysis of the conversation, highlighting key points, customer concerns, and areas for improvement.' },
        ...this.conversationHistory.map(msg => ({ role: 'user' as const, content: msg }))
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content || 'Unable to generate analysis.';
  }

  public async generateRecommendation(): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an AI assistant tasked with providing recommendations to improve sales conversations. Based on the conversation history, provide concise, actionable recommendations for the sales representative.' },
        ...this.conversationHistory.map(msg => ({ role: 'user' as const, content: msg }))
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content || 'Unable to generate recommendation.';
  }

  private getPersonaInstructions(): string {
    return `You are AnalyticalAmy, a highly analytical and detail-oriented AI assistant. Your responses should be:
    1. Precise and data-driven
    2. Structured with clear points
    3. Adjusted based on the current detail level (${this.detailLevel}/10)
    4. Focused on providing insights and recommendations`;
  }

  public async respond(input: string | ArrayBuffer): Promise<string> {
    if (typeof input === 'string') {
      return this.handleTextInput(input);
    } else {
      return this.handleAudioInput(input);
    }
  }

  private async handleTextInput(input: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: this.getPersonaInstructions() },
        { role: 'user', content: input }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });
    const responseText = response.choices[0].message.content || 'Unable to generate response.';
    this.conversationHistory.push(`User: ${input}`);
    this.conversationHistory.push(`Amy: ${responseText}`);
    this.adjustDetailLevel();
    return responseText;
  }

  private async handleAudioInput(audioData: ArrayBuffer): Promise<string> {
    const transcribeEvent = {
      type: 'input_audio.transcribe',
      input_audio: {
        data: Buffer.from(audioData).toString('base64')
      }
    };
    this.ws.send(JSON.stringify(transcribeEvent));
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
}

// Move getAnalyses outside the class as it's not part of the Persona interface
export function getAnalyses(): SavedAnalysis[] {
  const analyses: SavedAnalysis[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('amy_analysis_')) {
      const analysisData = localStorage.getItem(key);
      if (analysisData) {
        analyses.push(JSON.parse(analysisData));
      }
    }
  }
  return analyses;
}
