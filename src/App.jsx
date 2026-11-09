import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, Mic, MicOff, VolumeX, Headphones, 
  MapPin, Activity, CheckCircle, Radio, Sparkles 
} from 'lucide-react';

const INITIAL_SPOTS = [
  {
    id: 1,
    name: 'Central Library - 3rd Floor Silent Stacks',
    category: 'Dead Silence',
    currentDb: 28,
    avgDb: 30,
    status: 'Optimal',
    capacity: '85% Seats Free',
    noiseTags: ['No Talking', 'Carpeted', 'Whisper Only'],
    coords: { x: 35, y: 25 }
  },
  {
    id: 2,
    name: 'CS Department - Graduate Reading Nook',
    category: 'White Noise',
    currentDb: 42,
    avgDb: 44,
    status: 'Comfortable',
    capacity: '40% Seats Free',
    noiseTags: ['Server Hum', 'Keyboards', 'AC Draft'],
    coords: { x: 65, y: 35 }
  },
  {
    id: 3,
    name: 'Student Center Courtyard Cafe',
    category: 'Lively/Chatter',
    currentDb: 68,
    avgDb: 65,
    status: 'Loud',
    capacity: 'Crowded',
    noiseTags: ['Music', 'Coffee Machine', 'Group Discussions'],
    coords: { x: 50, y: 70 }
  },
  {
    id: 4,
    name: 'Polytechnic North Veranda Garden',
    category: 'Headphone Friendly',
    currentDb: 48,
    avgDb: 50,
    status: 'Comfortable',
    capacity: '60% Seats Free',
    noiseTags: ['Breeze', 'Fountain Stream', 'Footsteps'],
    coords: { x: 20, y: 65 }
  }
];

