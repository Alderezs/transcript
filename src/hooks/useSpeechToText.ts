import { useState, useEffect, useCallback, useRef } from 'react';

export type SpeechState = 'idle' | 'recording' | 'paused' | 'error';

export interface UseSpeechToTextReturn {
  transcript: string;
  interimTranscript: string;
  isRecording: boolean;
  state: SpeechState;
  start: (initialText?: string) => void;
  stop: () => void;
  clear: () => void;
  error: string | null;
  lang: string;
  setLang: (lang: string) => void;
  setTranscript: (text: string) => void;
}

export function useSpeechToText(): UseSpeechToTextReturn {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [state, setState] = useState<SpeechState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState('id-ID');
  
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    isRecordingRef.current = (state === 'recording');
  }, [state]);

  // Sync language selection with the Web Speech Recognition instance
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
      console.log('Language updated on recognition object to:', lang);
    }
  }, [lang]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Browser Anda tidak mendukung Speech Recognition.');
      return;
    }

    if (!recognitionRef.current) {
      console.log('Initializing SpeechRecognition');
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        console.log('SpeechRecognition started');
        setState('recording');
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let final = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcriptText = result[0].transcript;
          
          if (result.isFinal) {
            final += transcriptText;
          } else {
            interim += transcriptText;
          }
        }

        if (final) {
          setTranscript((prev) => {
            const newTranscript = prev ? prev + ' ' + final : final;
            console.log('Final transcript updated:', newTranscript);
            return newTranscript;
          });
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        let message = 'Terjadi kesalahan pada pengenalan suara.';
        let isFatal = true;

        if (event.error === 'not-allowed') {
          message = 'Izin mikrofon ditolak atau dibatasi oleh browser. Jika Anda menggunakan panel pratinjau, silakan klik tombol "Buka di Tab Baru" di atas untuk menggunakan mikrofon.';
        } else if (event.error === 'network') {
          message = 'Terjadi pembatasan koneksi browser (Network Error). Jika Anda menggunakan panel pratinjau, silakan klik tombol "Buka di Tab Baru" di atas untuk menjalankan transkripsi.';
          isFatal = true; // Make fatal to prevent restart loops
        } else if (event.error === 'no-speech') {
          // Common when user is silent, not an error we want to show
          return;
        } else if (event.error === 'aborted') {
          // Triggered by manual stop(), ignore
          return;
        }

        setError(message);
        
        // Stop recording state on fatal errors (including network now)
        if (isFatal) {
          setState('idle');
          isRecordingRef.current = false;
        }
      };

      recognition.onend = () => {
        console.log('SpeechRecognition session ended.');
        
        // If we are still in recording mode (e.g. browser timed out due to silence)
        // we auto-restart with a brief delay to allow browser to release audio context.
        if (isRecordingRef.current) {
          console.log('Attempting automatic restart with a 300ms delay...');
          setTimeout(() => {
            // Double check if the user hasn't manually stopped it in the meantime
            if (isRecordingRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
                console.log('Auto-restart successful');
              } catch (e) {
                console.error('Auto-restart failed in timeout:', e);
                // If it fails because it's already active or starting, we can ignore
                // otherwise transition back to idle
                const isAlreadyActive = e instanceof Error && (e.name === 'InvalidStateError' || e.message?.includes('already started'));
                if (!isAlreadyActive) {
                  setState('idle');
                  isRecordingRef.current = false;
                }
              }
            }
          }, 300);
        } else {
          setState('idle');
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        isRecordingRef.current = false;
        recognitionRef.current.stop();
      }
    };
  }, []);

  const start = useCallback((initialText?: string) => {
    if (recognitionRef.current) {
      try {
        if (initialText !== undefined) {
          setTranscript(initialText);
        }
        isRecordingRef.current = true;
        recognitionRef.current.start();
        setState('recording');
        setError(null);
      } catch (e: any) {
        if (e.name === 'InvalidStateError') {
          // Already started, ignore
          setState('recording');
        } else {
          console.error('Start error:', e);
          setError(`Gagal memulai: ${e.message}`);
          isRecordingRef.current = false;
        }
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      isRecordingRef.current = false;
      recognitionRef.current.stop();
      setState('idle');
      setInterimTranscript('');
    }
  }, []);

  const clear = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    transcript,
    interimTranscript,
    isRecording: state === 'recording',
    state,
    start,
    stop,
    clear,
    error,
    lang,
    setLang,
    setTranscript
  };
}
