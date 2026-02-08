import React from 'react';
import { ReadingResult, Tone } from '../types';
import { SPREADS, TONE_CONFIG } from '../constants';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ReadingResult[];
  onSelect: (reading: ReadingResult) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-2xl text-amber-400 font-serif">命运回响 (历史记录)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.length === 0 ? (
            <div className="text-center text-slate-500 py-10 italic">暂无历史记录</div>
          ) : (
            history.map((reading) => (
              <div 
                key={reading.id} 
                className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 hover:border-amber-500/50 cursor-pointer transition-all"
                onClick={() => {
                  onSelect(reading);
                  onClose();
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-slate-400">{new Date(reading.timestamp).toLocaleString('zh-CN')}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-slate-700 ${TONE_CONFIG[reading.tone].color}`}>
                    {TONE_CONFIG[reading.tone].label}
                  </span>
                </div>
                <h3 className="text-lg text-white font-medium mb-1 line-clamp-1">{reading.question}</h3>
                <p className="text-sm text-slate-400">
                  {SPREADS.find(s => s.id === reading.spreadId)?.name} · {reading.cards.length} 张牌
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;