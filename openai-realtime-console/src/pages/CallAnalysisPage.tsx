import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Send, Save } from 'react-feather';
import { Button } from '../components/button/Button';
import './CallAnalysisPage.scss';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { v4 as uuidv4 } from 'uuid'; // You'll need to install this package: npm install uuid @types/uuid

interface CallSegment {
  role: string;
  text: string;
  audioUrl: string;
}

interface CallAnalysisPageProps {
  transcript: string;
  audioSegments: CallSegment[];
  onBack: () => void;
}

// Custom type for our chat messages
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function CallAnalysisPage({ transcript, audioSegments, onBack }: CallAnalysisPageProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');

  const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });

  useEffect(() => {
    generateSimpleAnalysis();
  }, [audioSegments]);

  const generateSimpleAnalysis = () => {
    const simpleAnalysis = `
Call Analysis:
1. Total segments: ${audioSegments.length}
2. User segments: ${audioSegments.filter(seg => seg.role === 'user').length}
3. Assistant segments: ${audioSegments.filter(seg => seg.role === 'assistant').length}
4. Key points: [Add key points manually or implement more advanced analysis]
5. Areas for improvement: [Add areas for improvement manually or implement more advanced analysis]
    `;
    setAnalysis(simpleAnalysis);
  };

  const getAIRecommendation = async () => {
    setIsAnalyzing(true);
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {role: "system", content: "You are an AI assistant that analyzes sales calls and provides recommendations for improvement."},
          {role: "user", content: `Please analyze this sales call transcript and provide recommendations for improvement:\n\n${transcript}`}
        ]
      });
      setAiRecommendation(response.choices[0].message.content || 'No recommendation generated.');
    } catch (error) {
      console.error('Error analyzing call:', error);
      setAiRecommendation('Error occurred while analyzing the call.');
    }
    setIsAnalyzing(false);
  };

  const downloadAnalysis = () => {
    const element = document.createElement("a");
    const file = new Blob([transcript + "\n\n" + analysis + "\n\n" + aiRecommendation], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "call_analysis.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const playAudio = (index: number) => {
    setSelectedSegment(index);
    const audio = new Audio(audioSegments[index].audioUrl);
    audio.play();
  };

  const sendMessage = async () => {
    if (currentMessage.trim() === '') return;

    const newUserMessage: ChatMessage = { role: 'user', content: currentMessage };
    const newMessages = [...chatMessages, newUserMessage];
    setChatMessages(newMessages);
    setCurrentMessage('');

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are an AI assistant that answers questions about a sales call transcript." },
          { role: "user", content: `Here's the transcript of a sales call:\n\n${transcript}\n\nPlease answer the following question about this call:` },
          ...newMessages
        ] as ChatCompletionMessageParam[]
      });
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.choices[0].message.content || 'No response generated.'
      };
      setChatMessages([...newMessages, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Error occurred while processing your message.'
      };
      setChatMessages([...newMessages, errorMessage]);
    }
  };

  const saveAnalysis = () => {
    const newAnalysis = {
      id: uuidv4(),
      date: new Date().toLocaleString(),
      transcript,
      audioSegments,
      analysis,
      aiRecommendation,
      chatMessages
    };

    const savedAnalyses = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
    savedAnalyses.push(newAnalysis);
    localStorage.setItem('savedAnalyses', JSON.stringify(savedAnalyses));

    alert('Analysis saved successfully!');
  };

  return (
    <div className="call-analysis-page">
      <div className="header">
        <Button icon={ArrowLeft} label="Back" onClick={onBack} />
        <h1>Call Analysis</h1>
        <Button icon={Download} label="Download Analysis" onClick={downloadAnalysis} />
        <Button icon={Save} label="Save Analysis" onClick={saveAnalysis} />
      </div>
      <div className="content">
        <div className="transcript-section">
          <h2>Transcript</h2>
          <div className="transcript-content">
            {audioSegments.map((segment, index) => (
              <div 
                key={index} 
                className={`segment ${segment.role} ${selectedSegment === index ? 'selected' : ''}`}
                onClick={() => playAudio(index)}
              >
                <strong>{segment.role}: </strong>
                {segment.text}
                {segment.audioUrl && (
                  <button className="play-button" onClick={(e) => { e.stopPropagation(); playAudio(index); }}>
                    Play
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="analysis-section">
          <h2>Analysis</h2>
          <div className="analysis-content">
            <h3>Simple Analysis</h3>
            {analysis.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            <h3>AI Recommendation</h3>
            {isAnalyzing ? (
              <p>Analyzing call...</p>
            ) : aiRecommendation ? (
              <p>{aiRecommendation}</p>
            ) : (
              <Button label="Get AI Recommendation" onClick={getAIRecommendation} />
            )}
          </div>
          <div className="chat-section">
            <h3>Ask Questions</h3>
            <div className="chat-messages">
              {chatMessages.map((message, index) => (
                <div key={index} className={`chat-message ${message.role}`}>
                  <strong>{message.role === 'user' ? 'You: ' : 'AI: '}</strong>
                  {message.content}
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input 
                type="text" 
                value={currentMessage} 
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask a question about the call..."
              />
              <Button icon={Send} onClick={sendMessage} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}