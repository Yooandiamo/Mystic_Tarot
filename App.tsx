import React, { useState, useEffect, useRef } from 'react';
import { 
  AppStep, Spread, DrawMode, Tone, DrawnCard, ReadingResult, UserSettings, TarotCard 
} from './types';
import { SPREADS, QUESTION_TEMPLATES, TONE_CONFIG, FULL_DECK } from './constants';
import { generateTarotReading } from './services/geminiService';
import Card from './components/Card';
import HistoryModal from './components/HistoryModal';

// --- Icons ---
const MagicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"></path></svg>
);
const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);
const HandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
);
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);

const App: React.FC = () => {
  // --- State ---
  const [step, setStep] = useState<AppStep>(AppStep.WELCOME);
  const [question, setQuestion] = useState('');
  const [selectedSpread, setSelectedSpread] = useState<Spread>(SPREADS[0]);
  const [drawMode, setDrawMode] = useState<DrawMode>(DrawMode.MANUAL); 
  const [deck, setDeck] = useState<TarotCard[]>([]);
  // Visual state for the deck (random jitter/radius)
  const [deckVisuals, setDeckVisuals] = useState<{offsetR: number, angleOffset: number}[]>([]);
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [reading, setReading] = useState<ReadingResult | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [history, setHistory] = useState<ReadingResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    tone: Tone.GENTLE,
    showMeanings: true
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Wheel Rotation State
  const [wheelRotation, setWheelRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const lastAngle = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Refs for scrolling
  const slotsContainerRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    const saved = localStorage.getItem('mystic_tarot_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll slots when a card is drawn
  useEffect(() => {
    if (step === AppStep.SHUFFLE_AND_DRAW && slotsContainerRef.current) {
        const slotWidth = isMobile ? 100 : 120;
        const scrollPos = drawnCards.length * slotWidth;
        slotsContainerRef.current.scrollTo({
            left: scrollPos,
            behavior: 'smooth'
        });
    }
  }, [drawnCards.length, step, isMobile]);

  const saveToHistory = (newReading: ReadingResult) => {
    const updated = [newReading, ...history];
    setHistory(updated);
    localStorage.setItem('mystic_tarot_history', JSON.stringify(updated));
  };

  // --- Handlers ---
  const handleStart = () => setStep(AppStep.QUESTION);

  const handleQuestionSubmit = () => {
    if (!question.trim()) return;
    setStep(AppStep.SPREAD_SELECT);
  };

  const handleSpreadSelect = (spread: Spread) => {
    setSelectedSpread(spread);
    // Shuffle Deck Logic
    const shuffled = [...FULL_DECK]
      .sort(() => Math.random() - 0.5)
      .map(card => ({ ...card }));
    
    // Generate random visuals for the staggered ring effect
    const visuals = shuffled.map(() => ({
      offsetR: Math.random() * 30 - 15, // +/- 15px radius variation
      angleOffset: Math.random() * 2 - 1 // +/- 1 deg angle variation
    }));

    setDeck(shuffled);
    setDeckVisuals(visuals);
    setDrawnCards([]);
    setRevealedCount(0);
    setWheelRotation(0);
    
    setStep(AppStep.SHUFFLE_AND_DRAW);
  };

  const drawCardAtIndex = (deckIndex: number) => {
    if (drawnCards.length >= selectedSpread.cardCount) return;

    const newCard = deck[deckIndex];
    // Remove from deck visually
    const newDeck = [...deck];
    newDeck.splice(deckIndex, 1);
    
    // Also remove visual state to keep sync
    const newVisuals = [...deckVisuals];
    newVisuals.splice(deckIndex, 1);

    setDeck(newDeck);
    setDeckVisuals(newVisuals);

    const drawnCard: DrawnCard = {
       ...newCard,
       isReversed: Math.random() > 0.8,
       positionIndex: drawnCards.length,
       positionName: selectedSpread.positions[drawnCards.length]
    };
    
    setDrawnCards(prev => [...prev, drawnCard]);

    if (drawnCards.length + 1 === selectedSpread.cardCount) {
       setTimeout(() => setStep(AppStep.REVEAL), 800);
    }
  };

  const handleAutoDraw = () => {
     let currentDeck = [...deck];
     let currentVisuals = [...deckVisuals];
     const selected: DrawnCard[] = [];
     
     // Only draw remaining needed cards
     const needed = selectedSpread.cardCount - drawnCards.length;
     
     for(let i=0; i<needed; i++) {
        if (currentDeck.length === 0) break;
        const randomIndex = Math.floor(Math.random() * currentDeck.length);
        const card = currentDeck[randomIndex];
        
        currentDeck.splice(randomIndex, 1);
        currentVisuals.splice(randomIndex, 1);
        
        selected.push({
           ...card,
           isReversed: Math.random() > 0.8,
           positionIndex: drawnCards.length + i,
           positionName: selectedSpread.positions[drawnCards.length + i] || `位置 ${drawnCards.length + i + 1}`
        });
     }
     
     setDeck(currentDeck);
     setDeckVisuals(currentVisuals);
     setDrawnCards(prev => [...prev, ...selected]);
     setTimeout(() => setStep(AppStep.REVEAL), 500);
  };

  const revealCard = (index: number) => {
    if (index === revealedCount) {
      setRevealedCount(prev => prev + 1);
    }
  };

  const handleRevealAll = () => {
    const total = drawnCards.length;
    let current = revealedCount;
    const revealNext = () => {
      if (current < total) {
        setRevealedCount(prev => prev + 1);
        current++;
        setTimeout(revealNext, 300);
      }
    };
    revealNext();
  };

  const generateAIReading = async () => {
    setLoadingAI(true);
    const result = await generateTarotReading(question, selectedSpread, drawnCards, settings.tone);
    
    const newReading: ReadingResult = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      question,
      spreadId: selectedSpread.id,
      cards: drawnCards,
      interpretation: result,
      tone: settings.tone
    };
    
    setReading(newReading);
    saveToHistory(newReading);
    setLoadingAI(false);
    setStep(AppStep.READING);
  };

  const resetApp = () => {
    setStep(AppStep.WELCOME);
    setQuestion('');
    setDrawnCards([]);
    setReading(null);
    setRevealedCount(0);
  };

  const goBack = () => {
     if (step === AppStep.QUESTION) setStep(AppStep.WELCOME);
     else if (step === AppStep.SPREAD_SELECT) setStep(AppStep.QUESTION);
     else if (step === AppStep.SHUFFLE_AND_DRAW) setStep(AppStep.SPREAD_SELECT);
  };

  // --- Wheel Interaction Handlers ---
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!wheelRef.current) return;
    isDragging.current = true;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    lastAngle.current = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    
    let delta = currentAngle - lastAngle.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    setWheelRotation(prev => prev + delta);
    lastAngle.current = currentAngle;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // --- Components ---

  const Header = () => (
    <div className="flex items-center justify-between p-4 z-20 sticky top-0 bg-[#0f0c29]/90 backdrop-blur-md border-b border-slate-800">
      <div className="flex items-center gap-2">
        {step !== AppStep.WELCOME && step !== AppStep.READING && (
          <button onClick={goBack} className="text-slate-400 hover:text-white mr-2">
            <ChevronLeftIcon />
          </button>
        )}
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
          <MagicIcon />
        </div>
        <span className="font-serif font-bold text-lg text-amber-100 tracking-wide">神秘塔罗</span>
      </div>
      <button 
        onClick={() => setShowHistory(true)}
        className="px-3 py-1 rounded-full border border-slate-700 text-xs text-slate-400 hover:text-white hover:border-amber-500 transition-colors"
      >
        历史
      </button>
    </div>
  );

  // --- Render Functions ---

  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center animate-fade-in relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-900/30 rounded-full blur-[100px] z-0"></div>
      <div className="relative z-10 space-y-8">
        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-300/20 to-indigo-500/20 flex items-center justify-center border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
           <MagicIcon />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl md:text-6xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-amber-500">
            神秘塔罗
          </h1>
          <p className="text-indigo-200/60 tracking-widest text-sm uppercase">AI 智能占卜</p>
        </div>
        <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
          向星辰提问，抽取你的命运卡牌，揭示未来的指引。
        </p>
        <button onClick={handleStart} className="group relative px-10 py-4 bg-transparent overflow-hidden rounded-full">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-amber-500 to-orange-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute inset-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
          <span className="relative text-white font-bold tracking-wider group-hover:scale-105 transition-transform inline-block">开始占卜</span>
        </button>
      </div>
    </div>
  );

  const renderQuestion = () => (
    <div className="w-full max-w-lg mx-auto space-y-6 animate-fade-in pt-10 px-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-serif text-amber-100">心中的疑惑</h2>
        <p className="text-slate-400 text-sm">请专注于你想知道的问题...</p>
      </div>
      <div className="bg-[#1a1638] border border-indigo-500/30 rounded-2xl p-4 shadow-xl shadow-indigo-900/20">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例如：我最近的运势如何？"
          className="w-full h-32 bg-transparent text-amber-50 placeholder-slate-600 focus:outline-none resize-none text-lg leading-relaxed text-center"
        />
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {QUESTION_TEMPLATES.slice(0, 3).map((q, i) => (
          <button key={i} onClick={() => setQuestion(q)} className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-full text-xs text-slate-400 hover:text-amber-300 hover:border-amber-500/50 transition-all">
            {q}
          </button>
        ))}
      </div>
      <div className="pt-8 flex justify-center">
        <button onClick={handleQuestionSubmit} disabled={!question.trim()} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]">
          下一步
        </button>
      </div>
    </div>
  );

  const renderSpreadSelect = () => (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 animate-fade-in">
       <div className="mb-12">
         <div className="text-center mb-6">
            <h2 className="text-2xl text-amber-100 font-serif mb-2">抽牌方式</h2>
            <p className="text-slate-400 text-sm">选择你与塔罗牌连接的方式</p>
         </div>
         <div className="flex flex-col sm:flex-row justify-center gap-6 max-w-2xl mx-auto">
            <button onClick={() => setDrawMode(DrawMode.MANUAL)} className={`flex-1 p-6 rounded-2xl border transition-all relative overflow-hidden group ${drawMode === DrawMode.MANUAL ? 'bg-[#251f47] border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)]' : 'bg-[#1a1638] border-slate-800 hover:border-slate-600 hover:bg-[#1f1a42]'}`}>
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors ${drawMode === DrawMode.MANUAL ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}><HandIcon /></div>
                <div className="text-left"><span className={`block font-bold text-lg mb-1 ${drawMode === DrawMode.MANUAL ? 'text-amber-100' : 'text-slate-300'}`}>沉浸仪式 (手动)</span><span className="text-xs text-slate-400">亲自洗牌与抽取，建立更深连接</span></div>
              </div>
            </button>
            <button onClick={() => setDrawMode(DrawMode.AUTO)} className={`flex-1 p-6 rounded-2xl border transition-all relative overflow-hidden group ${drawMode === DrawMode.AUTO ? 'bg-[#251f47] border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)]' : 'bg-[#1a1638] border-slate-800 hover:border-slate-600 hover:bg-[#1f1a42]'}`}>
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors ${drawMode === DrawMode.AUTO ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}><MagicIcon /></div>
                <div className="text-left"><span className={`block font-bold text-lg mb-1 ${drawMode === DrawMode.AUTO ? 'text-amber-100' : 'text-slate-300'}`}>快速指引 (自动)</span><span className="text-xs text-slate-400">交由宇宙指引，一键完成抽取</span></div>
              </div>
            </button>
         </div>
       </div>
       <div className="text-center mb-8 border-t border-slate-800/50 pt-10">
         <h2 className="text-2xl text-amber-100 font-serif mb-2">选择牌阵</h2>
         <p className="text-slate-400 text-sm">选择最适合你问题的解读方式</p>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SPREADS.map(spread => (
            <button key={spread.id} onClick={() => handleSpreadSelect(spread)} className={`relative group p-6 rounded-xl border transition-all text-left flex flex-col h-full ${selectedSpread.id === spread.id ? 'bg-[#251f47] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#1a1638] border-slate-800 hover:border-slate-600'}`}>
               <div className="mb-4 w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-amber-500 font-serif font-bold text-lg border border-slate-700">{spread.cardCount}</div>
               <h3 className="text-lg font-serif text-amber-100 mb-2 group-hover:text-amber-400 transition-colors">{spread.name}</h3>
               <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-1">{spread.description}</p>
            </button>
          ))}
       </div>
    </div>
  );

  const renderShuffleAndDraw = () => {
    // === ROTATABLE RING LAYOUT (Staggered Circle) ===
    // Config
    const cardWidth = 40; 
    const cardHeight = 64; 
    // Radius should be large enough to hold cards but fit screen reasonably.
    // Use dynamic sizing based on viewport.
    const ringRadius = isMobile ? window.innerWidth * 0.45 : 280; 
    
    // Center of the wheel in the container
    const centerX = '50%';
    const centerY = '50%';
    
    const totalCards = deck.length;
    // Distribute remaining cards in a full 360 circle
    const angleStep = 360 / (totalCards || 1); 

    return (
      <div className="h-[calc(100vh-80px)] w-full flex flex-col relative overflow-hidden touch-none select-none">
        
        {/* 1. Slot Stream (Top) - High Z-index to sit above the ring */}
        <div className="flex-none px-6 py-4 z-20 pointer-events-none">
             <div className="text-center mb-2">
                <h3 className="text-xl text-amber-100 font-serif mb-1">
                    {drawnCards.length < selectedSpread.cardCount ? '请抽牌' : '抽取完成'}
                </h3>
                <p className="text-slate-400 text-sm">
                    {drawnCards.length} / {selectedSpread.cardCount} 已选择
                </p>
            </div>
            <div 
                ref={slotsContainerRef}
                className="w-full overflow-x-auto flex gap-3 snap-x scrollbar-hide pointer-events-auto pb-2"
            >
                {Array.from({length: selectedSpread.cardCount}).map((_, i) => {
                    const isCurrentTarget = i === drawnCards.length;
                    const hasCard = drawnCards[i];
                    return (
                        <div key={i} className="snap-center flex flex-col items-center gap-2 flex-shrink-0">
                            <div className={`w-16 h-24 rounded-lg border-2 flex items-center justify-center transition-all duration-300 relative overflow-hidden
                                ${hasCard ? 'border-amber-500 bg-amber-500/20' : isCurrentTarget ? 'border-amber-500/50 border-dashed bg-slate-800/50 scale-105' : 'border-slate-800 border-dashed bg-slate-900/30 opacity-50'}`}>
                                {hasCard ? (
                                    <>
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
                                        <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold text-[10px] z-10">{i + 1}</div>
                                    </>
                                ) : (
                                    <span className={`text-xs font-bold ${isCurrentTarget ? 'text-amber-500' : 'text-slate-600'}`}>{i + 1}</span>
                                )}
                            </div>
                            <span className="text-[9px] uppercase tracking-wider text-center max-w-[60px] truncate text-slate-500">
                                {selectedSpread.positions[i]?.split('/')[0]}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* 2. The Rotatable Ring (Center) */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            {/* Background Hint */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <div className="w-[300px] h-[300px] md:w-[600px] md:h-[600px] rounded-full border border-slate-800/50 opacity-50"></div>
                <div className="absolute w-[200px] h-[200px] md:w-[400px] md:h-[400px] rounded-full border border-slate-800/30 opacity-30"></div>
            </div>

            {/* Interaction Area */}
            <div 
                ref={wheelRef}
                className="absolute inset-0 cursor-grab active:cursor-grabbing z-10 touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                {/* The Rotating Container */}
                <div 
                    className="absolute top-1/2 left-1/2 w-0 h-0"
                    style={{ transform: `rotate(${wheelRotation}deg)` }}
                >
                    {deck.map((card, i) => {
                        const visual = deckVisuals[i] || { offsetR: 0, angleOffset: 0 };
                        const angle = i * angleStep + visual.angleOffset;
                        const r = ringRadius + visual.offsetR;
                        
                        return (
                            <div 
                                key={card.id}
                                className="absolute top-0 left-0 origin-center cursor-pointer hover:z-50"
                                style={{
                                    width: `${cardWidth}px`,
                                    height: `${cardHeight}px`,
                                    // Rotate to angle, then translate OUTWARD by radius
                                    // rotate(90deg) to make card "standing" relative to center if needed, 
                                    // but standard is usually top-pointing-out or top-pointing-up.
                                    // Let's make tops point OUTWARD: rotate(angle) translate(0, -radius)
                                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${r}px)`,
                                    zIndex: 10 // Base z-index
                                }}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent drag start if clicking card?
                                    // Actually we want click to work, but drag to work too. 
                                    // React handles click if pointer doesn't move much.
                                    drawCardAtIndex(i);
                                }}
                            >
                                <div className="w-full h-full rounded bg-slate-800 border border-amber-900/40 shadow-sm overflow-hidden relative group transition-transform hover:-translate-y-4">
                                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40"></div>
                                     <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-black"></div>
                                     {/* Simple Back Design */}
                                     <div className="absolute inset-[2px] border border-amber-500/20 rounded-sm opacity-50"></div>
                                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-600/50 shadow-[0_0_5px_rgba(245,158,11,0.5)]"></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Auto Draw Button in Center if Auto Mode */}
            {drawMode === DrawMode.AUTO && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
                    <button 
                        onClick={handleAutoDraw}
                        className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/50 backdrop-blur-sm flex flex-col items-center justify-center gap-1 hover:bg-amber-500/20 transition-all animate-pulse"
                    >
                        <MagicIcon />
                        <span className="text-amber-200 text-xs font-bold">一键抽取</span>
                    </button>
                </div>
            )}
            
            {/* Help Text */}
            {drawMode === DrawMode.MANUAL && (
                 <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                     <span className="bg-black/50 px-3 py-1 rounded-full text-[10px] text-slate-400 border border-slate-800 backdrop-blur-sm">
                         {isMobile ? '拖动圆环旋转 · 点击抽牌' : '拖动旋转 · 点击抽牌'}
                     </span>
                 </div>
            )}
        </div>
      </div>
    );
  };

  const renderReveal = () => (
    <div className="w-full h-full flex flex-col items-center justify-center animate-fade-in pt-10 pb-20 px-4">
      <div className="text-center mb-6 space-y-2">
        <h2 className="text-3xl text-amber-100 font-serif">牌面揭晓</h2>
        <p className="text-slate-400">点击每一张牌，揭示它们的含义</p>
      </div>

      {revealedCount < drawnCards.length && (
         <div className="flex justify-center mb-8">
            <button onClick={handleRevealAll} className="flex items-center gap-2 px-5 py-2 rounded-full bg-slate-800 border border-slate-700 text-amber-500 hover:bg-slate-700 hover:border-amber-500/50 transition-all text-sm font-bold uppercase tracking-wide">
               <EyeIcon /> <span>一键翻牌</span>
            </button>
         </div>
      )}

      <div className="flex flex-wrap justify-center gap-6 md:gap-10">
        {drawnCards.map((card, index) => (
          <div key={card.id} className="flex flex-col items-center gap-4">
            <div className={`transition-all duration-700 ${index <= revealedCount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
               <span className="text-xs text-amber-500 uppercase tracking-widest font-bold mb-2 block text-center">{card.positionName.split('/')[0]}</span>
            </div>
            <Card card={card} isRevealed={index < revealedCount} onClick={() => revealCard(index)} size="md" className={`transition-all duration-500 ${index === revealedCount ? 'ring-4 ring-amber-500/30 scale-110 z-10' : 'scale-100 opacity-90'}`} />
          </div>
        ))}
      </div>

      {revealedCount === drawnCards.length && (
        <div className="fixed bottom-10 left-0 right-0 flex justify-center z-50 animate-bounce-in">
          <button onClick={generateAIReading} disabled={loadingAI} className="group relative px-12 py-4 bg-[#0f0c29] border border-amber-500/50 rounded-full overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            <div className="absolute inset-0 w-full h-full bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors"></div>
            <div className="relative flex items-center gap-3 text-amber-100 font-bold tracking-wider">
               {loadingAI ? (<><div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div><span>正在解读命运...</span></>) : (<><MagicIcon /><span>开始解读</span></>)}
            </div>
          </button>
        </div>
      )}
    </div>
  );

  const renderReading = () => {
    if (!reading || !reading.interpretation) return <div>Error</div>;
    const { summary, cardAnalysis, advice } = reading.interpretation;
    const safeCardAnalysis = Array.isArray(cardAnalysis) ? cardAnalysis : [];

    return (
      <div className="w-full max-w-2xl mx-auto pb-20 animate-fade-in relative">
        <div className="bg-[#15122e] border-b border-slate-800 p-6 sticky top-0 z-30 shadow-2xl">
           <h3 className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-4 text-center">牌阵概览</h3>
           <div className="flex justify-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {reading.cards.map((card, idx) => (
                 <div key={idx} className="flex flex-col items-center min-w-[60px]">
                    <Card card={card} isRevealed={true} size="xs" showLabel={false} className="mb-2 shadow-lg" />
                    <span className="text-[10px] text-slate-400 text-center leading-tight w-full truncate px-1">{card.positionName.split('/')[0]}</span>
                 </div>
              ))}
           </div>
        </div>

        <div className="p-6 space-y-6">
           <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><MoonIcon /></div>
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">你的问题</p>
              <h2 className="text-lg text-white font-serif italic leading-relaxed">"{reading.question}"</h2>
           </div>
           <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                 <div className="w-1 h-4 bg-amber-400 rounded-full"></div>
                 <h3 className="font-bold text-sm uppercase tracking-wide">先说重点</h3>
              </div>
              <div className="bg-[#1e1b4b]/60 border border-indigo-500/30 rounded-xl p-5 text-indigo-100 leading-relaxed shadow-lg backdrop-blur-sm">{summary}</div>
           </div>
           <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400 mt-8">
                 <div className="w-1 h-4 bg-amber-400 rounded-full"></div>
                 <h3 className="font-bold text-sm uppercase tracking-wide">牌面解析</h3>
              </div>
              {reading.cards.map((card, idx) => {
                 const analysis = safeCardAnalysis[idx];
                 return (
                    <div key={idx} className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
                       <div className="bg-slate-800/50 px-4 py-3 flex items-center justify-between border-b border-slate-800">
                          <div className="flex items-center gap-3">
                             <span className="w-5 h-5 rounded-full bg-slate-700 text-[10px] flex items-center justify-center text-slate-300 font-bold">{idx + 1}</span>
                             <span className="text-amber-200 font-serif text-sm">{card.name}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${card.isReversed ? 'border-red-900/50 text-red-400 bg-red-900/10' : 'border-green-900/50 text-green-400 bg-green-900/10'}`}>{card.isReversed ? '逆位 (Reversed)' : '正位 (Upright)'}</span>
                       </div>
                       <div className="p-4">
                          <p className="text-slate-300 text-sm leading-relaxed">{analysis ? analysis.meaning : "暂无详细解析。"}</p>
                       </div>
                    </div>
                 );
              })}
           </div>
           <div className="mt-8 bg-gradient-to-br from-amber-900/20 to-purple-900/20 border border-amber-500/20 rounded-2xl p-6 text-center">
              <h3 className="text-amber-400 font-serif mb-3 text-lg">指引与建议</h3>
              <p className="text-amber-100/80 leading-relaxed italic">{advice}</p>
           </div>
           <div className="h-10"></div>
           <button onClick={resetApp} className="w-full py-3 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-sm uppercase tracking-widest">开始新的占卜</button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-amber-500/30 relative bg-[#0f0c29]">
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none z-0"></div>
      {step !== AppStep.WELCOME && <Header />}
      <main className="relative z-10 w-full mx-auto">
        {step === AppStep.WELCOME && renderWelcome()}
        {step === AppStep.QUESTION && renderQuestion()}
        {step === AppStep.SPREAD_SELECT && renderSpreadSelect()}
        {step === AppStep.SHUFFLE_AND_DRAW && renderShuffleAndDraw()}
        {step === AppStep.REVEAL && renderReveal()}
        {step === AppStep.READING && renderReading()}
      </main>
      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} history={history} onSelect={(oldReading) => {
          setReading(oldReading);
          setQuestion(oldReading.question);
          setSelectedSpread(SPREADS.find(s => s.id === oldReading.spreadId) || SPREADS[0]);
          setDrawnCards(oldReading.cards);
          setRevealedCount(oldReading.cards.length);
          setStep(AppStep.READING);
          setShowHistory(false);
        }}
      />
    </div>
  );
};

export default App;