export default function App() {
  const [spots, setSpots] = useState(INITIAL_SPOTS);
  const [filter, setFilter] = useState('All');
  const [selectedSpot, setSelectedSpot] = useState(INITIAL_SPOTS[0]);
  
  // Audio Meter States
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [liveDb, setLiveDb] = useState(0);
  const [meterHistory, setMeterHistory] = useState([]);

  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  // Web Audio API & Canvas Oscilloscope Logic
  const startDecibelMeter = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsMeasuring(true);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const renderFrame = () => {
        analyser.getByteFrequencyData(dataArray);

        // Approximate dB calculation based on RMS amplitude
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        // Normalize RMS into a standard 20dB - 90dB campus acoustic reading
        const calculatedDb = Math.min(95, Math.max(25, Math.round(20 + (rms / 255) * 75)));
        setLiveDb(calculatedDb);

        // Render Waveform / Audio Frequency onto Canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const barWidth = (canvas.width / bufferLength) * 2.2;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            // Color shifts based on intensity
            ctx.fillStyle = calculatedDb > 65 ? '#ef4444' : calculatedDb > 45 ? '#f59e0b' : '#10b981';
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
          }
        }

        animFrameRef.current = requestAnimationFrame(renderFrame);
      };

      renderFrame();
    } catch {
      alert('Microphone access is required to run the real-time acoustic meter.');
    }
  };

  const stopDecibelMeter = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setIsMeasuring(false);
    setLiveDb(0);
  };

  const handleLogCurrentReading = () => {
    if (!liveDb) return;
    setSpots(prev => prev.map(s => {
      if (s.id === selectedSpot.id) {
        return {
          ...s,
          currentDb: liveDb,
          status: liveDb < 35 ? 'Optimal' : liveDb < 55 ? 'Comfortable' : 'Loud'
        };
      }
      return s;
    }));
    setMeterHistory(prev => [{ time: 'Just now', db: liveDb, spot: selectedSpot.name }, ...prev.slice(0, 3)]);
  };

  const filteredSpots = spots.filter(s => filter === 'All' || s.category === filter);

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Bar */}
      <header style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', background: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>CampusSoundScape</h1>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Neurodivergent & Low-Sensory Acoustic Map</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Acoustic Status:</span>
          <span style={{ fontSize: '11px', background: '#064e3b', color: '#6ee7b7', padding: '4px 8px', borderRadius: '999px', border: '1px solid #059669' }}>
            Live Sync Ready
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
        
        {/* Left Section: Sensory Map & Spot Selector */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Sensory Filters */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['All', 'Dead Silence', 'White Noise', 'Headphone Friendly', 'Lively/Chatter'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  background: filter === cat ? '#2563eb' : '#1e293b',
                  color: filter === cat ? '#ffffff' : '#94a3b8',
                  border: '1px solid #334155',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Interactive Heatmap Canvas Mock */}
          <div style={{
            background: '#131b2e',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            height: '320px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '12px', left: '14px', fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
              CAMPUS SENSORY ZONES MAP (TOP-DOWN)
            </div>

            {/* Render Heatmap Nodes */}
            {filteredSpots.map(s => {
              const isSelected = selectedSpot.id === s.id;
              const color = s.currentDb < 35 ? '#10b981' : s.currentDb < 55 ? '#f59e0b' : '#ef4444';
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSpot(s)}
                  style={{
                    position: 'absolute',
                    top: `${s.coords.y}%`,
                    left: `${s.coords.x}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <div style={{
                    width: isSelected ? '46px' : '36px',
                    height: isSelected ? '46px' : '36px',
                    borderRadius: '50%',
                    background: color,
                    border: isSelected ? '4px solid #ffffff' : '2px solid rgba(255,255,255,0.4)',
                    boxShadow: `0 0 16px ${color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '800',
                    color: '#ffffff',
                    transition: 'all 0.2s ease'
                  }}>
                    {s.currentDb}
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#cbd5e1',
                    background: 'rgba(15, 23, 42, 0.85)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginTop: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    {s.name.split(' - ')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Acoustic Zone Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {filteredSpots.map(spot => {
              const isSelected = selectedSpot.id === spot.id;
              return (
                <div
                  key={spot.id}
                  onClick={() => setSelectedSpot(spot)}
                  style={{
                    background: isSelected ? '#1e293b' : '#0f172a',
                    border: isSelected ? '1px solid #3b82f6' : '1px solid #1e293b',
                    borderRadius: '12px',
                    padding: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: spot.category === 'Dead Silence' ? '#064e3b' : spot.category === 'White Noise' ? '#1e3a8a' : '#78350f',
                      color: spot.category === 'Dead Silence' ? '#6ee7b7' : spot.category === 'White Noise' ? '#93c5fd' : '#fde68a'
                    }}>
                      {spot.category}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: spot.currentDb < 35 ? '#10b981' : '#f59e0b' }}>
                      {spot.currentDb} dB
                    </span>
                  </div>

                  <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '8px 0 4px 0', color: '#f8fafc' }}>{spot.name}</h3>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 10px 0' }}>{spot.capacity}</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {spot.noiseTags.map(tag => (
                      <span key={tag} style={{ fontSize: '10px', background: '#111827', color: '#cbd5e1', padding: '2px 6px', borderRadius: '4px', border: '1px solid #334155' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Section: Live In-Browser Decibel Meter */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Volume2 size={18} color="#3b82f6" /> In-Browser Noise Meter
                </h2>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Uses Web Audio API & Fast Fourier Transform (FFT)</p>
              </div>

              {!isMeasuring ? (
                <button
                  onClick={startDecibelMeter}
                  style={{
                    background: '#10b981',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Mic size={14} /> Start Mic
                </button>
              ) : (
                <button
                  onClick={stopDecibelMeter}
                  style={{
                    background: '#ef4444',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <MicOff size={14} /> Stop
                </button>
              )}
            </div>

            {/* Meter Gauge Box */}
            <div style={{ background: '#030712', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #1e293b', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Target Spot: {selectedSpot.name.split(' - ')[0]}
              </span>
              <div style={{ fontSize: '56px', fontWeight: '900', color: liveDb > 65 ? '#ef4444' : liveDb > 45 ? '#f59e0b' : '#10b981', margin: '4px 0' }}>
                {liveDb || '--'}
                <span style={{ fontSize: '20px', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>dB</span>
              </div>
              <p style={{ fontSize: '12px', color: '#cbd5e1' }}>
                {liveDb === 0 ? 'Microphone offline' : liveDb < 35 ? 'Whisper Quiet / Library Norm' : liveDb < 55 ? 'Moderate Classroom Hum' : 'High Noise Level'}
              </p>

              {/* Real-time Spectrum Canvas */}
              <canvas
                ref={canvasRef}
                width={280}
                height={70}
                style={{ width: '100%', height: '70px', borderRadius: '6px', marginTop: '10px', background: '#0f172a' }}
              />
            </div>

            {/* Contribute / Calibrate Button */}
            <button
              disabled={!isMeasuring}
              onClick={handleLogCurrentReading}
              style={{
                width: '100%',
                padding: '12px',
                background: isMeasuring ? '#2563eb' : '#1e293b',
                color: isMeasuring ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: isMeasuring ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle size={16} /> Contribute Live Reading to Spot
            </button>
          </div>

          {/* Crowd Verification Ledger */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 10px 0', color: '#cbd5e1' }}>Recent Student Submissions</h3>
            {meterHistory.length === 0 ? (
              <p style={{ fontSize: '11px', color: '#64748b' }}>No live decibel submissions recorded yet in this session.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {meterHistory.map((item, idx) => (
                  <div key={idx} style={{ background: '#1e293b', padding: '8px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span>{item.spot.split(' - ')[0]}</span>
                    <span style={{ color: '#10b981', fontWeight: '800' }}>{item.db} dB</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}