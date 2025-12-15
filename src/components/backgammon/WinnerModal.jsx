
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, TrendingUp, TrendingDown, Star } from "lucide-react";

export default function WinnerModal({ isOpen, onClose, winnerId, gameSession, playerInfo, results }) {
    if (!isOpen || !gameSession) return null;

    const winnerInfo = winnerId === playerInfo.tealPlayer?.user_id ? playerInfo.tealPlayer : playerInfo.bonePlayer;
    const loserInfo = winnerId === playerInfo.tealPlayer?.user_id ? playerInfo.bonePlayer : playerInfo.tealPlayer;

    const ratingChange = results?.ratingChange;
    const bonesChange = results?.bonesChange;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md text-center" style={{ backgroundColor: '#5a3217', color: '#e5e4cd' }}>
                <DialogHeader>
                    <div className="mx-auto bg-[#f26222] p-4 rounded-full -mt-12 border-4 border-[#5a3217]">
                        <Crown className="w-12 h-12 text-white" />
                    </div>
                    <DialogTitle className="text-3xl uppercase mt-4" style={{ fontFamily: "'Tanker', sans-serif" }}>
                        {winnerInfo?.username || 'Player'} Wins!
                    </DialogTitle>
                </DialogHeader>

                <div className="my-6 space-y-4">
                    <p className="text-lg">Congratulations to <strong className="highlight-text">{winnerInfo?.username}</strong> on a great victory.</p>

                    {gameSession.match_state?.is_rated && ratingChange !== undefined && (
                        <Card className="bg-white/10 border-0 p-4">
                            <h3 className="text-lg font-semibold mb-2">Rating Change</h3>
                            <div className="flex justify-around items-center">
                                {/* Winner */}
                                <div className="flex flex-col items-center">
                                    <p className="font-bold text-sm">{winnerInfo?.username}</p>
                                    <div className="flex items-center gap-2 text-green-400">
                                        <TrendingUp className="w-5 h-5" />
                                        <span className="font-bold text-xl">+{ratingChange}</span>
                                    </div>
                                    <p className="text-xs flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400"/> {results.newWinnerRating}</p>
                                </div>
                                {/* Loser */}
                                <div className="flex flex-col items-center">
                                    <p className="font-bold text-sm">{loserInfo?.username}</p>
                                    <div className="flex items-center gap-2 text-red-400">
                                        <TrendingDown className="w-5 h-5" />
                                        <span className="font-bold text-xl">-{ratingChange}</span>
                                    </div>
                                    <p className="text-xs flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400"/> {results.newLoserRating}</p>
                                </div>
                            </div>
                        </Card>
                    )}
                    
                    {bonesChange > 0 && (
                        <Card className="bg-white/10 border-0 p-4">
                            <h3 className="text-lg font-semibold mb-2">Bones Won</h3>
                            <div className="flex justify-center items-center gap-2">
                                <span className="font-bold text-2xl text-orange-400">🦴 {bonesChange}</span>
                            </div>
                        </Card>
                    )}

                </div>

                <DialogFooter>
                    <Button
                        onClick={onClose}
                        className="w-full uppercase"
                        style={{ backgroundColor: '#007e81', color: 'white' }}
                    >
                        Return to Lobby
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
