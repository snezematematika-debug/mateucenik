/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  ChevronRight, 
  Gamepad2, 
  Trophy, 
  ArrowLeft, 
  Brain, 
  Puzzle, 
  Grid,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Lock
} from 'lucide-react';
import { CURRICULUM, Grade, Topic } from './constants';
import { generateMathProblems, MathProblem } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type GameType = 'flashcards' | 'bingo' | 'escape';

export default function App() {
  const [step, setStep] = useState<'grade' | 'topic' | 'content' | 'game-selection' | 'playing'>('grade');
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [problems, setProblems] = useState<MathProblem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string | null>(() => localStorage.getItem('gemini_api_key'));
  const [tempApiKey, setTempApiKey] = useState(userApiKey || '');
  
  // Scoring system
  const [totalScore, setTotalScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [recentPoints, setRecentPoints] = useState<{ id: number, amount: number }[]>([]);
  const userLevel = Math.floor(xp / 100) + 1;

  const addPoints = (points: number) => {
    setTotalScore(prev => prev + points);
    setXp(prev => prev + points);
    
    const id = Date.now();
    setRecentPoints(prev => [...prev, { id, amount: points }]);
    setTimeout(() => {
      setRecentPoints(prev => prev.filter(p => p.id !== id));
    }, 2000);
  };

  const reset = () => {
    setStep('grade');
    setSelectedGrade(null);
    setSelectedTopic(null);
    setSelectedContent(null);
    setSelectedGame(null);
    setProblems([]);
  };

  const handleGradeSelect = (grade: Grade) => {
    setSelectedGrade(grade);
    setStep('topic');
  };

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    setStep('content');
  };

  const handleContentSelect = (content: string) => {
    setSelectedContent(content);
    setStep('game-selection');
  };

  const handleGameSelect = async (game: GameType) => {
    setSelectedGame(game);
    setLoading(true);
    setStep('playing');
    
    try {
      if (selectedGrade && selectedTopic && selectedContent) {
        const count = game === 'bingo' ? 9 : 5;
        const generated = await generateMathProblems(
          selectedGrade.label, 
          selectedTopic.title, 
          selectedContent, 
          count,
          userApiKey
        );
        setProblems(generated);
      }
    } catch (error) {
      console.error("Error generating problems:", error);
      alert("Настана грешка при генерирање на задачите. Проверете го вашиот API клуч.");
      setStep('game-selection');
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = () => {
    if (tempApiKey.trim()) {
      localStorage.setItem('gemini_api_key', tempApiKey.trim());
      setUserApiKey(tempApiKey.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
      setUserApiKey(null);
    }
    setShowSettings(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Brain size={24} />
            </div>
            <h1 className="text-xl font-display font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Мате ученик
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="Поставки"
            >
              <Grid size={20} />
            </button>

            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                <Trophy size={16} />
                <span className="text-sm">{totalScore}</span>
              </div>
              <div className="w-px h-4 bg-slate-300" />
              <div className="flex items-center gap-1.5 text-indigo-600 font-bold">
                <Sparkles size={16} />
                <span className="text-sm">Ниво {userLevel}</span>
              </div>
            </div>
            
            {step !== 'grade' && (
              <button 
                onClick={() => {
                  if (step === 'playing') setStep('game-selection');
                  else if (step === 'game-selection') setStep('content');
                  else if (step === 'content') setStep('topic');
                  else if (step === 'topic') setStep('grade');
                }}
                className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft size={16} /> Назад
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl relative">
        {/* Floating Points Notifications */}
        <div className="fixed bottom-8 right-8 z-[100] pointer-events-none flex flex-col gap-2 items-end">
          <AnimatePresence>
            {recentPoints.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, y: -20 }}
                className="bg-emerald-500 text-white px-4 py-2 rounded-2xl shadow-lg font-bold flex items-center gap-2"
              >
                <Trophy size={16} /> +{p.amount} поени!
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {step === 'grade' && (
            <motion.div
              key="grade-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-display font-bold text-slate-900">
                  Добредојде, млади математичару! 👋
                </h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Избери го твоето одделение за да започнеме со вежбање.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-8">
                {CURRICULUM.map((grade) => (
                  <motion.button
                    key={grade.id}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleGradeSelect(grade)}
                    className="group relative h-48 bg-white rounded-3xl border-2 border-slate-200 p-8 flex flex-col items-center justify-center gap-4 transition-all hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-100/50 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-inner">
                      <BookOpen size={32} />
                    </div>
                    <span className="text-2xl font-display font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                      {grade.label}
                    </span>
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <ChevronRight className="text-indigo-600" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'topic' && selectedGrade && (
            <motion.div
              key="topic-selection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold shadow-sm border border-indigo-200">
                  {selectedGrade.label}
                </div>
                <h2 className="text-3xl font-display font-bold text-slate-900">Избери тема</h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {selectedGrade.topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicSelect(topic)}
                    className="group flex items-center justify-between p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-indigo-500 hover:shadow-xl transition-all text-left relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shadow-sm">
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{topic.title}</h3>
                        <p className="text-sm text-slate-500 font-medium">{topic.contents.length} содржини</p>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'content' && selectedTopic && (
            <motion.div
              key="content-selection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold shadow-sm border border-indigo-200">
                  {selectedTopic.title}
                </div>
                <h2 className="text-3xl font-display font-bold text-slate-900">Избери содржина</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedTopic.contents.map((content, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleContentSelect(content)}
                    className="p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1 transition-all text-left font-bold text-slate-700 hover:text-indigo-600 shadow-sm"
                  >
                    {content}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'game-selection' && selectedContent && (
            <motion.div
              key="game-selection"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-12 text-center"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-display font-bold">Избери игра за вежбање</h2>
                <p className="text-slate-600">Вежбаме: <span className="font-bold text-indigo-600">{selectedContent}</span></p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GameCard 
                  title="Флеш картички" 
                  description="Брзо вежбање со картички кои се превртуваат."
                  icon={<RotateCcw size={32} />}
                  color="bg-orange-500"
                  onClick={() => handleGameSelect('flashcards')}
                />
                <GameCard 
                  title="Математичко Бинго" 
                  description="Пополни ја мрежата со точни одговори."
                  icon={<Grid size={32} />}
                  color="bg-emerald-500"
                  onClick={() => handleGameSelect('bingo')}
                />
                <GameCard 
                  title="Escape Room" 
                  description="Реши ги сите загатки за да излезеш!"
                  icon={<Puzzle size={32} />}
                  color="bg-indigo-500"
                  onClick={() => handleGameSelect('escape')}
                />
              </div>
            </motion.div>
          )}

          {step === 'playing' && (
            <div className="space-y-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-600 font-medium">Гемини подготвува задачи за тебе...</p>
                </div>
              ) : (
                <GameEngine 
                  type={selectedGame!} 
                  problems={problems} 
                  onComplete={() => setStep('game-selection')}
                  onScoreUpdate={addPoints}
                />
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
              <h2 className="text-2xl font-bold mb-2">Поставки</h2>
              <p className="text-slate-500 text-sm mb-6">
                Внесете свој Gemini API клуч за да ја користите апликацијата без ограничувања.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Gemini API Key
                  </label>
                  <input 
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Внесете го вашиот клуч тука..."
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:outline-none transition-all font-mono text-sm"
                  />
                </div>

                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    <strong>Како да добиете клуч?</strong> <br />
                    Одете на <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="underline font-bold">Google AI Studio</a>, креирајте бесплатен клуч и залепете го тука. Клучот се чува само во вашиот прелистувач.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Откажи
                  </button>
                  <button 
                    onClick={saveApiKey}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                  >
                    Зачувај
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GameCard({ title, description, icon, color, onClick }: { title: string, description: string, icon: React.ReactNode, color: string, onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -12, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group flex flex-col items-center p-8 bg-white rounded-[2rem] border-2 border-slate-200 shadow-lg hover:shadow-2xl hover:border-indigo-400 transition-all duration-300 text-center gap-4 relative overflow-hidden"
    >
      <div className={cn("absolute top-0 left-0 w-full h-2", color)} />
      <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-xl transform group-hover:rotate-6 transition-transform duration-300", color)}>
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed font-medium">{description}</p>
      </div>
      <div className="mt-2 px-4 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
        Започни игра
      </div>
    </motion.button>
  );
}

function GameEngine({ type, problems, onComplete, onScoreUpdate }: { type: GameType, problems: MathProblem[], onComplete: () => void, onScoreUpdate: (p: number) => void }) {
  if (type === 'flashcards') return <FlashcardsGame problems={problems} onComplete={onComplete} onScoreUpdate={onScoreUpdate} />;
  if (type === 'bingo') return <BingoGame problems={problems} onComplete={onComplete} onScoreUpdate={onScoreUpdate} />;
  if (type === 'escape') return <EscapeRoomGame problems={problems} onComplete={onComplete} onScoreUpdate={onScoreUpdate} />;
  return null;
}

function FlashcardsGame({ problems, onComplete, onScoreUpdate }: { problems: MathProblem[], onComplete: () => void, onScoreUpdate: (p: number) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isWrong, setIsWrong] = useState(false);

  const currentProblem = problems[currentIndex];

  const handleOptionClick = (option: string) => {
    if (isFlipped) return;
    
    setSelectedOption(option);
    
    if (option === currentProblem.answer) {
      setIsFlipped(true);
      setIsWrong(false);
      setShowHint(false);
      // Award points based on attempts
      const points = attempts === 0 ? 5 : (attempts === 1 ? 2 : 0);
      if (points > 0) onScoreUpdate(points);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setIsWrong(true);
      
      if (newAttempts === 1) {
        setShowHint(true);
      }
      
      // Reset wrong state after animation
      setTimeout(() => setIsWrong(false), 500);
    }
  };

  const handleNext = () => {
    if (currentIndex < problems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setAttempts(0);
      setSelectedOption(null);
      setShowHint(false);
      setIsWrong(false);
    } else {
      setShowResult(true);
    }
  };

  const handleShowAnswer = () => {
    setIsFlipped(true);
    setShowHint(false);
  };

  if (showResult) {
    return (
      <div className="text-center space-y-8 py-12">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <Trophy size={48} />
        </div>
        <h2 className="text-3xl font-bold">Одлична работа!</h2>
        <p className="text-slate-600">Ги помина сите картички.</p>
        <button onClick={onComplete} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
          Избери друга игра
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="flex justify-between items-center text-sm font-bold text-slate-400">
        <span>КАРТИЧКА {currentIndex + 1} ОД {problems.length}</span>
        {attempts > 0 && <span className="text-orange-500">ОБИД {attempts}/2</span>}
      </div>

      <div className="relative h-[32rem] w-full perspective-1000">
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
          className="relative w-full h-full transform-style-3d"
        >
          {/* Front */}
          <div 
            className={cn(
              "absolute inset-0 backface-hidden bg-white rounded-[2.5rem] border-4 shadow-2xl flex flex-col p-8 text-center overflow-hidden transition-colors duration-300",
              isWrong ? "border-red-400 bg-red-50" : "border-slate-200"
            )}
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="absolute top-0 left-0 w-full h-3 bg-indigo-500" />
            
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Задача</p>
              <h3 className="text-2xl font-display font-bold text-slate-800 leading-tight mb-8">
                {currentProblem?.question}
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {currentProblem?.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(option)}
                    disabled={isFlipped}
                    className={cn(
                      "py-3 px-4 rounded-2xl border-2 font-bold transition-all text-left flex items-center gap-3",
                      selectedOption === option 
                        ? (option === currentProblem.answer ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-red-50 border-red-500 text-red-700")
                        : "bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-inherit flex items-center justify-center shrink-0 text-sm">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {showHint && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-xs flex items-center gap-2"
              >
                <Brain size={16} className="shrink-0" />
                <span><strong>Помош:</strong> Размисли уште еднаш! Провери ги пресметките.</span>
              </motion.div>
            )}

            {attempts >= 2 && !isFlipped && (
              <button 
                onClick={handleShowAnswer}
                className="mt-4 text-indigo-600 font-bold text-sm hover:underline flex items-center justify-center gap-1"
              >
                <RotateCcw size={14} /> Види го одговорот
              </button>
            )}
          </div>

          {/* Back */}
          <div 
            className="absolute inset-0 backface-hidden bg-indigo-600 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center p-8 text-center text-white rotate-y-180 border-4 border-indigo-400 overflow-hidden"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="absolute top-0 left-0 w-full h-4 bg-white/20" />
            <p className="text-indigo-200 text-xs font-black uppercase tracking-[0.2em] mb-6">Точен одговор</p>
            <h3 className="text-4xl md:text-5xl font-display font-bold mb-6 px-4">{currentProblem?.answer}</h3>
            {currentProblem?.explanation && (
              <div className="max-w-xs p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                <p className="text-indigo-50 text-sm leading-relaxed">{currentProblem.explanation}</p>
              </div>
            )}
            
            <button 
              onClick={handleNext}
              className="mt-8 px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2"
            >
              Следна картичка <ChevronRight size={20} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function BingoGame({ problems, onComplete, onScoreUpdate }: { problems: MathProblem[], onComplete: () => void, onScoreUpdate: (p: number) => void }) {
  const [grid, setGrid] = useState<{ problem: MathProblem, solved: boolean }[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    if (problems.length > 0) {
      setGrid(problems.slice(0, 9).map(p => ({ problem: p, solved: false })));
    }
  }, [problems]);

  const handleCheck = () => {
    if (selectedIdx === null) return;
    
    const current = grid[selectedIdx];
    if (answer.trim().toLowerCase() === current.problem.answer.trim().toLowerCase()) {
      setFeedback('correct');
      onScoreUpdate(10);
      const newGrid = [...grid];
      newGrid[selectedIdx].solved = true;
      setGrid(newGrid);
      setTimeout(() => {
        setFeedback(null);
        setSelectedIdx(null);
        setAnswer('');
      }, 1500);
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const isBingo = grid.length > 0 && grid.every(cell => cell.solved);

  if (isBingo) {
    return (
      <div className="text-center space-y-8 py-12">
        <div className="w-24 h-24 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto">
          <Sparkles size={48} />
        </div>
        <h2 className="text-3xl font-bold">БИНГО! 🎉</h2>
        <p className="text-slate-600">Ја пополни целата мрежа.</p>
        <button onClick={onComplete} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
          Избери друга игра
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold">Математичко Бинго</h3>
        <p className="text-slate-500">Реши ги задачите за да ги пополниш полињата.</p>
        <div className="inline-block px-4 py-2 bg-indigo-50 rounded-lg text-xs text-indigo-700 border border-indigo-100 mt-2">
          <strong>Упатство:</strong> Внесувај ги само бројните вредности. Користи точка (.) за децимални броеви.
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {grid.map((cell, idx) => (
          <button
            key={idx}
            disabled={cell.solved}
            onClick={() => setSelectedIdx(idx)}
            className={cn(
              "aspect-square rounded-[1.5rem] border-4 flex items-center justify-center p-4 text-center transition-all duration-300",
              cell.solved 
                ? "bg-emerald-500 border-emerald-400 text-white shadow-xl shadow-emerald-200 scale-95" 
                : selectedIdx === idx 
                  ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-inner scale-105" 
                  : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg shadow-sm"
            )}
          >
            {cell.solved ? <CheckCircle2 size={40} /> : <span className="text-lg font-black text-slate-400">{idx + 1}</span>}
          </button>
        ))}
      </div>

      {selectedIdx !== null && !grid[selectedIdx].solved && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-10 bg-white rounded-[2.5rem] border-4 border-indigo-100 shadow-2xl space-y-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50" />
          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                {selectedIdx + 1}
              </div>
              <p className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em]">Задача</p>
            </div>
            <h4 className="text-3xl font-display font-bold text-slate-800 leading-tight">{grid[selectedIdx].problem.question}</h4>
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Внеси одговор..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button 
              onClick={handleCheck}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Провери
            </button>
          </div>

          <AnimatePresence>
            {feedback === 'correct' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle2 size={20} /> Точно!
              </motion.div>
            )}
            {feedback === 'wrong' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-rose-600 font-bold">
                <XCircle size={20} /> Обиди се повторно.
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function EscapeRoomGame({ problems, onComplete, onScoreUpdate }: { problems: MathProblem[], onComplete: () => void, onScoreUpdate: (p: number) => void }) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const currentProblem = problems[currentLevel];

  const handleCheck = () => {
    if (answer.trim().toLowerCase() === currentProblem.answer.trim().toLowerCase()) {
      setFeedback('correct');
      onScoreUpdate(20);
      setTimeout(() => {
        if (currentLevel < problems.length - 1) {
          setCurrentLevel(currentLevel + 1);
          setAnswer('');
          setFeedback(null);
        } else {
          setIsUnlocked(true);
        }
      }, 1000);
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  if (isUnlocked) {
    return (
      <div className="text-center space-y-8 py-12">
        <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
          <Gamepad2 size={48} />
        </div>
        <h2 className="text-3xl font-bold">СЛОБОДА! 🔓</h2>
        <p className="text-slate-600">Успешно ги реши сите загатки и излезе од собата.</p>
        <button onClick={onComplete} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
          Избери друга игра
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold">Escape Room</h3>
          <p className="text-slate-500">Ниво {currentLevel + 1} од {problems.length}</p>
        </div>
        <div className="flex gap-2">
          {problems.map((_, idx) => (
            <div 
              key={idx} 
              className={cn(
                "w-3 h-3 rounded-full",
                idx < currentLevel ? "bg-emerald-500" : idx === currentLevel ? "bg-indigo-500 animate-pulse" : "bg-slate-200"
              )}
            />
          ))}
        </div>
      </div>

      <div className="p-10 bg-slate-950 text-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-slate-800 space-y-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5">
          <Puzzle size={160} />
        </div>
        
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
        
        <div className="space-y-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-indigo-500/20 rounded-md border border-indigo-500/30 text-indigo-400 font-mono text-xs tracking-[0.3em] uppercase">
              Ниво {currentLevel + 1}
            </div>
            <div className="h-px flex-1 bg-slate-800" />
          </div>
          <h4 className="text-4xl font-display font-bold leading-tight tracking-tight text-slate-100">{currentProblem?.question}</h4>
        </div>

        <div className="space-y-6 relative z-10">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Внеси го кодот..."
                className="w-full px-6 py-5 bg-slate-900/50 border-2 border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-mono text-2xl text-indigo-400 placeholder:text-slate-700 transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700">
                <Lock size={20} />
              </div>
            </div>
            <button 
              onClick={handleCheck}
              className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black text-lg transition-all shadow-lg shadow-indigo-900/20 active:scale-95 flex items-center gap-2"
            >
              ОТКЛУЧИ <ChevronRight size={24} />
            </button>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 rounded-lg border border-slate-800/50 w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
              Внеси само бројна вредност. Точка (.) за децимали.
            </p>
          </div>

          <AnimatePresence>
            {feedback === 'correct' && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-emerald-400 font-bold flex items-center gap-2">
                <CheckCircle2 size={20} /> Кодот е точен! Се отвора следната врата...
              </motion.div>
            )}
            {feedback === 'wrong' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="text-rose-400 font-bold flex items-center gap-2">
                <XCircle size={20} /> Погрешен код. Системот е заклучен.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
