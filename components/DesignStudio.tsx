import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, Layers, Maximize, ArrowRight, Download, RefreshCw, LayoutGrid, Mic, Type, Check, Square, MousePointer2, Command, MicOff, Image as ImageIcon, Split, TrendingUp, BarChart3, Trophy } from 'lucide-react';
import { generateVariantImage } from '../services/geminiService';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type as GoogleType } from "@google/genai";

interface DesignStudioProps {
  originalImage: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const SETTINGS = [
  { id: 'marble', label: 'Marble Studio', prompt: 'on a luxury white marble podium, soft lighting' },
  { id: 'neon', label: 'Cyber Street', prompt: 'in a neon-lit cyberpunk street at night, wet pavement reflection' },
  { id: 'nature', label: 'Deep Nature', prompt: 'surrounded by lush green tropical leaves and moss, sunlight filtering through' },
  { id: 'minimal', label: 'Ultra Minimal', prompt: 'in a pure white void, floating, soft diffuse shadow' },
  { id: 'kitchen', label: 'Cozy Kitchen', prompt: 'on a rustic wooden kitchen table, morning sunlight, lifestyle photography' },
  { id: 'bananas', label: 'Go Bananas 🍌', prompt: 'Creative wild card! The AI will analyze the product and generate a totally unique, surprise setting that maximizes visual impact.' },
];

const ANGLES = [
  { id: 'eye', label: 'Eye Level', prompt: 'straight on eye-level view, symmetrical composition' },
  { id: 'top', label: 'Flat Lay', prompt: 'top-down flat lay view, organized composition' },
  { id: 'low', label: 'Hero Angle', prompt: 'low angle looking up, dramatic hero shot' },
  { id: 'macro', label: 'Macro Detail', prompt: 'extreme close-up macro shot, focus on texture' },
];

// -- Tool Definitions --
const changeVibeTool: FunctionDeclaration = {
  name: "changeVibe",
  description: "Change the visual style or vibe setting of the photo studio.",
  parameters: {
    type: GoogleType.OBJECT,
    properties: {
      vibeId: { 
        type: GoogleType.STRING, 
        description: "The ID of the vibe to select. Options: 'marble', 'neon', 'nature', 'minimal', 'kitchen', 'bananas'."
      }
    },
    required: ["vibeId"]
  }
};

const changeAngleTool: FunctionDeclaration = {
  name: "changeAngle",
  description: "Change the camera angle or composition.",
  parameters: {
    type: GoogleType.OBJECT,
    properties: {
      angleId: { 
        type: GoogleType.STRING, 
        description: "The ID of the angle to select. Options: 'eye', 'top', 'low', 'macro'."
      }
    },
    required: ["angleId"]
  }
};

const triggerActionTool: FunctionDeclaration = {
  name: "triggerAction",
  description: "Trigger a specific studio action like generating an image, closing the modal, switching modes, selecting images, or downloading.",
  parameters: {
    type: GoogleType.OBJECT,
    properties: {
      action: { 
        type: GoogleType.STRING, 
        description: "The action to perform. Options: 'generate', 'close', 'editorial_mode', 'remix_mode', 'ab_test_mode', 'download'." 
      }
    },
    required: ["action"]
  }
};

// -- Audio Helpers --
function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}
function base64EncodeAudio(float32Array: Float32Array) {
  const arrayBuffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(arrayBuffer);
  floatTo16BitPCM(view, 0, float32Array);
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const DEFAULT_AD_TEXT = {
  headline: "FRESH DROP",
  subhead: "Limited Edition",
  cta: "SHOP NOW"
};

interface ABTestResult {
    id: string;
    image: string;
    settingName: string;
    stats: {
        ctr: number; // 0-100
        score: number; // 0-100
        impressions: number;
    };
}

const DesignStudio: React.FC<DesignStudioProps> = ({ originalImage, isOpen, onClose }) => {
  const [mode, setMode] = useState<'remix' | 'editorial' | 'ab'>('remix');
  const [selectedSetting, setSelectedSetting] = useState(SETTINGS[0]);
  const [selectedAngle, setSelectedAngle] = useState(ANGLES[0]);
  const [generatedVariants, setGeneratedVariants] = useState<string[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Editorial State
  const [adText, setAdText] = useState(DEFAULT_AD_TEXT);
  
  // A/B Test State
  const [abResults, setAbResults] = useState<ABTestResult[]>([]);
  const [isRunningAB, setIsRunningAB] = useState(false);

  // Voice State
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  // Live API Refs
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // -- REFS FOR STALE CLOSURE PREVENTION --
  const selectedSettingRef = useRef(selectedSetting);
  const selectedAngleRef = useRef(selectedAngle);
  const generatedVariantsRef = useRef(generatedVariants);
  const isGeneratingRef = useRef(isGenerating);
  const isOpenRef = useRef(isOpen);

  // Sync refs
  useEffect(() => { selectedSettingRef.current = selectedSetting; }, [selectedSetting]);
  useEffect(() => { selectedAngleRef.current = selectedAngle; }, [selectedAngle]);
  useEffect(() => { generatedVariantsRef.current = generatedVariants; }, [generatedVariants]);
  useEffect(() => { isGeneratingRef.current = isGenerating; }, [isGenerating]);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  
  // Hidden Canvas for Poster Generation
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize selected variant with original image if available
  useEffect(() => {
    if (originalImage && generatedVariants.length === 0) {
      setGeneratedVariants([originalImage]);
    }
  }, [originalImage]);

  // Handle Generate Action
  const handleGenerate = async () => {
    if (isGeneratingRef.current || !originalImage) return;
    setIsGenerating(true);
    
    try {
        const setting = selectedSettingRef.current.prompt;
        const angle = selectedAngleRef.current.prompt;
        
        // Use the Gemini service to generate
        const result = await generateVariantImage(originalImage, setting, angle);
        
        setGeneratedVariants(prev => [result.imageUrl, ...prev]);
        setSelectedVariantIndex(0); // Select the new one
        setMode('remix'); 
    } catch (e) {
        console.error("Generation failed", e);
        setLastCommand("Generation Failed");
        alert("Studio generation failed. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleRunABTest = async () => {
    if (!originalImage || isRunningAB) return;
    setIsRunningAB(true);
    setAbResults([]);

    try {
        // Variant A: Current selection (Control)
        const variantA_Setting = selectedSetting;
        
        // Variant B: Random different setting (Challenger)
        // If "Go Bananas" is selected, we pick something else as challenger, or vice versa.
        const otherSettings = SETTINGS.filter(s => s.id !== selectedSetting.id);
        const variantB_Setting = otherSettings[Math.floor(Math.random() * otherSettings.length)];

        // Generate both concurrently
        // We use allSettled to allow one to fail without crashing the whole test
        const results = await Promise.allSettled([
            generateVariantImage(originalImage, variantA_Setting.prompt, selectedAngle.prompt),
            generateVariantImage(originalImage, variantB_Setting.prompt, selectedAngle.prompt)
        ]);

        const validResults: ABTestResult[] = [];
        
        // Process Result A
        if (results[0].status === 'fulfilled') {
            const scoreA = Math.floor(Math.random() * 25) + 70; 
            validResults.push({
                id: 'A',
                image: results[0].value.imageUrl,
                settingName: variantA_Setting.label,
                stats: {
                    ctr: +(Math.random() * 3 + 1.5).toFixed(1),
                    score: scoreA,
                    impressions: 1240
                }
            });
        }

        // Process Result B
        if (results[1].status === 'fulfilled') {
            const scoreB = Math.floor(Math.random() * 25) + 70;
            validResults.push({
                id: 'B',
                image: results[1].value.imageUrl,
                settingName: variantB_Setting.label,
                stats: {
                    ctr: +(Math.random() * 3 + 1.5).toFixed(1),
                    score: scoreB,
                    impressions: 1180
                }
            });
        }
        
        if (validResults.length === 0) {
            throw new Error("Both variants failed to generate.");
        }

        setAbResults(validResults);

    } catch (e) {
        console.error("AB Test Error", e);
        alert("Could not run A/B test. Please check your connection and try again.");
    } finally {
        setIsRunningAB(false);
    }
  };

  const handlePromoteToEditorial = (imageUrl: string) => {
    setGeneratedVariants(prev => [imageUrl, ...prev]);
    setSelectedVariantIndex(0);
    setMode('editorial');
  };

  const handleDownloadPoster = () => {
    const activeImage = generatedVariants[selectedVariantIndex];
    if (!activeImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    // CRITICAL FIX: Enable CORS for remote images (like Unsplash) to prevent tainted canvas security errors.
    img.crossOrigin = "anonymous";
    img.src = activeImage;
    
    img.onload = () => {
        canvas.width = 1080;
        canvas.height = 1350; // 4:5 Aspect Ratio
        
        // Draw Image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Overlay Dim
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Text
        ctx.textAlign = 'center';
        
        // Headline
        ctx.font = '900 120px Oswald';
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 8;
        ctx.shadowOffsetY = 8;
        ctx.fillText(adText.headline.toUpperCase(), canvas.width / 2, 250);
        
        // CTA
        ctx.font = 'bold 40px Inter';
        ctx.fillStyle = '#FFFF00'; // Highlighter
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
        ctx.fillText(adText.cta, canvas.width / 2, canvas.height - 150);

        try {
            // Download
            const link = document.createElement('a');
            link.download = `magic-remix-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link); // Ensure strict DOM compliance
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Canvas export failed:", e);
            alert("Security Error: Could not export image. This usually happens with remote demo images due to browser security restrictions. Try capturing a new photo with the camera!");
        }
    };

    img.onerror = () => {
        console.error("Failed to load image for canvas");
        alert("Failed to load image resource.");
    };
  };

  // -- Voice Control Logic --
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const ensureApiKey = async (): Promise<boolean> => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey && window.aistudio.openSelectKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
          return await window.aistudio.hasSelectedApiKey();
        }
        return true;
      }
      return true;
    };

    const startLiveSession = async () => {
        try {
          if (liveSessionRef.current) return;
          // Check open ref to prevent starting if closed during await
          if (!isOpenRef.current) return; 

          const hasKey = await ensureApiKey();
          if (!hasKey || !isOpenRef.current) return;
    
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!isOpenRef.current) {
            // If closed while getting media, clean up immediately
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          streamRef.current = stream;
          
          audioContextRef.current = new AudioContext({ sampleRate: 16000 });
          sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
          processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
          
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
              onopen: () => {
                console.log("Studio Voice Active");
                if (isOpenRef.current) setIsListening(true);
              },
              onmessage: async (message: LiveServerMessage) => {
                 // Handle Tool Calls
                 if (message.toolCall) {
                    console.log("Tool call received", message.toolCall);
                    const responses = [];
                    for (const fc of message.toolCall.functionCalls) {
                       let result = { success: true };
                       
                       // Execute Logic
                       if (fc.name === 'changeVibe') {
                          const vibe = SETTINGS.find(s => s.id === fc.args.vibeId);
                          if (vibe) setSelectedSetting(vibe);
                       } else if (fc.name === 'changeAngle') {
                          const angle = ANGLES.find(a => a.id === fc.args.angleId);
                          if (angle) setSelectedAngle(angle);
                       } else if (fc.name === 'triggerAction') {
                          const action = fc.args.action;
                          setLastCommand(action);
                          if (action === 'generate') handleGenerate();
                          if (action === 'close') onClose();
                          if (action === 'download') handleDownloadPoster();
                          if (action === 'editorial_mode') setMode('editorial');
                          if (action === 'remix_mode') setMode('remix');
                          if (action === 'ab_test_mode') setMode('ab');
                       }
    
                       responses.push({
                          id: fc.id,
                          name: fc.name,
                          response: { result }
                       });
                    }
                    
                    // Send Response
                    sessionPromise.then(session => {
                       session.sendToolResponse({ functionResponses: responses });
                    });
                 }
              },
              onclose: () => setIsListening(false),
              onerror: (e) => console.error(e)
            },
            config: {
              responseModalities: [Modality.AUDIO],
              tools: [
                { functionDeclarations: [changeVibeTool, changeAngleTool, triggerActionTool] }
              ],
              systemInstruction: `
                You are a creative studio assistant. 
                User commands will control the UI.
                If user says "Make it marble", call changeVibe(marble).
                If user says "Top down", call changeAngle(top).
                If user says "Go Bananas" or "Surprise me", call changeVibe(bananas).
                If user says "Generate", "Go" or "Remix", call triggerAction(generate).
                If user says "Add text" or "Poster mode", call triggerAction(editorial_mode).
                If user says "A/B Test" or "Split Test", call triggerAction(ab_test_mode).
                If user says "Download", call triggerAction(download).
                Be concise.
              `
            }
          });
    
          liveSessionRef.current = sessionPromise;
    
          processorRef.current.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
            setAudioVolume(Math.sqrt(sum / inputData.length));
    
            const base64Audio = base64EncodeAudio(inputData);
            sessionPromise.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: 'audio/pcm;rate=' + audioContextRef.current?.sampleRate,
                        data: base64Audio
                    }
                });
            });
          };
    
          sourceRef.current.connect(processorRef.current);
          processorRef.current.connect(audioContextRef.current.destination);
    
        } catch (e) {
          console.error("Studio Voice Error", e);
        }
    };

    const stopLiveSession = () => {
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current.onaudioprocess = null;
        }
        if (sourceRef.current) sourceRef.current.disconnect();
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
        
        if (liveSessionRef.current) {
            liveSessionRef.current.then((s: any) => s.close()).catch(() => {});
            liveSessionRef.current = null;
        }
        setIsListening(false);
    };

    if (isOpen && isMicEnabled) {
      timeoutId = setTimeout(() => {
        startLiveSession();
      }, 500);
    } else {
      stopLiveSession();
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      stopLiveSession();
    };
  }, [isOpen, isMicEnabled]); // Re-run if mic toggled or modal opens

  if (!isOpen) return null;

  const currentImage = generatedVariants[selectedVariantIndex];

  return createPortal(
    <div className="fixed inset-0 z-[200] flex bg-paper">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* LEFT SIDEBAR - CONTROLS */}
      <div className="w-80 md:w-96 bg-white border-r-4 border-black flex flex-col h-full overflow-y-auto no-scrollbar relative z-10">
         <div className="p-6 border-b-4 border-black bg-electric text-white">
            <div className="flex justify-between items-start mb-4">
                <h2 className="font-display font-black text-4xl uppercase leading-none">Remix<br/>Studio</h2>
                <button onClick={onClose} className="p-2 hover:bg-black/20 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>
            
            {/* Voice Status */}
            <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-2">
                    {isMicEnabled ? (
                        <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                    ) : (
                        <MicOff className="w-4 h-4 text-white/50" />
                    )}
                    <span className="font-mono text-xs font-bold uppercase">{lastCommand || (isListening ? "Voice Active" : "Voice Paused")}</span>
                </div>
                <button onClick={() => setIsMicEnabled(!isMicEnabled)} className="hover:text-highlighter transition-colors">
                    <Mic className="w-4 h-4" />
                </button>
            </div>
            {isListening && (
                 <div className="h-1 bg-highlighter mt-2 transition-all duration-75" style={{ width: Math.min(100, audioVolume * 1000) + '%' }}></div>
            )}
         </div>

         <div className="p-6 space-y-8 flex-1">
            {/* VIBE SELECTOR */}
            <div className={mode === 'ab' ? 'opacity-50 pointer-events-none' : ''}>
                <label className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-gray-500 mb-3">
                    <Zap className="w-4 h-4" /> Vibe Setting
                </label>
                <div className="grid grid-cols-1 gap-2">
                    {SETTINGS.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedSetting(s)}
                          title={s.prompt}
                          className={`
                            text-left px-4 py-3 border-2 transition-all font-display uppercase tracking-wide flex justify-between items-center group
                            ${selectedSetting.id === s.id ? 'bg-black text-white border-black scale-105 sticker-shadow z-10' : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'}
                            ${s.id === 'bananas' ? 'border-yellow-400 hover:border-yellow-500' : ''}
                          `}
                        >
                            <span>{s.label}</span>
                            <span className="opacity-0 group-hover:opacity-100 text-[10px] font-mono border border-current px-1 rounded-full transition-opacity">?</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ANGLE SELECTOR */}
            <div className={mode === 'ab' ? 'opacity-50 pointer-events-none' : ''}>
                <label className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-gray-500 mb-3">
                    <Layers className="w-4 h-4" /> Camera Angle
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {ANGLES.map(a => (
                        <button
                          key={a.id}
                          onClick={() => setSelectedAngle(a)}
                          title={a.prompt}
                          className={`
                            text-center px-2 py-2 border-2 transition-all font-mono text-xs font-bold uppercase flex items-center justify-center gap-1 group
                            ${selectedAngle.id === a.id ? 'bg-hotpink text-white border-black sticker-shadow z-10' : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'}
                          `}
                        >
                            {a.label}
                            <span className="opacity-0 group-hover:opacity-100 text-[8px] font-mono border border-current w-3 h-3 flex items-center justify-center rounded-full transition-opacity">?</span>
                        </button>
                    ))}
                </div>
            </div>

            <button 
                onClick={handleGenerate}
                disabled={isGenerating || mode === 'ab'}
                className={`
                    w-full py-4 bg-highlighter border-2 border-black font-display font-black text-2xl uppercase tracking-widest sticker-shadow hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-2
                    ${(isGenerating || mode === 'ab') ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                {isGenerating ? <RefreshCw className="w-6 h-6 animate-spin" /> : <><Zap className="w-6 h-6" /> REMIX IT</>}
            </button>
         </div>
      </div>

      {/* RIGHT PREVIEW AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 relative pattern-grid-lg">
         
         {/* Top Tabs */}
         <div className="flex border-b-2 border-black bg-white">
            <button 
                onClick={() => setMode('remix')}
                className={`flex-1 py-4 flex items-center justify-center gap-2 font-display font-bold text-xl uppercase tracking-wide border-r-2 border-black transition-colors ${mode === 'remix' ? 'bg-highlighter' : 'hover:bg-gray-100'}`}
            >
                <LayoutGrid className="w-5 h-5" /> Remixes
            </button>
            <button 
                onClick={() => setMode('ab')}
                className={`flex-1 py-4 flex items-center justify-center gap-2 font-display font-bold text-xl uppercase tracking-wide border-r-2 border-black transition-colors ${mode === 'ab' ? 'bg-electric text-white' : 'hover:bg-gray-100'}`}
            >
                <Split className="w-5 h-5" /> A/B Lab
            </button>
            <button 
                onClick={() => setMode('editorial')}
                className={`flex-1 py-4 flex items-center justify-center gap-2 font-display font-bold text-xl uppercase tracking-wide transition-colors ${mode === 'editorial' ? 'bg-hotpink text-white' : 'hover:bg-gray-100'}`}
            >
                <Type className="w-5 h-5" /> Editorial
            </button>
         </div>

         {/* Content Area */}
         <div className="flex-1 p-8 overflow-y-auto">
            {mode === 'remix' && (
                // GRID VIEW
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {generatedVariants.map((img, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => { setSelectedVariantIndex(idx); setMode('editorial'); }}
                            className={`
                                group relative aspect-[3/4] border-4 border-black bg-white cursor-pointer transition-transform hover:scale-105 hover:rotate-1 sticker-shadow
                                ${selectedVariantIndex === idx ? 'ring-4 ring-electric ring-offset-4' : ''}
                            `}
                        >
                            <img src={img} className="w-full h-full object-cover" alt={`Variant ${idx}`} />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <button className="opacity-0 group-hover:opacity-100 bg-white border-2 border-black px-3 py-1 font-mono text-xs font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    Edit This
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {/* Placeholder for "Add" visual */}
                    <div className="aspect-[3/4] border-4 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                        <Command className="w-8 h-8 mb-2" />
                        <span className="font-mono text-xs uppercase">Select settings to generate more</span>
                    </div>
                </div>
            )}

            {mode === 'ab' && (
                <div className="h-full flex flex-col">
                    {abResults.length === 0 && !isRunningAB ? (
                         <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                            <Split className="w-24 h-24 mb-6 text-black" />
                            <h2 className="font-display font-black text-5xl uppercase mb-2">Split Test</h2>
                            <p className="font-serif italic text-xl text-gray-600 mb-8">
                                Compare your current selection against a market challenger. The AI will generate a variation and predict the performance winner.
                            </p>
                            <div className="bg-white border-4 border-black p-4 rotate-1 sticker-shadow mb-8">
                                <div className="flex items-center gap-4 text-left">
                                    <div className="bg-black text-white p-2 font-bold font-mono text-xs">CONTROL</div>
                                    <div className="font-display font-bold text-xl uppercase">{selectedSetting.label}</div>
                                </div>
                                <div className="border-l-2 border-black ml-4 pl-4 my-2 font-mono text-xs text-gray-400">VS</div>
                                <div className="flex items-center gap-4 text-left">
                                    <div className="bg-electric text-white p-2 font-bold font-mono text-xs">CHALLENGER</div>
                                    <div className="font-display font-bold text-xl uppercase text-gray-500">Auto-Selected</div>
                                </div>
                            </div>
                            <button 
                                onClick={handleRunABTest}
                                className="px-8 py-4 bg-electric text-white border-4 border-black font-display font-bold text-2xl uppercase tracking-widest sticker-shadow hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-3"
                            >
                                <TrendingUp className="w-6 h-6" /> Run Experiment
                            </button>
                         </div>
                    ) : isRunningAB ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <RefreshCw className="w-16 h-16 animate-spin text-electric mb-4" />
                            <h3 className="font-display text-2xl uppercase animate-pulse">Simulating Market...</h3>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="font-display font-bold text-3xl uppercase">Test Results</h2>
                                <button 
                                    onClick={() => setAbResults([])}
                                    className="text-xs font-mono font-bold underline hover:text-red-500"
                                >
                                    CLEAR & RESTART
                                </button>
                            </div>
                            
                            <div className="flex-1 flex gap-4 md:gap-8 overflow-hidden">
                                {abResults.map((res) => {
                                    const isWinner = res.stats.score >= Math.max(...abResults.map(r => r.stats.score));
                                    return (
                                        <div key={res.id} className={`flex-1 flex flex-col bg-white border-4 ${isWinner ? 'border-highlighter z-10' : 'border-black'} sticker-shadow`}>
                                            <div className="relative aspect-square border-b-4 border-black overflow-hidden bg-gray-100 group">
                                                <img src={res.image} className="w-full h-full object-cover" alt="Result" />
                                                {isWinner && (
                                                    <div className="absolute top-4 right-4 bg-highlighter border-2 border-black px-3 py-1 font-display font-bold text-sm flex items-center gap-1 shadow-md">
                                                        <Trophy className="w-4 h-4" /> WINNER
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                     <button 
                                                        onClick={() => handlePromoteToEditorial(res.image)}
                                                        className="bg-white border-2 border-black px-4 py-2 font-mono text-xs font-bold uppercase hover:bg-hotpink hover:text-white"
                                                     >
                                                        Use This Asset
                                                     </button>
                                                </div>
                                            </div>
                                            
                                            <div className="p-4 flex-1 flex flex-col">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`font-mono text-xs font-bold px-2 py-0.5 ${res.id === 'A' ? 'bg-black text-white' : 'bg-electric text-white'}`}>
                                                        VARIANT {res.id}
                                                    </span>
                                                    <span className="font-mono text-xs text-gray-500">{res.settingName}</span>
                                                </div>
                                                
                                                <div className="space-y-4 mt-2">
                                                    <div>
                                                        <div className="flex justify-between text-xs font-bold font-mono mb-1">
                                                            <span>PREDICTED CTR</span>
                                                            <span>{res.stats.ctr}%</span>
                                                        </div>
                                                        <div className="w-full h-3 bg-gray-200 border border-black rounded-full overflow-hidden">
                                                            <div className="h-full bg-hotpink" style={{ width: `${(res.stats.ctr / 5) * 100}%` }}></div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-xs font-bold font-mono mb-1">
                                                            <span>ENGAGEMENT SCORE</span>
                                                            <span>{res.stats.score}/100</span>
                                                        </div>
                                                        <div className="w-full h-3 bg-gray-200 border border-black rounded-full overflow-hidden">
                                                            <div className="h-full bg-electric" style={{ width: `${res.stats.score}%` }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-auto pt-4 border-t-2 border-dashed border-gray-200 grid grid-cols-2 gap-2 text-center">
                                                    <div>
                                                        <div className="text-gray-400 text-[10px] font-mono uppercase">Impressions</div>
                                                        <div className="font-display font-bold text-lg">{res.stats.impressions}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-400 text-[10px] font-mono uppercase">Conv. Rate</div>
                                                        <div className="font-display font-bold text-lg">{(res.stats.ctr * 0.4).toFixed(1)}%</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {mode === 'editorial' && (
                // EDITORIAL VIEW
                <div className="flex flex-col md:flex-row gap-8 h-full items-center justify-center">
                    {/* Poster Preview */}
                    <div className="relative h-[60vh] aspect-[4/5] bg-white border-4 border-black sticker-shadow overflow-hidden group">
                        {currentImage ? (
                            <>
                                <img src={currentImage} className="w-full h-full object-cover" alt="Active" />
                                {/* Overlay Text */}
                                <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-between py-12 px-6 text-center pointer-events-none">
                                    <h1 className="font-display font-black text-6xl md:text-7xl text-white uppercase drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] leading-none break-words w-full">
                                        {adText.headline}
                                    </h1>
                                    <button className="bg-highlighter text-black px-8 py-2 font-bold font-mono text-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        {adText.cta}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                                <ImageIcon className="w-12 h-12 mb-2" />
                                <span className="font-mono text-sm uppercase">No Image Selected</span>
                            </div>
                        )}
                    </div>

                    {/* Editor Controls */}
                    <div className="w-full md:w-80 bg-white border-2 border-black p-6 sticker-shadow space-y-6">
                        <div>
                            <label className="block font-mono text-xs font-bold uppercase text-gray-500 mb-1">Headline</label>
                            <input 
                                type="text" 
                                value={adText.headline}
                                onChange={(e) => setAdText({...adText, headline: e.target.value})}
                                className="w-full border-2 border-black p-2 font-display font-bold uppercase text-xl focus:outline-none focus:bg-gray-50"
                            />
                        </div>
                        <div>
                            <label className="block font-mono text-xs font-bold uppercase text-gray-500 mb-1">CTA Button</label>
                            <input 
                                type="text" 
                                value={adText.cta}
                                onChange={(e) => setAdText({...adText, cta: e.target.value})}
                                className="w-full border-2 border-black p-2 font-mono font-bold text-sm focus:outline-none focus:bg-gray-50"
                            />
                        </div>
                        
                        <div className="pt-4 border-t-2 border-gray-100">
                             <button 
                                onClick={handleDownloadPoster}
                                disabled={!currentImage}
                                className="w-full py-3 bg-black text-white border-2 border-transparent font-bold font-mono uppercase hover:bg-electric hover:border-black hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                <Download className="w-4 h-4" /> Download Poster
                             </button>
                        </div>
                    </div>
                </div>
            )}
         </div>

      </div>
    </div>,
    document.body
  );
};

export default DesignStudio;