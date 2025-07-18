import React from 'react';
import { Game } from '../types/board';

interface WinnerDisplayProps {
  recentWinners: Game[];
  className?: string;
}

const WinnerDisplay: React.FC<WinnerDisplayProps> = ({ recentWinners, className = '' }) => {
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getWinningDigits = (team1Score: number | null, team2Score: number | null): string => {
    if (team1Score === null || team2Score === null) {
      return '--';
    }
    return `${team1Score % 10}-${team2Score % 10}`;
  };

  if (recentWinners.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg ${className}`}>
      <div className="px-6 py-4 border-b border-green-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-green-800">
              🎉 Recent Winners
            </h3>
            <p className="text-sm text-green-600">
              Latest game results and payouts
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {recentWinners.map((game) => (
            <div
              key={game.id}
              className="bg-white rounded-lg border border-green-200 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        Game #{game.gameNumber} - {game.round}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {game.team1} vs {game.team2}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center space-x-4">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">Final Score:</span>
                      <span className="ml-1 font-bold text-blue-600">
                        {game.team1Score}-{game.team2Score}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">Winning Digits:</span>
                      <span className="ml-1 font-bold text-green-600">
                        {getWinningDigits(game.team1Score, game.team2Score)}
                      </span>
                    </div>
                  </div>

                  {game.winnerSquare && (
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-green-800">
                              {game.winnerSquare.user?.displayName?.charAt(0) || '?'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {game.winnerSquare.user?.displayName || 'Unknown Player'}
                          </p>
                          {game.winnerSquare.gridPosition !== null && (
                            <p className="text-xs text-gray-500">
                              Square Position {game.winnerSquare.gridPosition}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {game.payout && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {formatPrice(game.payout)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Payout
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {recentWinners.length > 3 && (
          <div className="mt-4 text-center">
            <button className="text-sm text-green-600 hover:text-green-700 font-medium">
              View All Winners →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WinnerDisplay;