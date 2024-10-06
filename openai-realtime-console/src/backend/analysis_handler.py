import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List

app = FastAPI()

class AudioSegment(BaseModel):
    role: str
    text: str
    audioUrl: str

class SavedAnalysis(BaseModel):
    id: str
    date: str
    transcript: str
    audioSegments: List[AudioSegment]
    analysis: str
    aiRecommendation: str
    chatMessages: List[str]

ANALYSIS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'analysis')

@app.get("/analyses", response_model=List[SavedAnalysis])
async def get_analyses():
    try:
        analysis_files = [f for f in os.listdir(ANALYSIS_DIR) if f.startswith('amy_analysis_') and f.endswith('.json')]
        analyses = []
        for file in analysis_files:
            with open(os.path.join(ANALYSIS_DIR, file), 'r') as f:
                analysis_data = json.load(f)
                analyses.append(SavedAnalysis(**analysis_data))
        return analyses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving analyses: {str(e)}")

@app.get("/analysis/{analysis_id}", response_model=SavedAnalysis)
async def get_analysis(analysis_id: str):
    try:
        file_path = os.path.join(ANALYSIS_DIR, f'amy_analysis_{analysis_id}.json')
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Analysis not found")
        with open(file_path, 'r') as f:
            analysis_data = json.load(f)
        return SavedAnalysis(**analysis_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving analysis: {str(e)}")

@app.get("/audio/{audio_filename}")
async def get_audio(audio_filename: str):
    try:
        file_path = os.path.join(ANALYSIS_DIR, audio_filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Audio file not found")
        return FileResponse(file_path, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving audio file: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
