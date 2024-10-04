import React, { useState } from 'react';
import { Button } from '../components/button/Button';
import './CallAnalysisPage.scss';

// You might need to install axios: npm install axios
import axios from 'axios';

// Make sure to set up your OpenAI API key in your environment variables
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

export function CallAnalysisPage({ transcript, onBack }: { transcript: string, onBack: () => void }) {
  const [analysis, setAnalysis] = useState<string>('');
  const [educationPlan, setEducationPlan] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const analyzeCall = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-4", // or whichever model you prefer
          messages: [
            {
              role: "system",
              content: "You are an expert sales coach analyzing a conversation between a sales representative and a small business owner discussing financing options. Provide a detailed analysis of the call and create an education plan for the sales representative."
            },
            {
              role: "user",
              content: `Please analyze this sales call transcript and provide:
1. A detailed analysis of the call, including scores for different aspects (opening, needs assessment, product knowledge, etc.)
2. An overall score out of 10
3. Key strengths and areas for improvement
4. A comprehensive education plan for the sales representative

Here's the transcript:

${transcript}`
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data.choices[0].message.content;
      
      // Split the result into analysis and education plan
      const [analysisSection, educationPlanSection] = result.split('Education Plan:');
      
      setAnalysis(analysisSection.trim());
      setEducationPlan('Education Plan:' + educationPlanSection.trim());
    } catch (error) {
      console.error('Error analyzing call:', error);
      setAnalysis('Error occurred while analyzing the call. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="call-analysis-page">
      <h1>Call Analysis</h1>
      <div className="transcript">
        <h2>Call Transcript</h2>
        <pre>{transcript}</pre>
      </div>
      <Button
        label={isLoading ? "Analyzing..." : "Analyze Call"}
        onClick={analyzeCall}
        disabled={isLoading}
      />
      {analysis && (
        <div className="analysis-result">
          <h2>Analysis Result</h2>
          <pre>{analysis}</pre>
        </div>
      )}
      {educationPlan && (
        <div className="education-plan">
          <h2>Education Plan</h2>
          <pre>{educationPlan}</pre>
        </div>
      )}
      <Button label="Back to Console" onClick={onBack} />
    </div>
  );
}