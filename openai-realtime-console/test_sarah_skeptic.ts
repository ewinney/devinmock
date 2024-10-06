import { SarahSkeptic } from './src/personas/SarahSkeptic';

const apiKey = process.env.OPENAI_API_KEY || '';
const sarah = new SarahSkeptic(apiKey);

// Simulate a conversation
setTimeout(() => {
  console.log("Simulating user input...");
  const audioData = new ArrayBuffer(1024); // Dummy audio data
  sarah.respond(audioData);
}, 2000);

// Keep the process running
setInterval(() => {}, 1000);
