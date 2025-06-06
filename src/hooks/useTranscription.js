// src/hooks/useTranscription.js
import { useState } from 'react';
import { Buffer } from 'buffer';


export default function useTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState(null);
  const [error, setError] = useState(null);

  const transcribe = async (file) => {
    setIsTranscribing(true);
    setError(null);

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer); // 👈 Convert to Node Buffer
        const result = await window.electronAPI.transcribeBuffer(buffer, file.name);
        console.log('📝 Transcription result:', result);
        setTranscription(result);
    } catch (err) {
        console.error('Transcription failed:', err);
        setError(err.message || 'Failed to transcribe');
    } finally {
        setIsTranscribing(false);
    }
};



  return { isTranscribing, transcription, error, transcribe };
}
