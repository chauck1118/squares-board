import React from 'react';
import { graphqlScoringService } from '../services/graphql-scoring';

interface TournamentProgressProps {
  currentRound: string;
  completedRounds: string[];
  upcomingRounds: string[];
  roundStats: Record<string, { 
    total: number; 
    completed: number; 
    inProgress: number; 
    scheduled: number 
  }>;
  className?: string;
}

const TournamentProgress: React.FC<TournamentProgressProps> = ({
  currentRound,
  completedRounds,
  upcomingRounds,
  roundStats,
  className = '',
}) => {
  // All rounds in tournament order
  const allRounds = ['ROUND1', 'ROUND2', 'SWEET16', 'ELITE8', 'FINAL4', 'CHAMPIONSHIP'];
  
  // Get round display name
  const getRoundDisplayName = (round: string): string => {
    return graphqlScoringService.formatRoundName(round);
  };
  
  // Get round status class
  const getRoundStatusClass = (round: string): string => {
    if (completedRounds.includes(round)) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (round === currentRound) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (upcomingRounds.includes(round)) {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
    return 'bg-gray-50 text-gray-400 border-gray-100';
  };

  // Calculate progress percentage for current round
  const getCurrentRoundProgress = (): number => {
    if (!roundStats[currentRound]) return 0;
    
    const stats = roundStats[currentRound];
    if (stats.total === 0) return 0;
    
    return Math.round((stats.completed / stats.total) * 100);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Tournament Progress</h2>
        <p className="text-sm text-gray-500 mt-1">
          {currentRound ? `Currently in ${getRoundDisplayName(currentRound)}` : 'Tournament not started'}
        </p>
      </div>

      <div className="p-6">
        {/* Round progression timeline */}
        <div className="flex items-center justify-between mb-6">
          {allRounds.map((round, index) => {
            const isActive = roundStats[round] && roundStats[round].total > 0;
            const isCompleted = completedRounds.includes(round);
            const isCurrent = round === currentRound;
            
            return (
              <div key={round} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted ? 'bg-green-500 text-white' : 
                  isCurrent ? 'bg-blue-500 text-white' : 
                  isActive ? 'bg-gray-200 text-gray-700' : 
                  'bg-gray-100 text-gray-400'
                }`}>
                  {index + 1}
                </div>
                <div className={`text-xs mt-1 font-medium ${
                  isCompleted ? 'text-green-600' : 
                  isCurrent ? 'text-blue-600' : 
                  isActive ? 'text-gray-600' : 
                  'text-gray-400'
                }`}>
                  {getRoundDisplayName(round).split(' ')[0]}
                </div>
                {index < allRounds.length - 1 && (
                  <div className="absolute hidden md:block" style={{ 
                    left: `calc(${(index + 0.5) * (100 / (allRounds.length - 1))}% - 1rem)`,
                    height: '2px',
                    width: `calc(${100 / (allRounds.length - 1)}% - 1rem)`,
                    top: '1.5rem',
                    backgroundColor: isCompleted ? '#10B981' : '#E5E7EB'
                  }}></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Current round details */}
        {currentRound && roundStats[currentRound] && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-md font-medium text-gray-900">
                {getRoundDisplayName(currentRound)}
              </h3>
              <span className="text-sm font-medium text-blue-600">
                {roundStats[currentRound].completed} of {roundStats[currentRound].total} games completed
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${getCurrentRoundProgress()}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <div>{roundStats[currentRound].completed} completed</div>
              <div>{roundStats[currentRound].inProgress} in progress</div>
              <div>{roundStats[currentRound].scheduled} scheduled</div>
            </div>
          </div>
        )}

        {/* Round details */}
        <div className="mt-6 space-y-3">
          {allRounds.map(round => {
            if (!roundStats[round] || roundStats[round].total === 0) return null;
            
            return (
              <div 
                key={round}
                className={`px-4 py-3 rounded-lg border ${getRoundStatusClass(round)}`}
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium">{getRoundDisplayName(round)}</div>
                  <div className="text-sm">
                    {roundStats[round].completed}/{roundStats[round].total} games
                  </div>
                </div>
                
                {round === currentRound && (
                  <div className="mt-2 flex justify-between text-xs">
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        <span className="h-1.5 w-1.5 mr-1 rounded-full bg-green-500"></span>
                        {roundStats[round].completed} completed
                      </span>
                    </div>
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        <span className="h-1.5 w-1.5 mr-1 rounded-full bg-blue-500"></span>
                        {roundStats[round].inProgress} in progress
                      </span>
                    </div>
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                        <span className="h-1.5 w-1.5 mr-1 rounded-full bg-gray-500"></span>
                        {roundStats[round].scheduled} scheduled
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TournamentProgress;