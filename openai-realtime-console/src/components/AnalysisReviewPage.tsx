import React, { useState, useEffect } from 'react';
import { Box, Heading, Text, VStack, HStack, Select, Alert, AlertIcon } from '@chakra-ui/react';

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

const AnalysisReviewPage: React.FC = () => {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const response = await fetch('/api/analyses');
      if (!response.ok) {
        throw new Error('Failed to fetch analyses');
      }
      const data = await response.json();
      setAnalyses(data);
    } catch (error) {
      console.error('Error fetching analyses:', error);
      setError('Failed to load analyses. Please try again later.');
    }
  };

  const handleAnalysisSelect = (analysisId: string) => {
    const selected = analyses.find((analysis: SavedAnalysis) => analysis.id === analysisId);
    setSelectedAnalysis(selected || null);
  };

  return (
    <Box p={4}>
      <Heading mb={4}>Analysis Review</Heading>
      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}
      <HStack alignItems="flex-start" spacing={8}>
        <Box width="30%">
          <Select placeholder="Select an analysis" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleAnalysisSelect(e.target.value)}>
            {analyses.map((analysis: SavedAnalysis) => (
              <option key={analysis.id} value={analysis.id}>
                {new Date(analysis.date).toLocaleString()}
              </option>
            ))}
          </Select>
        </Box>
        {selectedAnalysis && (
          <VStack alignItems="flex-start" width="70%" spacing={4}>
            <Text><strong>Date:</strong> {new Date(selectedAnalysis.date).toLocaleString()}</Text>
            <Text><strong>Transcript:</strong></Text>
            <Box borderWidth={1} p={2} borderRadius="md" maxHeight="200px" overflowY="auto">
              <Text whiteSpace="pre-wrap">{selectedAnalysis.transcript}</Text>
            </Box>
            <Text><strong>Audio Segments:</strong></Text>
            {selectedAnalysis.audioSegments.map((segment: AudioSegment, index: number) => (
              <Box key={index} borderWidth={1} p={2} borderRadius="md" width="100%">
                <Text><strong>{segment.role}:</strong> {segment.text}</Text>
                <audio
                  src={`/api/audio/${segment.audioUrl}`}
                  controls
                  onError={(e: React.SyntheticEvent<HTMLAudioElement, Event>) => console.error('Audio playback error:', e)}
                  style={{ width: '100%' }}
                />
              </Box>
            ))}
            <Text><strong>Analysis:</strong></Text>
            <Box borderWidth={1} p={2} borderRadius="md" width="100%">
              <Text>{selectedAnalysis.analysis}</Text>
            </Box>
            <Text><strong>AI Recommendation:</strong></Text>
            <Box borderWidth={1} p={2} borderRadius="md" width="100%">
              <Text>{selectedAnalysis.aiRecommendation}</Text>
            </Box>
          </VStack>
        )}
      </HStack>
    </Box>
  );
};

export default AnalysisReviewPage;
