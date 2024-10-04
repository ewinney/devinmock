import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play } from 'react-feather';
import { Button } from '../components/button/Button';
import './SavedAnalysisPage.scss';

interface SavedAnalysis {
  id: string;
  date: string;
  transcript: string;
  audioSegments: {
    role: string;
    text: string;
    audioUrl: string;
  }[];
  analysis: string;
  aiRecommendation: string;
  chatMessages: {
    role: string;
    content: string;
  }[];
}

interface SavedAnalysisPageProps {
  onBack: () => void;
}

export function SavedAnalysisPage({ onBack }: SavedAnalysisPageProps) {
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null);

  useEffect(() => {
    // Load saved analyses from localStorage
    const saved = localStorage.getItem('savedAnalyses');
    if (saved) {
      setSavedAnalyses(JSON.parse(saved));
    }
  }, []);

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play();
  };

  return (
    <div className="saved-analysis-page">
      <div className="header">
        <Button icon={ArrowLeft} label="Back" onClick={onBack} />
        <h1>Saved Analyses</h1>
      </div>
      <div className="content">
        <div className="analysis-list">
          {savedAnalyses.map((analysis) => (
            <div
              key={analysis.id}
              className={`analysis-item ${selectedAnalysis?.id === analysis.id ? 'selected' : ''}`}
              onClick={() => setSelectedAnalysis(analysis)}
            >
              {analysis.date}
            </div>
          ))}
        </div>
        {selectedAnalysis && (
          <div className="analysis-details">
            <h2>Analysis from {selectedAnalysis.date}</h2>
            <h3>Transcript</h3>
            <div className="transcript">
              {selectedAnalysis.audioSegments.map((segment, index) => (
                <div key={index} className={`segment ${segment.role}`}>
                  <strong>{segment.role}: </strong>
                  {segment.text}
                  {segment.audioUrl && (
                    <Button icon={Play} onClick={() => playAudio(segment.audioUrl)} />
                  )}
                </div>
              ))}
            </div>
            <h3>Analysis</h3>
            <div className="analysis">{selectedAnalysis.analysis}</div>
            <h3>AI Recommendation</h3>
            <div className="ai-recommendation">{selectedAnalysis.aiRecommendation}</div>
            <h3>Chat History</h3>
            <div className="chat-history">
              {selectedAnalysis.chatMessages.map((message, index) => (
                <div key={index} className={`chat-message ${message.role}`}>
                  <strong>{message.role === 'user' ? 'You: ' : 'AI: '}</strong>
                  {message.content}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}