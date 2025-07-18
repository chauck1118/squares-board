import React from 'react';
import { Game, PayoutStructure } from '../types/board';

interface ScoringTableProps {
  games: Game[];
  payoutStructure: PayoutStructure | null;
  className?: string;
  realtimeUpdates?: string[]; // Game IDs that have recent updates
}

const ScoringTable: React.FC<ScoringTableProps> = ({ games, payoutStructure, className = '', realtimeUpdates = [] }) => {
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'SCHEDULED':
        return 'text-gray-500';
      case 'IN_PROGRESS':
        return 'text-blue-600';
      case 'COMPLETED':
        return 'text-green-600';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'SCHEDULED':
        return 'Scheduled';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Final';
      default:
        return status;
    }
  };

  const getRoundPayout = (round: string): number => {
    if (!payoutStructure) return 0;
    
    const roundPayouts: Record<string, number> = {
      'Round 1': payoutStructure.round1,
      'Round 2': payoutStructure.round2,
      'Sweet 16': payoutStructure.sweet16,
      'Elite 8': payoutStructure.elite8,
      'Final 4': payoutStructure.final4,
      'Championship': payoutStructure.championship,
    };

    return roundPayouts[round] || 0;
  };

  const formatScore = (team1Score: number | null, team2Score: number | null): string => {
    if (team1Score === null || team2Score === null) {
      return '--';
    }
    return `${team1Score}-${team2Score}`;
  };

  const getWinningDigits = (team1Score: number | null, team2Score: number | null): string => {
    if (team1Score === null || team2Score === null) {
      return '--';
    }
    return `${team1Score % 10}-${team2Score % 10}`;
  };

  const groupGamesByRound = (games: Game[]) => {
    const grouped = games.reduce((acc, game) => {
      if (!acc[game.round]) {
        acc[game.round] = [];
      }
      acc[game.round].push(game);
      return acc;
    }, {} as Record<string, Game[]>);

    // Sort rounds in tournament order
    const roundOrder = ['Round 1', 'Round 2', 'Sweet 16', 'Elite 8', 'Final 4', 'Championship'];
    const sortedRounds: Record<string, Game[]> = {};
    
    roundOrder.forEach(round => {
      if (grouped[round]) {
        sortedRounds[round] = grouped[round].sort((a, b) => a.gameNumber - b.gameNumber);
      }
    });

    return sortedRounds;
  };

  const groupedGames = groupGamesByRound(games);

  if (games.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tournament Scoring</h2>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No games scheduled</h3>
          <p className="mt-1 text-sm text-gray-500">Games will appear here once the tournament begins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Tournament Scoring</h2>
        <p className="text-sm text-gray-500 mt-1">
          Winners are determined by the last digit of each team's final score
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {Object.entries(groupedGames).map(([round, roundGames]) => (
          <div key={round} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-medium text-gray-900">{round}</h3>
              <span className="text-sm font-medium text-green-600">
                {formatPrice(getRoundPayout(round))} per winner
              </span>
            </div>

            {/* Mobile-first responsive design */}
            <div className="block sm:hidden">
              {/* Mobile card layout */}
              <div className="space-y-4">
                {roundGames.map((game) => {
                  const hasRealtimeUpdate = realtimeUpdates.includes(game.id);
                  return (
                  <div key={game.id} className={`bg-gray-50 rounded-lg p-4 border ${
                    hasRealtimeUpdate ? 'border-blue-300 bg-blue-50 animate-pulse' : 'border-gray-200'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                        <div className="font-medium text-gray-900">Game #{game.gameNumber}</div>
                        {hasRealtimeUpdate && (
                          <div className="ml-2 flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        game.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        game.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getStatusText(game.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Teams:</span>
                        <div className="mt-1">
                          <div>{game.team1}</div>
                          <div className="text-gray-500 text-xs">vs</div>
                          <div>{game.team2}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <div>
                          <span className="font-medium text-gray-700">Score:</span>
                          <div className={`mt-1 ${game.status === 'COMPLETED' ? 'font-medium' : ''}`}>
                            {formatScore(game.team1Score, game.team2Score)}
                          </div>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-700">Winning Digits:</span>
                          <div className="mt-1">
                            {game.status === 'COMPLETED' ? (
                              <span className="font-medium text-blue-600">
                                {getWinningDigits(game.team1Score, game.team2Score)}
                              </span>
                            ) : (
                              <span className="text-gray-400">--</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {game.status === 'COMPLETED' && game.winnerSquare && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="font-medium text-gray-700">Winner:</span>
                          <div className="mt-1 flex items-center">
                            <div className="flex-shrink-0 h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                            <span className="font-medium text-green-600">
                              {game.winnerSquare.user?.displayName || 'Unknown'}
                            </span>
                          </div>
                          {game.winnerSquare.gridPosition !== null && (
                            <div className="text-xs text-gray-500 mt-1">
                              Position {game.winnerSquare.gridPosition}
                            </div>
                          )}
                          {game.payout && (
                            <div className="text-xs font-medium text-green-600 mt-1">
                              {formatPrice(game.payout)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop table layout */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Game
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matchup
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Winning Digits
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Winner
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roundGames.map((game) => {
                    const hasRealtimeUpdate = realtimeUpdates.includes(game.id);
                    return (
                    <tr key={game.id} className={`hover:bg-gray-50 ${
                      hasRealtimeUpdate ? 'bg-blue-50 animate-pulse' : ''
                    }`}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          #{game.gameNumber}
                          {hasRealtimeUpdate && (
                            <div className="ml-2 flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span>{game.team1}</span>
                          <span className="text-gray-500">vs</span>
                          <span>{game.team2}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        <span className={game.status === 'COMPLETED' ? 'font-medium' : ''}>
                          {formatScore(game.team1Score, game.team2Score)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {game.status === 'COMPLETED' ? (
                          <span className="font-medium text-blue-600">
                            {getWinningDigits(game.team1Score, game.team2Score)}
                          </span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={`font-medium ${getStatusColor(game.status)}`}>
                          {getStatusText(game.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {game.status === 'COMPLETED' && game.winnerSquare ? (
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                              <span className="font-medium text-green-600">
                                {game.winnerSquare.user?.displayName || 'Unknown'}
                              </span>
                            </div>
                            {game.winnerSquare.gridPosition !== null && (
                              <span className="text-xs text-gray-500 ml-4">
                                Position {game.winnerSquare.gridPosition}
                              </span>
                            )}
                            {game.payout && (
                              <span className="text-xs font-medium text-green-600 ml-4">
                                {formatPrice(game.payout)}
                              </span>
                            )}
                          </div>
                        ) : game.status === 'COMPLETED' ? (
                          <span className="text-gray-400">No winner</span>
                        ) : (
                          <span className="text-gray-400">TBD</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScoringTable;