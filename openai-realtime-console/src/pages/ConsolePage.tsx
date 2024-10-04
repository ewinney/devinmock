/**
 * Running a local relay server will allow you to hide your API key
 * and run custom logic on the server
 *
 * Set the local relay server address to:
 * REACT_APP_LOCAL_RELAY_SERVER_URL=http://localhost:8081
 *
 * This will also require you to set OPENAI_API_KEY= in a `.env` file
 * You can run it with `npm run relay`, in parallel with `npm start`
 */
const LOCAL_RELAY_SERVER_URL: string =
  process.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';

import { useEffect, useRef, useCallback, useState } from 'react';

import { RealtimeClient } from '@openai/realtime-api-beta';
import { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { WavRecorder, WavStreamPlayer } from '../lib/wavtools/index.js';
import { instructions } from '../utils/conversation_config.js';
import { WavRenderer } from '../utils/wav_renderer';

import { X, Edit, Zap, ArrowUp, ArrowDown, Pause, Play } from 'react-feather';
import { Button } from '../components/button/Button';
import { Toggle } from '../components/toggle/Toggle';
import { Map } from '../components/Map';

import './ConsolePage.scss';
import { isJsxOpeningLikeElement } from 'typescript';
import { CallAnalysisPage } from './CallAnalysisPage';

// If the logo is in the public folder, you don't need to import it
// Remove or comment out the import statement
// import mockCallAgentLogo from '../assets/mock-call-agent-logo.png';

/**
 * Type for result from get_weather() function call
 */
interface Coordinates {
  lat: number;
  lng: number;
  location?: string;
  temperature?: {
    value: number;
    units: string;
  };
  wind_speed?: {
    value: number;
    units: string;
  };
}

/**
 * Type for all event logs
 */
interface RealtimeEvent {
  time: string;
  source: 'client' | 'server';
  count?: number;
  event: { [key: string]: any };
}

interface Customer {
  id: string;
  name: string;
  situation: string;
  profile: {
    // Personal Information
    ownerName: string;
    age: number;
    familyStatus: string;
    education: string;
    personalityTraits: string;

    // Business Information
    businessName: string;
    businessType: string;
    yearsFounded: number;
    location: string;
    employees: number;
    annualRevenue: string;
    
    // Financial Information
    creditScore: number;
    outstandingLoans: string;
    monthlyExpenses: string;
    
    // Current Situation
    businessChallenges: string;
    expansionPlans: string;
    financingNeeds: string;
    equipmentNeeded: string;
    estimatedCost: string;
    
    // Market Information
    competitorSituation: string;
    customerBase: string;
    
    // Personal Goals
    shortTermGoal: string;
    longTermGoal: string;
    
    // Conversation History
    lastContact: string;
    previousDiscussions: string;
  };
}

const customers: Customer[] = [
  {
    id: '1',
    name: 'Tony Pepperoni',
    situation: 'Seeking equipment upgrade and expansion financing',
    profile: {
      // Personal Information
      ownerName: "Tony Pepperoni",
      age: 42,
      familyStatus: "Married with two children (ages 10 and 8)",
      education: "Bachelor's degree in Business Administration",
      personalityTraits: "Friendly, hardworking, cautious with finances, passionate about pizza",

      // Business Information
      businessName: "Tony's Pizzeria",
      businessType: "Family-owned Pizza Restaurant",
      yearsFounded: 2019,
      location: "Downtown area with high foot traffic",
      employees: 12,
      annualRevenue: "$500,000",
      
      // Financial Information
      creditScore: 720,
      outstandingLoans: "$50,000 for initial restaurant setup",
      monthlyExpenses: "$35,000 including rent, utilities, and staff wages",
      
      // Current Situation
      businessChallenges: "Increasing ingredient costs, need for kitchen equipment upgrade",
      expansionPlans: "Considering opening a second location in the suburbs",
      financingNeeds: "Equipment upgrade and possible expansion",
      equipmentNeeded: "New pizza oven, dough mixer, and refrigeration units",
      estimatedCost: "$75,000 for equipment, $200,000 for new location",
      
      // Market Information
      competitorSituation: "Two other pizzerias in the area, but known for lower quality",
      customerBase: "Loyal local customers, growing takeout and delivery business",
      
      // Personal Goals
      shortTermGoal: "Upgrade equipment to improve efficiency and quality",
      longTermGoal: "Expand to multiple locations across the city",
      
      // Conversation History
      lastContact: "2024-03-15",
      previousDiscussions: "Briefly discussed equipment financing options",
    }
  },
  {
    id: '2',
    name: 'Sarah Bloom',
    situation: 'Looking to expand her flower shop chain',
    profile: {
      // Personal Information
      ownerName: "Sarah Bloom",
      age: 35,
      familyStatus: "Single, no children",
      education: "Associate's degree in Horticulture",
      personalityTraits: "Creative, ambitious, detail-oriented, eco-conscious",

      // Business Information
      businessName: "Bloom's Bouquets",
      businessType: "Boutique Flower Shop Chain",
      yearsFounded: 2018,
      location: "Three locations in upscale shopping districts",
      employees: 20,
      annualRevenue: "$750,000",
      
      // Financial Information
      creditScore: 780,
      outstandingLoans: "$100,000 for existing locations",
      monthlyExpenses: "$55,000 including rent, utilities, and staff wages",
      
      // Current Situation
      businessChallenges: "Managing inventory across multiple locations, seasonal demand fluctuations",
      expansionPlans: "Opening two new locations in neighboring cities",
      financingNeeds: "Capital for new store setups and increased inventory",
      equipmentNeeded: "Refrigeration units, delivery vans",
      estimatedCost: "$300,000 for new locations and equipment",
      
      // Market Information
      competitorSituation: "Several local florists, but unique in offering eco-friendly and locally-sourced flowers",
      customerBase: "Environmentally conscious consumers, corporate clients for events",
      
      // Personal Goals
      shortTermGoal: "Streamline operations across all locations",
      longTermGoal: "Become the leading eco-friendly flower shop chain in the state",
      
      // Conversation History
      lastContact: "2024-02-28",
      previousDiscussions: "Explored options for eco-friendly packaging and sustainable practices",
    }
  },
  {
    id: '3',
    name: 'Mike Wrench',
    situation: 'Wants to modernize his auto repair shop',
    profile: {
      // Personal Information
      ownerName: "Mike Wrench",
      age: 50,
      familyStatus: "Divorced, two adult children",
      education: "Technical school diploma in Automotive Technology",
      personalityTraits: "Straightforward, loyal to customers, traditional but open to new ideas",

      // Business Information
      businessName: "Mike's Auto Care",
      businessType: "Independent Auto Repair Shop",
      yearsFounded: 2005,
      location: "Suburban area with good visibility from main road",
      employees: 8,
      annualRevenue: "$600,000",
      
      // Financial Information
      creditScore: 700,
      outstandingLoans: "$75,000 for previous equipment purchases",
      monthlyExpenses: "$45,000 including rent, utilities, and staff wages",
      
      // Current Situation
      businessChallenges: "Keeping up with rapidly evolving car technologies, attracting younger customers",
      expansionPlans: "Modernizing existing shop rather than expanding locations",
      financingNeeds: "New diagnostic equipment and staff training",
      equipmentNeeded: "Advanced diagnostic tools, electric vehicle charging station",
      estimatedCost: "$150,000 for equipment and training programs",
      
      // Market Information
      competitorSituation: "Two franchise auto repair shops nearby, but known for personal service and fair pricing",
      customerBase: "Loyal long-time customers, mostly middle-aged and older",
      
      // Personal Goals
      shortTermGoal: "Implement a digital system for customer records and scheduling",
      longTermGoal: "Position the shop as the go-to place for both traditional and electric vehicle repairs",
      
      // Conversation History
      lastContact: "2024-03-10",
      previousDiscussions: "Inquired about loans for new diagnostic equipment",
    }
  }
];

interface CallSegment {
  role: string;
  text: string;
  audioUrl: string;
}

export function ConsolePage() {
  /**
   * Ask user for API Key
   * If we're using the local relay server, we don't need this
   */
  const apiKey = LOCAL_RELAY_SERVER_URL
    ? ''
    : localStorage.getItem('tmp::voice_api_key') ||
      prompt('OpenAI API Key') ||
      '';
  if (apiKey !== '') {
    localStorage.setItem('tmp::voice_api_key', apiKey);
  }

  /**
   * Instantiate:
   * - WavRecorder (speech input)
   * - WavStreamPlayer (speech output)
   * - RealtimeClient (API client)
   */
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient(
      LOCAL_RELAY_SERVER_URL
        ? { url: LOCAL_RELAY_SERVER_URL }
        : {
            apiKey: apiKey,
            dangerouslyAllowAPIKeyInBrowser: true,
          }
    )
  );

  /**
   * References for
   * - Rendering audio visualization (canvas)
   * - Autoscrolling event logs
   * - Timing delta for event log displays
   */
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const eventsScrollHeightRef = useRef(0);
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  /**
   * All of our variables for displaying application state
   * - items are all conversation items (dialog)
   * - realtimeEvents are event logs, which can be expanded
   * - memoryKv is for set_memory() function
   * - coords, marker are for get_weather() function
   */
  const [items, setItems] = useState<ItemType[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<{
    [key: string]: boolean;
  }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [memoryKv, setMemoryKv] = useState({
    // Personal Information
    ownerName: "Tony Pepperoni",
    age: 42,
    familyStatus: "Married with two children (ages 10 and 8)",
    education: "Bachelor's degree in Business Administration",
    personalityTraits: "Friendly, hardworking, cautious with finances, passionate about pizza",

    // Business Information
    businessName: "Tony's Pizzeria",
    businessType: "Family-owned Pizza Restaurant",
    yearsFounded: 2019,
    location: "Downtown area with high foot traffic",
    employees: 12,
    annualRevenue: "$500,000",
    
    // Financial Information
    creditScore: 720,
    outstandingLoans: "$50,000 for initial restaurant setup",
    monthlyExpenses: "$35,000 including rent, utilities, and staff wages",
    
    // Current Situation
    businessChallenges: "Increasing ingredient costs, need for kitchen equipment upgrade",
    expansionPlans: "Considering opening a second location in the suburbs",
    financingNeeds: "Equipment upgrade and possible expansion",
    equipmentNeeded: "New pizza oven, dough mixer, and refrigeration units",
    estimatedCost: "$75,000 for equipment, $200,000 for new location",
    
    // Market Information
    competitorSituation: "Two other pizzerias in the area, but known for lower quality",
    customerBase: "Loyal local customers, growing takeout and delivery business",
    
    // Personal Goals
    shortTermGoal: "Upgrade equipment to improve efficiency and quality",
    longTermGoal: "Expand to multiple locations across the city",
    
    // Conversation History
    lastContact: "2024-03-15",
    previousDiscussions: "Briefly discussed equipment financing options",
  });
  const [coords, setCoords] = useState<Coordinates | null>({
    lat: 37.775593,
    lng: -122.418137,
  });
  const [marker, setMarker] = useState<Coordinates | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [audioSegments, setAudioSegments] = useState<CallSegment[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  /**
   * Utility for formatting the timing of logs
   */
  const formatTime = useCallback((timestamp: string) => {
    const startTime = startTimeRef.current;
    const t0 = new Date(startTime).valueOf();
    const t1 = new Date(timestamp).valueOf();
    const delta = t1 - t0;
    const hs = Math.floor(delta / 10) % 100;
    const s = Math.floor(delta / 1000) % 60;
    const m = Math.floor(delta / 60_000) % 60;
    const pad = (n: number) => {
      let s = n + '';
      while (s.length < 2) {
        s = '0' + s;
      }
      return s;
    };
    return `${pad(m)}:${pad(s)}.${pad(hs)}`;
  }, []);

  /**
   * When you click the API key
   */
  const resetAPIKey = useCallback(() => {
    const apiKey = prompt('OpenAI API Key');
    if (apiKey !== null) {
      localStorage.clear();
      localStorage.setItem('tmp::voice_api_key', apiKey);
      window.location.reload();
    }
  }, []);

  /**
   * Connect to conversation:
   * WavRecorder taks speech input, WavStreamPlayer output, client is API client
   */
  const connectConversation = useCallback(async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Set state variables
    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setItems(client.conversation.getItems());

    // Connect to microphone
    await wavRecorder.begin();

    // Connect to audio output
    await wavStreamPlayer.connect();

    // Connect to realtime API
    await client.connect();
    client.sendUserMessageContent([
      {
        type: `input_text`,
        text: `Hello!`,
        // text: `For testing purposes, I want you to list ten car brands. Number each item, e.g. "one (or whatever number you are one): the item name".`
      },
    ]);

    if (client.getTurnDetectionType() === 'server_vad') {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }

    setIsPaused(false); // Ensure we start in an unpaused state
  }, []);

  /**
   * Disconnect and reset conversation state
   */
  const disconnectConversation = useCallback(async () => {
    setIsPaused(false); // Reset pause state
    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);
    setMemoryKv({
      // Personal Information
      ownerName: "Tony Pepperoni",
      age: 42,
      familyStatus: "Married with two children (ages 10 and 8)",
      education: "Bachelor's degree in Business Administration",
      personalityTraits: "Friendly, hardworking, cautious with finances, passionate about pizza",

      // Business Information
      businessName: "Tony's Pizzeria",
      businessType: "Family-owned Pizza Restaurant",
      yearsFounded: 2019,
      location: "Downtown area with high foot traffic",
      employees: 12,
      annualRevenue: "$500,000",
      
      // Financial Information
      creditScore: 720,
      outstandingLoans: "$50,000 for initial restaurant setup",
      monthlyExpenses: "$35,000 including rent, utilities, and staff wages",
      
      // Current Situation
      businessChallenges: "Increasing ingredient costs, need for kitchen equipment upgrade",
      expansionPlans: "Considering opening a second location in the suburbs",
      financingNeeds: "Equipment upgrade and possible expansion",
      equipmentNeeded: "New pizza oven, dough mixer, and refrigeration units",
      estimatedCost: "$75,000 for equipment, $200,000 for new location",
      
      // Market Information
      competitorSituation: "Two other pizzerias in the area, but known for lower quality",
      customerBase: "Loyal local customers, growing takeout and delivery business",
      
      // Personal Goals
      shortTermGoal: "Upgrade equipment to improve efficiency and quality",
      longTermGoal: "Expand to multiple locations across the city",
      
      // Conversation History
      lastContact: "2024-03-15",
      previousDiscussions: "Briefly discussed equipment financing options",
    });
    setCoords({
      lat: 37.775593,
      lng: -122.418137,
    });
    setMarker(null);

    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();
  }, []);

  const deleteConversationItem = useCallback(async (id: string) => {
    const client = clientRef.current;
    client.deleteItem(id);
  }, []);

  /**
   * In push-to-talk mode, start recording
   * .appendInputAudio() for each sample
   */
  const startRecording = async () => {
    if (isPaused) return; // Don't start recording if paused
    setIsRecording(true);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      await client.cancelResponse(trackId, offset);
    }
    await wavRecorder.record((data) => client.appendInputAudio(data.mono));
  };

  /**
   * In push-to-talk mode, stop recording
   */
  const stopRecording = async () => {
    if (isPaused) return; // Don't stop recording if paused
    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.pause();
    client.createResponse();
  };

  /**
   * Switch between Manual <> VAD mode for communication
   */
  const changeTurnEndType = async (value: string) => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    if (value === 'none' && wavRecorder.getStatus() === 'recording') {
      await wavRecorder.pause();
    }
    client.updateSession({
      turn_detection: value === 'none' ? null : { type: 'server_vad' },
    });
    if (value === 'server_vad' && client.isConnected()) {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
    setCanPushToTalk(value === 'none');
  };

  const togglePause = async () => {
    if (isPaused) {
      // Resume
      setIsPaused(false);
      if (!canPushToTalk) {
        // If in VAD mode, restart recording
        await wavRecorderRef.current.record((data) => clientRef.current.appendInputAudio(data.mono));
      }
    } else {
      // Pause
      setIsPaused(true);
      await wavRecorderRef.current.pause();
    }
  };

  /**
   * Auto-scroll the event logs
   */
  useEffect(() => {
    if (eventsScrollRef.current) {
      const eventsEl = eventsScrollRef.current;
      const scrollHeight = eventsEl.scrollHeight;
      // Only scroll if height has just changed
      if (scrollHeight !== eventsScrollHeightRef.current) {
        eventsEl.scrollTop = scrollHeight;
        eventsScrollHeightRef.current = scrollHeight;
      }
    }
  }, [realtimeEvents]);

  /**
   * Auto-scroll the conversation logs
   */
  useEffect(() => {
    const conversationEls = [].slice.call(
      document.body.querySelectorAll('[data-conversation-content]')
    );
    for (const el of conversationEls) {
      const conversationEl = el as HTMLDivElement;
      conversationEl.scrollTop = conversationEl.scrollHeight;
    }
  }, [items]);

  /**
   * Set up render loops for the visualization canvas
   */
  useEffect(() => {
    let isLoaded = true;

    const wavRecorder = wavRecorderRef.current;
    const clientCanvas = clientCanvasRef.current;
    let clientCtx: CanvasRenderingContext2D | null = null;

    const wavStreamPlayer = wavStreamPlayerRef.current;
    const serverCanvas = serverCanvasRef.current;
    let serverCtx: CanvasRenderingContext2D | null = null;

    const render = () => {
      if (isLoaded) {
        if (clientCanvas) {
          if (!clientCanvas.width || !clientCanvas.height) {
            clientCanvas.width = clientCanvas.offsetWidth;
            clientCanvas.height = clientCanvas.offsetHeight;
          }
          clientCtx = clientCtx || clientCanvas.getContext('2d');
          if (clientCtx) {
            clientCtx.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
            const result = wavRecorder.recording
              ? wavRecorder.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              clientCanvas,
              clientCtx,
              result.values,
              '#0099ff',
              10,
              0,
              8
            );
          }
        }
        if (serverCanvas) {
          if (!serverCanvas.width || !serverCanvas.height) {
            serverCanvas.width = serverCanvas.offsetWidth;
            serverCanvas.height = serverCanvas.offsetHeight;
          }
          serverCtx = serverCtx || serverCanvas.getContext('2d');
          if (serverCtx) {
            serverCtx.clearRect(0, 0, serverCanvas.width, serverCanvas.height);
            const result = wavStreamPlayer.analyser
              ? wavStreamPlayer.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              serverCanvas,
              serverCtx,
              result.values,
              '#009900',
              10,
              0,
              8
            );
          }
        }
        window.requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      isLoaded = false;
    };
  }, []);

  /**
   * Core RealtimeClient and audio capture setup
   * Set all of our instructions, tools, events and more
   */
  useEffect(() => {
    // Get refs
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const client = clientRef.current;

    // Set instructions
    client.updateSession({ instructions: instructions });
    // Set transcription, otherwise we don't get user transcriptions back
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });

    // Add tools
    client.addTool(
      {
        name: 'set_memory',
        description: 'Sets a key-value pair in memory',
        parameters: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'The key to set',
            },
            value: {
              type: 'string',
              description: 'The value to set',
            },
          },
          required: ['key', 'value'],
        },
      },
      async ({ key, value }: { key: string; value: string }) => {
        setMemoryKv((prev) => ({ ...prev, [key]: value }));
        return `Set ${key} to ${value}`;
      }
    );
    client.addTool(
      {
        name: 'get_weather',
        description:
          'Retrieves the weather for a given lat, lng coordinate pair. Specify a label for the location.',
        parameters: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude',
            },
            lng: {
              type: 'number',
              description: 'Longitude',
            },
            location: {
              type: 'string',
              description: 'Name of the location',
            },
          },
          required: ['lat', 'lng', 'location'],
        },
      },
      async ({ lat, lng, location }: { [key: string]: any }) => {
        setMarker({ lat, lng, location });
        setCoords({ lat, lng, location });
        const result = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m`
        );
        const json = await result.json();
        const temperature = {
          value: json.current.temperature_2m as number,
          units: json.current_units.temperature_2m as string,
        };
        const wind_speed = {
          value: json.current.wind_speed_10m as number,
          units: json.current_units.wind_speed_10m as string,
        };
        setMarker({ lat, lng, location, temperature, wind_speed });
        return json;
      }
    );

    // handle realtime events from client + server for event logging
    client.on('realtime.event', (realtimeEvent: RealtimeEvent) => {
      setRealtimeEvents((realtimeEvents) => {
        const lastEvent = realtimeEvents[realtimeEvents.length - 1];
        if (lastEvent?.event.type === realtimeEvent.event.type) {
          // if we receive multiple events in a row, aggregate them for display purposes
          lastEvent.count = (lastEvent.count || 0) + 1;
          return realtimeEvents.slice(0, -1).concat(lastEvent);
        } else {
          return realtimeEvents.concat(realtimeEvent);
        }
      });
    });
    client.on('error', (event: any) => console.error(event));
    client.on('conversation.interrupted', async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
    });
    client.on('conversation.updated', async ({ item, delta }: any) => {
      const items = client.conversation.getItems();
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }
      if (item.status === 'completed' && item.formatted.audio?.length) {
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000
        );
        item.formatted.file = wavFile;
      }
      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      // cleanup; resets to defaults
      client.reset();
    };
  }, []);

  const getTranscript = () => {
    return items
      .filter(item => item.role === 'user' || item.role === 'assistant')
      .map(item => `${item.role}: ${item.formatted.transcript || item.formatted.text}`)
      .join('\n');
  };

  const getTranscriptAndAudio = (): CallSegment[] => {
    return items
      .filter(item => item.role === 'user' || item.role === 'assistant')
      .map(item => ({
        role: item.role as string, // Type assertion to fix the error
        text: item.formatted.transcript || item.formatted.text || '',
        audioUrl: item.formatted.file?.url || ''
      }));
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    // Reset the conversation and update the AI's memory based on the new customer
    setItems([]);
    setMemoryKv(customer.profile);
    
    // Update the AI's instructions based on the selected customer
    const customerInstructions = `You are roleplaying as ${customer.name}, the owner of ${customer.profile.businessName}. 
    Your current situation is: ${customer.situation}. 
    Use the information in your profile to inform your responses and behavior.
    You are speaking with a financial services sales agent who is trying to sell you products or services.
    Respond as the business owner would, based on your profile, situation, and personality traits.
    Be realistic in your responses, considering your financial situation, business challenges, and goals.`;
    
    clientRef.current.updateSession({ instructions: customerInstructions });
  };

  const sendMessage = async (message: string) => {
    // ... existing code

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          memory: memoryKv,
          customerName: selectedCustomer?.name,
          customerSituation: selectedCustomer?.situation,
        }),
      });

      // ... existing code to handle the response
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (showAnalysis) {
    const audioSegments = getTranscriptAndAudio();
    return (
      <CallAnalysisPage
        transcript={audioSegments.map(segment => `${segment.role}: ${segment.text}`).join('\n')}
        audioSegments={audioSegments}
        onBack={() => setShowAnalysis(false)}
      />
    );
  }

  /**
   * Render the application
   */
  return (
    <div data-component="ConsolePage">
      <div className="content-top">
        <div className="content-title">
          <img src="/mock-call-agent-logo.png" alt="Mock Call Agent Logo" />
          <span>Financial Services Sales Mock Call System</span>
        </div>
        <div className="content-api-key">
          {!LOCAL_RELAY_SERVER_URL && (
            <Button
              icon={Edit}
              iconPosition="end"
              buttonStyle="flush"
              label={`api key: ${apiKey.slice(0, 3)}...`}
              onClick={() => resetAPIKey()}
            />
          )}
        </div>
      </div>
      <div className="content-main">
        <div className="content-logs">
          <div className="content-block events">
            <div className="visualization">
              <div className="visualization-entry client">
                <canvas ref={clientCanvasRef} />
              </div>
              <div className="visualization-entry server">
                <canvas ref={serverCanvasRef} />
              </div>
            </div>
            <div className="content-block-title">events</div>
            <div className="content-block-body" ref={eventsScrollRef}>
              {!realtimeEvents.length && `awaiting connection...`}
              {realtimeEvents.map((realtimeEvent, i) => {
                const count = realtimeEvent.count;
                const event = { ...realtimeEvent.event };
                if (event.type === 'input_audio_buffer.append') {
                  event.audio = `[trimmed: ${event.audio.length} bytes]`;
                } else if (event.type === 'response.audio.delta') {
                  event.delta = `[trimmed: ${event.delta.length} bytes]`;
                }
                return (
                  <div className="event" key={event.event_id}>
                    <div className="event-timestamp">
                      {formatTime(realtimeEvent.time)}
                    </div>
                    <div className="event-details">
                      <div
                        className="event-summary"
                        onClick={() => {
                          // toggle event details
                          const id = event.event_id;
                          const expanded = { ...expandedEvents };
                          if (expanded[id]) {
                            delete expanded[id];
                          } else {
                            expanded[id] = true;
                          }
                          setExpandedEvents(expanded);
                        }}
                      >
                        <div
                          className={`event-source ${
                            event.type === 'error'
                              ? 'error'
                              : realtimeEvent.source
                          }`}
                        >
                          {realtimeEvent.source === 'client' ? (
                            <ArrowUp />
                          ) : (
                            <ArrowDown />
                          )}
                          <span>
                            {event.type === 'error'
                              ? 'error!'
                              : realtimeEvent.source}
                          </span>
                        </div>
                        <div className="event-type">
                          {event.type}
                          {count && ` (${count})`}
                        </div>
                      </div>
                      {!!expandedEvents[event.event_id] && (
                        <div className="event-payload">
                          {JSON.stringify(event, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="content-block conversation">
            <div className="content-block-title">conversation</div>
            <div className="content-block-body" data-conversation-content>
              {!items.length && `awaiting connection...`}
              {items.map((conversationItem, i) => {
                return (
                  <div className="conversation-item" key={conversationItem.id}>
                    <div className={`speaker ${conversationItem.role || ''}`}>
                      <div>
                        {(
                          conversationItem.role || conversationItem.type
                        ).replaceAll('_', ' ')}
                      </div>
                      <div
                        className="close"
                        onClick={() =>
                          deleteConversationItem(conversationItem.id)
                        }
                      >
                        <X />
                      </div>
                    </div>
                    <div className={`speaker-content`}>
                      {/* tool response */}
                      {conversationItem.type === 'function_call_output' && (
                        <div>{conversationItem.formatted.output}</div>
                      )}
                      {/* tool call */}
                      {!!conversationItem.formatted.tool && (
                        <div>
                          {conversationItem.formatted.tool.name}(
                          {conversationItem.formatted.tool.arguments})
                        </div>
                      )}
                      {!conversationItem.formatted.tool &&
                        conversationItem.role === 'user' && (
                          <div>
                            {conversationItem.formatted.transcript ||
                              (conversationItem.formatted.audio?.length
                                ? '(awaiting transcript)'
                                : conversationItem.formatted.text ||
                                  '(item sent)')}
                          </div>
                        )}
                      {!conversationItem.formatted.tool &&
                        conversationItem.role === 'assistant' && (
                          <div>
                            {conversationItem.formatted.transcript ||
                              conversationItem.formatted.text ||
                              '(truncated)'}
                          </div>
                        )}
                      {conversationItem.formatted.file && (
                        <audio
                          src={conversationItem.formatted.file.url}
                          controls
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="content-actions">
            <Toggle
              defaultValue={false}
              labels={['manual', 'vad']}
              values={['none', 'server_vad']}
              onChange={(_, value) => changeTurnEndType(value)}
            />
            <div className="spacer" />
            {isConnected && canPushToTalk && (
              <Button
                label={isRecording ? 'release to send' : 'push to talk'}
                buttonStyle={isRecording ? 'alert' : 'regular'}
                disabled={!isConnected || !canPushToTalk || isPaused}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
              />
            )}
            <div className="spacer" />
            <Button
              label={isPaused ? 'Resume' : 'Pause'}
              icon={isPaused ? Play : Pause}
              onClick={togglePause}
              disabled={!isConnected}
            />
            <Button
              label={isConnected ? 'disconnect' : 'connect'}
              iconPosition={isConnected ? 'end' : 'start'}
              icon={isConnected ? X : Zap}
              buttonStyle={isConnected ? 'regular' : 'action'}
              onClick={isConnected ? disconnectConversation : connectConversation}
            />
            <Button
              label="Analyze Call"
              onClick={() => setShowAnalysis(true)}
              disabled={!isConnected || items.length === 0}
            />
          </div>
        </div>
        <div className="content-right">
          <div className="content-block map">
            <div className="content-block-title">get_weather()</div>
            <div className="content-block-title bottom">
              {marker?.location || 'not yet retrieved'}
              {!!marker?.temperature && (
                <>
                  <br />
                  🌡️ {marker.temperature.value} {marker.temperature.units}
                </>
              )}
              {!!marker?.wind_speed && (
                <>
                  {' '}
                  🍃 {marker.wind_speed.value} {marker.wind_speed.units}
                </>
              )}
            </div>
            <div className="content-block-body full">
              {coords && (
                <Map
                  center={[coords.lat, coords.lng]}
                  location={coords.location}
                />
              )}
            </div>
          </div>
          <div className="content-block kv">
            <div className="content-block-title">set_memory()</div>
            <div className="content-block-body content-kv">
              {JSON.stringify(memoryKv, null, 2)}
            </div>
          </div>
        </div>
      </div>
      <div className="customer-selection">
        <h2>Select a Customer to Call:</h2>
        <p>You are a financial services sales agent. Select a customer to start a mock sales call.</p>
        {customers.map((customer) => (
          <button
            key={customer.id}
            onClick={() => handleCustomerSelect(customer)}
            className={selectedCustomer?.id === customer.id ? 'selected' : ''}
          >
            {customer.name}
          </button>
        ))}
      </div>
      {selectedCustomer && (
        <div className="selected-customer-info">
          <h3>Current Customer: {selectedCustomer.name}</h3>
          <p>Business: {selectedCustomer.profile.businessName}</p>
          <p>Situation: {selectedCustomer.situation}</p>
          <p>Your goal: Sell appropriate financial services to this customer.</p>
        </div>
      )}
    </div>
  );
}