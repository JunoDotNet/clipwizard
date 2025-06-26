// src/hooks/useTranscription.js
import { useState } from 'react';
import { Buffer } from 'buffer';
import { useAppContext } from '../context/AppContext';


export default function useTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState(null);
  const [error, setError] = useState(null);
  const { setTranscript, setWavPath } = useAppContext();

  const transcribe = async (file) => {
    setIsTranscribing(true);
    setError(null);

    try {
        const rawFile = file.originalFile || file;
        const arrayBuffer = await rawFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer); // 👈 Convert to Node Buffer
        const { transcript, wavPath } = await window.electronAPI.transcribeBuffer(buffer, file.name);
        setTranscript(transcript);       // ⬅️ saves to context
        setWavPath(wavPath);             // ⬅️ also saves to context
        setTranscription(transcript);    // ⬅️ optional: if you're still using local state
    } catch (err) {
        console.error('Transcription failed:', err);
        setError(err.message || 'Failed to transcribe');
    } finally {
        setIsTranscribing(false);
    }
};



  return { isTranscribing, transcription, error, transcribe };
}
