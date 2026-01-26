import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import BackgammonBoard from '../components/backgammon/BackgammonBoard';
import DiceFace from '../components/backgammon/DiceFace';
import { Dices, RotateCcw } from 'lucide-react';

const STARTING_POSITION = {
  24: { color: 'teal', count: 2 }, 
  13: { color: 'teal', count: 5 }, 
  8: { color: 'teal', count: 3 }, 
  6: { color: 'teal', count: 5 },
  1: { color: 'bone', count: 2 }, 
  12: { color: 'bone', count: 5 }, 
  17: { color: 'bone', count: 3 }, 
  19: { color: 'bone', count: 5 }
};

export default function DummyGamePage() {
  const [board, setBoard] = useState(STARTING_POSITION);
  const [dice, setDice] = useState([0, 0]);
  const [currentTurn, setCurrentTurn] = useState('teal');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [doublingCube, setDoublingCube] = useState({ value: 1, owner: null });

  const rollDice = () => {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    setDice([die1, die2]);
  };

  const endTurn = () => {
    setCurrentTurn(currentTurn === 'teal' ? 'bone' : 'teal');
    setDice([0, 0]);
    setSelectedPoint(null);
  };

  const resetGame = () => {
    setBoard(STARTING_POSITION);
    setDice([0, 0]);
    setCurrentTurn('teal');
    setSelectedPoint(null);
    setDoublingCube({ value: 1, owner: null });
  };

  const handlePointClick = (pointNumber) => {
    console.log('Point clicked:', pointNumber);
    setSelectedPoint(pointNumber);
  };

  const handleBarClick = (color) => {
    console.log('Bar clicked:', color);
  };

  const handleOffClick = (color) => {
    console.log('Off area clicked:', color);
  };

  const handleDoublingCubeClick = () => {
    if (doublingCube.owner === null || doublingCube.owner === currentTurn) {
      setDoublingCube({ 
        value: doublingCube.value * 2, 
        owner: currentTurn === 'teal' ? 'bone' : 'teal' 
      });
    }
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#e5e4cd' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold main-text mb-2">Dummy Game - UI Test</h1>
          <p className="text-sm main-text opacity-70">Test the game interface without backend calls</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Game Info */}
          <Card className="tool-card-bg border-0 elegant-shadow lg:col-span-1">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold main-text mb-3">Game Info</h3>
                <div className="space-y-2 text-sm main-text">
                  <div className="flex justify-between">
                    <span>Current Turn:</span>
                    <span className="font-bold" style={{ color: currentTurn === 'teal' ? '#007e81' : '#6e6157' }}>
                      {currentTurn === 'teal' ? 'Teal' : 'Bone'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Match To:</span>
                    <span className="font-bold">5 points</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Score:</span>
                    <span className="font-bold">0 - 0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Selected Point:</span>
                    <span className="font-bold">{selectedPoint || 'None'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold main-text mb-3">Doubling Cube</h3>
                <div 
                  className="w-20 h-20 rounded-lg flex items-center justify-center text-3xl font-bold cursor-pointer hover:opacity-80 transition-opacity mx-auto"
                  style={{ 
                    backgroundColor: doublingCube.owner === 'teal' ? '#007e81' : doublingCube.owner === 'bone' ? '#6e6157' : '#f26222',
                    color: '#e5e4cd'
                  }}
                  onClick={handleDoublingCubeClick}
                >
                  {doublingCube.value}
                </div>
                <p className="text-xs text-center mt-2 main-text opacity-70">
                  {doublingCube.owner ? `Owned by ${doublingCube.owner}` : 'Center'}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold main-text mb-3">Controls</h3>
                <div className="space-y-2">
                  <Button
                    onClick={rollDice}
                    disabled={dice[0] !== 0}
                    className="w-full"
                    style={{ backgroundColor: '#f26222', color: 'white' }}
                  >
                    <Dices className="w-4 h-4 mr-2" />
                    Roll Dice
                  </Button>
                  
                  <Button
                    onClick={endTurn}
                    disabled={dice[0] === 0}
                    variant="outline"
                    className="w-full"
                  >
                    End Turn
                  </Button>

                  <Button
                    onClick={resetGame}
                    variant="outline"
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Game
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold main-text mb-3">Instructions</h3>
                <div className="text-xs main-text opacity-70 space-y-1">
                  <p>• Click "Roll Dice" to roll</p>
                  <p>• Click points to select them</p>
                  <p>• Click "End Turn" when done</p>
                  <p>• Click cube to double</p>
                  <p>• This is UI only - no moves are validated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Center - Game Board */}
          <div className="lg:col-span-2">
            <Card className="border-0 elegant-shadow" style={{ backgroundColor: '#c2b2a3' }}>
              <CardContent className="p-6">
                <BackgammonBoard
                  position={board}
                  bar={{ teal: 0, bone: 0 }}
                  bornOff={{ teal: 0, bone: 0 }}
                  isPlayerTurn={true}
                  playerColor={currentTurn}
                  doublingCube={{ value: doublingCube.value, owner: doublingCube.owner, disabled: false }}
                  onCheckerClick={handlePointClick}
                />

                {/* Dice Display */}
                <div className="flex justify-center gap-4 mt-6">
                  <DiceFace value={dice[0]} color={currentTurn} />
                  <DiceFace value={dice[1]} color={currentTurn} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Player Info */}
          <Card className="tool-card-bg border-0 elegant-shadow lg:col-span-1">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold main-text mb-3">Teal Player</h3>
                <div className="space-y-2 text-sm main-text">
                  <div className="flex justify-between">
                    <span>Rating:</span>
                    <span className="font-bold">1500</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Checkers Off:</span>
                    <span className="font-bold">0</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-400"></div>

              <div>
                <h3 className="text-lg font-bold main-text mb-3">Bone Player</h3>
                <div className="space-y-2 text-sm main-text">
                  <div className="flex justify-between">
                    <span>Rating:</span>
                    <span className="font-bold">1500</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Checkers Off:</span>
                    <span className="font-bold">0</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-400"></div>

              <div>
                <h3 className="text-lg font-bold main-text mb-3">Recent Rolls</h3>
                <div className="space-y-1 text-xs main-text opacity-70">
                  {dice[0] !== 0 ? (
                    <div className="flex items-center gap-2">
                      <span style={{ color: currentTurn === 'teal' ? '#007e81' : '#6e6157' }}>
                        {currentTurn === 'teal' ? 'Teal' : 'Bone'}:
                      </span>
                      <span className="font-bold">{dice[0]}, {dice[1]}</span>
                    </div>
                  ) : (
                    <p>No rolls yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}