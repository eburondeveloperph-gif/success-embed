
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { LiveAPIProvider, useLiveAPIContext } from './contexts/LiveAPIContext';
import { AudioRecorder } from './lib/audio-recorder';
import { Modality } from '@google/genai';

/**
 * Subtitle Overlay Component
 * Handles rendering the transcription with 16px thin text and auto-clear logic.
 */
function TranscriptionOverlay() {
  const { client, connected, connect, disconnect, setConfig } = useLiveAPIContext();
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [audioRecorder] = useState(() => new AudioRecorder());
  const subtitleRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Configure the Live API for transcription
  useEffect(() => {
    setConfig({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: {
        parts: [{ text: 'You are a real-time transcription engine. Your only job is to provide accurate text representations of audio for captions.' }]
      }
    });
  }, [setConfig]);

  // Handle transcription events
  useEffect(() => {
    const handleTranscription = (text: string) => {
      setCurrentText((prev) => {
        const newSegment = (prev ? ' ' : '') + text;
        
        // Check if adding this text would overflow the screen width
        if (subtitleRef.current && containerRef.current) {
          const currentWidth = subtitleRef.current.offsetWidth;
          const maxWidth = containerRef.current.offsetWidth * 0.9; // 90% of screen width

          if (currentWidth >= maxWidth) {
            // Screen is filled, clear and start with the new text on the "next" line/turn
            return text;
          }
        }
        return prev + newSegment;
      });
    };

    const handleTurnComplete = () => {
      // Clear text when the conversation turn changes (next speaker/text block)
      setCurrentText('');
    };

    client.on('inputTranscription', (text) => handleTranscription(text));
    client.on('outputTranscription', (text) => handleTranscription(text));
    client.on('turncomplete', handleTurnComplete);
    client.on('interrupted', handleTurnComplete);

    return () => {
      client.off('inputTranscription', handleTranscription);
      client.off('outputTranscription', handleTranscription);
      client.off('turncomplete', handleTurnComplete);
      client.off('interrupted', handleTurnComplete);
    };
  }, [client]);

  // Manage Audio Recording and Connection
  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([{ mimeType: 'audio/pcm;rate=16000', data: base64 }]);
    };

    if (captionsEnabled) {
      connect().then(() => {
        audioRecorder.on('data', onData);
        audioRecorder.start();
      }).catch(err => {
        console.error("Connection failed", err);
        setCaptionsEnabled(false);
      });
    } else {
      audioRecorder.stop();
      audioRecorder.off('data', onData);
      if (connected) disconnect();
      setCurrentText('');
    }

    return () => {
      audioRecorder.off('data', onData);
      audioRecorder.stop();
    };
  }, [captionsEnabled, client, connect, disconnect, audioRecorder]);

  return (
    <>
      {/* Bottom Control Bar - Mimics meeting page navbar position */}
      <div className="bottom-navbar">
        <button 
          className={`caption-nav-item ${captionsEnabled ? 'active' : ''}`}
          onClick={() => setCaptionsEnabled(!captionsEnabled)}
          title={captionsEnabled ? "Turn off captions" : "Turn on captions"}
        >
          <span className="material-symbols-outlined">
            {captionsEnabled ? 'closed_caption' : 'closed_caption_disabled'}
          </span>
          <span className="nav-label">Captions</span>
        </button>
      </div>

      {/* Caption Display Area */}
      {captionsEnabled && currentText && (
        <div className="subtitle-overlay-container" ref={containerRef}>
          <div className="subtitle-wrapper">
            <div className="subtitle-text-content" ref={subtitleRef}>
              {currentText}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Main application component.
 */
function App() {
  const apiKey = process.env.API_KEY || '';

  return (
    <LiveAPIProvider apiKey={apiKey}>
      <div className="App main-layout">
        <iframe
          src="https://success.eburon.ai"
          className="app-iframe"
          title="Eburon Success"
          allow="microphone; camera; geolocation; autoplay; encrypted-media; fullscreen"
        />
        <TranscriptionOverlay />
      </div>
    </LiveAPIProvider>
  );
}

export default App;
