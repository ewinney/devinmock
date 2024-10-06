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

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Box, VStack, Heading, Text, Select, Input } from '@chakra-ui/react';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { WavRecorder } from '../lib/wavtools/lib/wav_recorder';
import { PersonaInterface, VoiceOptions } from '../personas/Persona';
import { TonyPepperoni, SarahSkeptic, DifficultDan, CuriousCarla, EagerEddie, AnalyticalAmy, BudgetBob, TechSavvySam } from '../personas';
import { instructions } from '../utils/conversation_config.js';
import { WavRenderer } from '../utils/wav_renderer';

import './ConsolePage.scss';

type ItemType = {
  role: 'user' | 'assistant';
  content: string;
  audio?: ArrayBuffer;
};

const personas: Record<string, new (apiKey: string) => PersonaInterface> = {
  TonyPepperoni,
  SarahSkeptic,
  DifficultDan,
  CuriousCarla,
  EagerEddie,
  AnalyticalAmy,
  BudgetBob,
  TechSavvySam,
};

export const ConsolePage: React.FC = () => {
  const [selectedPersona, setSelectedPersona] = useState<string>('TonyPepperoni');
  const [items, setItems] = useState<ItemType[]>([]);
  const [inputText, setInputText] = useState('');
  const [audioInput, setAudioInput] = useState<ArrayBuffer | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const personaRef = useRef<PersonaInterface | null>(null);
  const clientRef = useRef<RealtimeClient | null>(null);
  const recorderRef = useRef<WavRecorder | null>(null);

  useEffect(() => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (apiKey) {
      clientRef.current = new RealtimeClient();
      const PersonaClass = personas[selectedPersona];
      if (PersonaClass) {
        personaRef.current = new PersonaClass(apiKey);
      }
    }
  }, [selectedPersona]);

  const handleSend = useCallback(async () => {
    if (!personaRef.current || !clientRef.current) return;

    let userInput: string = '';
    if (audioInput) {
      try {
        const conversation = clientRef.current.conversation();
        await conversation.sendAudio(audioInput);

        for await (const message of conversation.iterateMessages()) {
          if (message.role === 'user' && typeof message.content === 'string') {
            userInput = message.content;
            break;
          }
        }
      } catch (error) {
        console.error('Error in speech-to-text:', error);
        return;
      }
      setAudioInput(null);
    } else {
      userInput = inputText;
    }

    setItems(prevItems => [...prevItems, { role: 'user', content: userInput }]);

    try {
      const response = await personaRef.current.respond(userInput);

      const speechConversation = clientRef.current.conversation();
      await speechConversation.sendMessage(response, {
        model: 'tts-1',
        voice: personaRef.current.voice as VoiceOptions,
      });

      let audioResponse: ArrayBuffer | null = null;
      for await (const message of speechConversation.iterateMessages()) {
        if (message.role === 'assistant' && message.content instanceof ArrayBuffer) {
          audioResponse = message.content;
          break;
        }
      }

      setItems(prevItems => [...prevItems, { role: 'assistant', content: response, audio: audioResponse } as ItemType]);
      setInputText('');
    } catch (error) {
      console.error('Error in conversation:', error);
    }
  }, [audioInput, inputText]);

  const handleRecord = useCallback(async () => {
    if (!recorderRef.current) {
      recorderRef.current = new WavRecorder();
    }

    if (isRecording) {
      setIsRecording(false);
      const audioData = await recorderRef.current.end();
      const arrayBuffer = await audioData.blob.arrayBuffer();
      setAudioInput(arrayBuffer);
    } else {
      setIsRecording(true);
      await recorderRef.current.record();
    }
  }, [isRecording]);

  const playAudio = useCallback((audio: ArrayBuffer) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContext.decodeAudioData(audio, (buffer) => {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    });
  }, []);

  return (
    <VStack spacing={4} align="stretch">
      <Heading>Realtime Console</Heading>
      <Select placeholder="Select persona" onChange={(e) => setSelectedPersona(e.target.value)}>
        {Object.keys(personas).map((persona) => (
          <option key={persona} value={persona}>{persona}</option>
        ))}
      </Select>
      {items.map((item, index) => (
        <Box key={index} bg={item.role === 'user' ? 'gray.100' : 'blue.100'} p={2} borderRadius="md">
          <Text>{item.content}</Text>
          {item.audio && (
            <Button onClick={() => playAudio(item.audio as ArrayBuffer)} mt={2}>
              Play Audio
            </Button>
          )}
        </Box>
      ))}
      <Box>
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your message..."
          mr={2}
        />
        <Button onClick={handleSend} colorScheme="blue" mr={2}>
          Send
        </Button>
        <Button onClick={handleRecord} colorScheme="green" isLoading={isRecording}>
          {isRecording ? 'Recording...' : 'Record Audio'}
        </Button>
      </Box>
    </VStack>
  );
};

export default ConsolePage;
