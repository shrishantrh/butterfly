import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSpeechRecognitionOptions {
  onTranscript: (text: string) => void;
  onPartial?: (text: string) => void;
  lang?: string;
}

interface SpeechRecognitionResult {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

// Extend Window for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export function useSpeechRecognition({
  onTranscript,
  onPartial,
  lang = 'en-US',
}: UseSpeechRecognitionOptions): SpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isMounted = useRef(true);
  const shouldRestart = useRef(false);
  const restartTimer = useRef<number | null>(null);

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      shouldRestart.current = false;
      if (restartTimer.current) clearTimeout(restartTimer.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const createRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (isMounted.current) {
        setIsListening(true);
        setError(null);
        console.log('[Speech] Recognition started');
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!isMounted.current) return;
      
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript.trim()) {
        onTranscript(finalTranscript.trim());
      }
      if (interimTranscript && onPartial) {
        onPartial(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.log('[Speech] Error:', event.error);
      if (!isMounted.current) return;

      // "no-speech" and "aborted" are non-fatal — just restart
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return; // onend will handle restart
      }

      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permission.');
        shouldRestart.current = false;
        setIsListening(false);
      } else if (event.error === 'network') {
        setError('Network error — speech recognition requires internet.');
      } else {
        setError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('[Speech] Recognition ended, shouldRestart:', shouldRestart.current);
      if (!isMounted.current) return;

      if (shouldRestart.current) {
        // Clear any interim partial
        if (onPartial) onPartial('');
        // Restart after a brief pause to avoid rapid cycling
        restartTimer.current = window.setTimeout(() => {
          if (isMounted.current && shouldRestart.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              console.log('[Speech] Restarted');
            } catch (e) {
              console.log('[Speech] Restart failed, recreating:', e);
              // Recreate if the old instance is dead
              const newRecog = createRecognition();
              if (newRecog) {
                recognitionRef.current = newRecog;
                try { newRecog.start(); } catch {}
              }
            }
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [lang, onTranscript, onPartial]);

  const start = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition not supported in this browser. Use Chrome, Edge, or Safari.');
      return;
    }

    setError(null);
    shouldRestart.current = true;

    // Kill existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition = createRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      console.error('[Speech] Start failed:', e);
      setError('Failed to start speech recognition');
    }
  }, [isSupported, createRecognition]);

  const stop = useCallback(() => {
    shouldRestart.current = false;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
    if (onPartial) onPartial('');
  }, [onPartial]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return { isListening, isSupported, error, start, stop, toggle };
}
