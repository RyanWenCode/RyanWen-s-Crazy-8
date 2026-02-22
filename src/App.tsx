/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Card as CardType, GameState, Suit, GameStatus } from './types';
import { createDeck, isValidMove, shuffle } from './utils/deck';
import { Card } from './components/Card';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Trophy, AlertCircle, ChevronRight, Heart, Diamond, Club, Spade } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<GameState>({
    playerHand: [],
    aiHand: [],
    drawPile: [],
    discardPile: [],
    currentTurn: 'player',
    status: 'waiting',
    wildSuit: null,
    lastAction: 'Welcome to Ryan\'s Crazy 8s!',
  });

  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [pendingCard, setPendingCard] = useState<CardType | null>(null);
  const [canPass, setCanPass] = useState(false);

  const topCard = state.discardPile[state.discardPile.length - 1];
  const playableCards = state.playerHand.filter(c => isValidMove(c, topCard, state.wildSuit));

  const initGame = () => {
    const deck = createDeck();
    const playerHand = deck.splice(0, 8);
    const aiHand = deck.splice(0, 8);
    
    // Ensure the first discard is not an 8
    let discardIndex = 0;
    while (deck[discardIndex].rank === '8') {
      discardIndex++;
    }
    const discardPile = [deck.splice(discardIndex, 1)[0]];
    const drawPile = deck;

    setState({
      playerHand,
      aiHand,
      drawPile,
      discardPile,
      currentTurn: 'player',
      status: 'playing',
      wildSuit: null,
      lastAction: 'Game started! Your turn.',
    });
    setCanPass(false);
  };

  const checkWin = (hand: CardType[], turn: 'player' | 'ai') => {
    if (hand.length === 0) {
      setState(prev => ({
        ...prev,
        status: turn === 'player' ? 'won' : 'lost',
        lastAction: turn === 'player' ? 'You won!' : 'AI won!',
      }));
      return true;
    }
    return false;
  };

  const handlePlayCard = (card: CardType) => {
    if (state.currentTurn !== 'player' || state.status !== 'playing') return;

    const topCard = state.discardPile[state.discardPile.length - 1];
    if (!isValidMove(card, topCard, state.wildSuit)) {
      setState(prev => ({ ...prev, lastAction: 'Invalid move! Match suit or rank.' }));
      return;
    }

    if (card.rank === '8') {
      setPendingCard(card);
      setShowSuitPicker(true);
      return;
    }

    executeMove(card, 'player');
    setCanPass(false);
  };

  const executeMove = (card: CardType, turn: 'player' | 'ai', newWildSuit: Suit | null = null) => {
    setState(prev => {
      const handKey = turn === 'player' ? 'playerHand' : 'aiHand';
      const newHand = prev[handKey].filter(c => c.id !== card.id);
      const newDiscardPile = [...prev.discardPile, card];
      const nextTurn = turn === 'player' ? 'ai' : 'player';

      if (newHand.length === 0) {
        return {
          ...prev,
          [handKey]: newHand,
          discardPile: newDiscardPile,
          status: turn === 'player' ? 'won' : 'lost',
          lastAction: turn === 'player' ? 'You won!' : 'AI won!',
        };
      }

      return {
        ...prev,
        [handKey]: newHand,
        discardPile: newDiscardPile,
        currentTurn: nextTurn,
        wildSuit: newWildSuit,
        lastAction: `${turn === 'player' ? 'You' : 'AI'} played ${card.rank} of ${card.suit}${newWildSuit ? `. New suit: ${newWildSuit}` : ''}`,
      };
    });
  };

  const handleDrawCard = () => {
    if (state.currentTurn !== 'player' || state.status !== 'playing') return;

    if (state.drawPile.length === 0) {
      // If draw pile is empty, reshuffle discard pile (except top card)
      if (state.discardPile.length <= 1) {
        setState(prev => ({ ...prev, currentTurn: 'ai', lastAction: 'No cards to draw. Turn skipped.' }));
        return;
      }
      
      const topCard = state.discardPile[state.discardPile.length - 1];
      const newDrawPile = shuffle(state.discardPile.slice(0, -1));
      const drawnCard = newDrawPile.pop()!;
      
      setState(prev => ({
        ...prev,
        drawPile: newDrawPile,
        discardPile: [topCard],
        playerHand: [...prev.playerHand, drawnCard],
        lastAction: 'Reshuffled deck and drew a card.',
      }));
      return;
    }

    const newDrawPile = [...state.drawPile];
    const drawnCard = newDrawPile.pop()!;
    const isDrawnPlayable = isValidMove(drawnCard, topCard, state.wildSuit);

    setState(prev => ({
      ...prev,
      drawPile: newDrawPile,
      playerHand: [...prev.playerHand, drawnCard],
      lastAction: isDrawnPlayable ? 'You drew a playable card!' : 'You drew a card. No match found.',
    }));

    if (!isDrawnPlayable) {
      setCanPass(true);
    }
  };

  const handlePass = () => {
    if (!canPass || state.currentTurn !== 'player') return;
    setState(prev => ({
      ...prev,
      currentTurn: 'ai',
      lastAction: 'You passed your turn.',
    }));
    setCanPass(false);
  };

  const handleSuitSelect = (suit: Suit) => {
    if (pendingCard) {
      executeMove(pendingCard, 'player', suit);
      setPendingCard(null);
      setShowSuitPicker(false);
    }
  };

  const aiTurn = useCallback(() => {
    if (state.currentTurn !== 'ai' || state.status !== 'playing') return;

    // Small delay for realism
    setTimeout(() => {
      const topCard = state.discardPile[state.discardPile.length - 1];
      const validMoves = state.aiHand.filter(c => isValidMove(c, topCard, state.wildSuit));

      if (validMoves.length > 0) {
        // AI strategy: prefer non-8s, then 8s
        const nonEight = validMoves.find(c => c.rank !== '8');
        const cardToPlay = nonEight || validMoves[0];

        if (cardToPlay.rank === '8') {
          // AI picks its most frequent suit
          const suitsCount: Record<string, number> = {};
          state.aiHand.forEach(c => {
            suitsCount[c.suit] = (suitsCount[c.suit] || 0) + 1;
          });
          const bestSuit = (Object.keys(suitsCount).sort((a, b) => suitsCount[b] - suitsCount[a])[0] || 'hearts') as Suit;
          executeMove(cardToPlay, 'ai', bestSuit);
        } else {
          executeMove(cardToPlay, 'ai');
        }
      } else {
        // AI draws
        if (state.drawPile.length > 0) {
          const newDrawPile = [...state.drawPile];
          const drawnCard = newDrawPile.pop()!;
          setState(prev => ({
            ...prev,
            drawPile: newDrawPile,
            aiHand: [...prev.aiHand, drawnCard],
            currentTurn: 'player',
            lastAction: 'AI drew a card and ended its turn.',
          }));
        } else {
          setState(prev => ({
            ...prev,
            currentTurn: 'player',
            lastAction: 'AI had no moves and draw pile was empty. Your turn.',
          }));
        }
      }
    }, 1500);
  }, [state.aiHand, state.currentTurn, state.discardPile, state.drawPile.length, state.status, state.wildSuit]);

  useEffect(() => {
    if (state.currentTurn === 'ai' && state.status === 'playing') {
      aiTurn();
    }
  }, [state.currentTurn, state.status, aiTurn]);

  return (
    <div className="h-screen w-screen felt-bg flex flex-col items-center justify-between p-4 overflow-hidden select-none">
      {/* AI Hand Area */}
      <div className="w-full flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-white/60 text-sm font-medium">
          <div className={`w-2 h-2 rounded-full ${state.currentTurn === 'ai' ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
          AI OPPONENT ({state.aiHand.length} cards)
        </div>
        <div className="flex justify-center -space-x-12 sm:-space-x-16 h-24 sm:h-32">
          {state.aiHand.map((card, i) => (
            <Card key={card.id} card={card} isFaceUp={false} className="scale-75 origin-top" />
          ))}
        </div>
      </div>

      {/* Center Table Area */}
      <div className="flex-1 w-full max-w-4xl flex items-center justify-center gap-8 sm:gap-16">
        {/* Draw Pile */}
        <div className="relative group" onClick={handleDrawCard}>
          <div className="absolute -inset-2 bg-white/5 rounded-2xl blur-xl group-hover:bg-white/10 transition-colors" />
          <div className="relative">
            {state.drawPile.length > 0 ? (
              <div className="relative">
                <Card card={state.drawPile[0]} isFaceUp={false} className="relative z-10" />
                <div className="absolute top-1 left-1 w-full h-full bg-indigo-900 rounded-xl border-4 border-white/10 -z-10" />
                <div className="absolute top-2 left-2 w-full h-full bg-indigo-950 rounded-xl border-4 border-white/10 -z-20" />
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <span className="bg-black/40 px-2 py-1 rounded text-xs font-mono text-white/80">
                    {state.drawPile.length}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-24 h-36 sm:w-28 sm:h-40 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center">
                <AlertCircle className="text-white/20" size={32} />
              </div>
            )}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-[10px] uppercase tracking-widest font-bold whitespace-nowrap">
              Draw Pile
            </div>
          </div>
        </div>

        {/* Discard Pile */}
        <div className="relative">
          <div className="absolute -inset-4 bg-white/5 rounded-full blur-2xl" />
          <div className="relative">
            <AnimatePresence mode="popLayout">
              {state.discardPile.length > 0 && (
                <motion.div
                  key={state.discardPile[state.discardPile.length - 1].id}
                  initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  className="relative z-10"
                >
                  <Card card={state.discardPile[state.discardPile.length - 1]} />
                  {state.wildSuit && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg border-2 border-indigo-500 z-20"
                    >
                      {state.wildSuit === 'hearts' && <Heart className="text-red-500" size={20} fill="currentColor" />}
                      {state.wildSuit === 'diamonds' && <Diamond className="text-red-500" size={20} fill="currentColor" />}
                      {state.wildSuit === 'clubs' && <Club className="text-stone-900" size={20} fill="currentColor" />}
                      {state.wildSuit === 'spades' && <Spade className="text-stone-900" size={20} fill="currentColor" />}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-[10px] uppercase tracking-widest font-bold whitespace-nowrap">
              Discard
            </div>
          </div>
        </div>
      </div>

      {/* Player Hand Area */}
      <div className="w-full max-w-5xl flex flex-col items-center gap-4 pb-4">
        <div className="w-full flex justify-between items-center px-4">
          <div className="flex items-center gap-2 text-white/60 text-sm font-medium">
            <div className={`w-2 h-2 rounded-full ${state.currentTurn === 'player' ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
            YOUR HAND ({state.playerHand.length} cards)
          </div>
          <div className="bg-black/20 px-4 py-1 rounded-full text-white/80 text-xs font-medium border border-white/10">
            {state.lastAction}
          </div>
        </div>

        <div className="flex justify-center -space-x-8 sm:-space-x-12 h-36 sm:h-40 px-8 overflow-x-auto no-scrollbar w-full">
          {state.playerHand.map((card) => (
            <Card 
              key={card.id} 
              card={card} 
              onClick={() => handlePlayCard(card)}
              disabled={state.currentTurn !== 'player' || state.status !== 'playing'}
              isPlayable={state.currentTurn === 'player' && isValidMove(card, topCard, state.wildSuit)}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <AnimatePresence>
          {canPass && state.currentTurn === 'player' && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={handlePass}
              className="mt-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-sm border border-white/20 transition-all flex items-center gap-2"
            >
              Pass Turn
              <ChevronRight size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Suit Picker Modal */}
      <AnimatePresence>
        {showSuitPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-stone-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-2xl font-display font-bold text-white mb-2 text-center">Wild Card!</h2>
              <p className="text-white/60 text-center mb-8">Choose the next suit to play.</p>
              
              <div className="grid grid-cols-2 gap-4">
                {(['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).map((suit) => (
                  <button
                    key={suit}
                    onClick={() => handleSuitSelect(suit)}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                  >
                    {suit === 'hearts' && <Heart className="text-red-500 group-hover:scale-125 transition-transform" size={40} fill="currentColor" />}
                    {suit === 'diamonds' && <Diamond className="text-red-500 group-hover:scale-125 transition-transform" size={40} fill="currentColor" />}
                    {suit === 'clubs' && <Club className="text-white group-hover:scale-125 transition-transform" size={40} fill="currentColor" />}
                    {suit === 'spades' && <Spade className="text-white group-hover:scale-125 transition-transform" size={40} fill="currentColor" />}
                    <span className="text-xs font-bold uppercase tracking-widest text-white/40 group-hover:text-white/80 transition-colors">
                      {suit}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {state.status !== 'playing' && state.status !== 'waiting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-stone-900 border border-white/10 rounded-3xl p-12 max-w-md w-full shadow-2xl text-center"
            >
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${state.status === 'won' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'}`}>
                {state.status === 'won' ? <Trophy size={40} /> : <AlertCircle size={40} />}
              </div>
              <h2 className="text-4xl font-display font-extrabold text-white mb-4">
                {state.status === 'won' ? 'Victory!' : 'Defeat!'}
              </h2>
              <p className="text-white/60 mb-10 text-lg">
                {state.status === 'won' 
                  ? 'You cleared your hand and outsmarted the AI!' 
                  : 'The AI was faster this time. Better luck next game!'}
              </p>
              
              <button
                onClick={initGame}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <RefreshCw size={20} />
                Play Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Screen */}
      {state.status === 'waiting' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950 p-4">
          <div className="max-w-xl w-full text-center">
            <motion.h1 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-6xl sm:text-8xl font-display font-black text-white mb-4 tracking-tighter"
            >
              RYAN'S <span className="text-indigo-500">CRAZY 8S</span>
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-white/40 text-lg mb-12 font-medium"
            >
              The classic card game, refined for the modern web.
            </motion.p>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 text-left"
            >
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="text-indigo-400 font-bold mb-1">MATCH</div>
                <div className="text-white/60 text-xs">Play cards with the same suit or rank as the top card.</div>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="text-indigo-400 font-bold mb-1">CRAZY 8S</div>
                <div className="text-white/60 text-xs">8s are wild! Play them anytime to change the current suit.</div>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="text-indigo-400 font-bold mb-1">WIN</div>
                <div className="text-white/60 text-xs">Be the first to clear all 8 cards from your hand.</div>
              </div>
            </motion.div>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={initGame}
              className="group relative inline-flex items-center gap-3 px-12 py-5 bg-white text-stone-950 rounded-full font-black text-xl hover:scale-105 transition-all shadow-2xl shadow-white/10"
            >
              START GAME
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
