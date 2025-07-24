import React from 'react';
import { Link } from 'react-router-dom';
import { client } from '../services/amplify-client';
import { useAmplifyOperation } from '../hooks/useAmplifyOperation';
import { AmplifyErrorDisplay } from './AmplifyErrorDisplay';
import { AmplifyLoading } from './LoadingSpinner';

interface BoardSummary {
  id: string;
  name: string;
  status: 'OPEN' | 'FILLED' | 'ASSIGNED' | 'ACTIVE' | 'COMPLETED';
  pricePerSquare: number;
  claimedSquares: number;
  paidSquares: number;
  totalSquares: number;
}

/**
 * BoardList component using AWS Amplify with comprehensive error handling
 * This demonstrates the proper usage of AWS Amplify error handling patterns
 */
const BoardListWithAmplify: React.FC = () => {
  // Use AWS Amplify operation hook with error handling and caching
  const {
    data: boards,
    loading,
    error,
    execute: fetchBoards,
    retry,
    refresh,
    isRetryable,
    isCached,
    isOffline
  } = useAmplifyOperation(
    async () => {
      // Use AWS Amplify Data client for GraphQL operations
      const response = await client.models.Board.list({
        selectionSet: [
          'id',
          'name', 
          'status',
          'pricePerSquare',
          'claimedSquares',
          'paidSquares',
          'totalSquares'
        ]
      });
      
      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message);
      }
      
      return response.data || [];
    },
    'board-list-fetch',
    {
      cacheTime: 30000, // Cache for 30 seconds
      enableOfflineSupport: true,
      onSuccess: (data) => {
        console.log(`Loaded ${data.length} boards`);
      },
      onError: (error) => {
        console.error('Failed to load boards:', error);
      }
    }
  );

  // Auto-fetch on component mount
  React.useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-100 text-green-800';
      case 'FILLED':
        return 'bg-yellow-100 text-yellow-800';
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800';
      case 'ACTIVE':
        return 'bg-purple-100 text-purple-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'OPEN':
        return 'Open';
      case 'FILLED':
        return 'Filled';
      case 'ASSIGNED':
        return 'Assigned';
      case 'ACTIVE':
        return 'Active';
      case 'COMPLETED':
        return 'Completed';
      default:
        return status;
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  // Show loading state with offline indicator
  if (loading) {
    return (
      <div className="space-y-4">
        {isOffline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  You're offline. Showing cached data if available.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <AmplifyLoading
          loading={true}
          loadingMessage={isOffline ? "Loading cached boards..." : "Loading boards..."}
          size="md"
        >
          <div />
        </AmplifyLoading>
      </div>
    );
  }

  // Show error state with retry options
  if (error) {
    return (
      <div className="space-y-4">
        <AmplifyErrorDisplay
          error={error}
          onRetry={isRetryable ? retry : undefined}
          showDetails={process.env.NODE_ENV === 'development'}
        />
        
        <div className="flex space-x-3">
          <button
            onClick={() => refresh()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh
          </button>
          
          {isOffline && (
            <div className="text-sm text-gray-600 flex items-center">
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              You're offline. Connect to internet and try again.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show empty state
  if (!boards || boards.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No boards available</h3>
        <p className="mt-1 text-sm text-gray-500">
          There are no March Madness boards available at this time.
        </p>
        
        <div className="mt-4 flex justify-center space-x-3">
          <button
            onClick={() => refresh()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cache indicator */}
      {isCached && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center">
            <svg className="h-4 w-4 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-700">
              Showing cached data. 
              <button 
                onClick={() => refresh()} 
                className="ml-1 underline hover:no-underline"
              >
                Refresh for latest
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Offline indicator */}
      {isOffline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex items-center">
            <svg className="h-4 w-4 text-yellow-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-yellow-700">
              You're offline. Data may not be up to date.
            </p>
          </div>
        </div>
      )}

      {/* Board grid */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <Link
            key={board.id}
            to={`/boards/${board.id}`}
            className="block bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {board.name}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(board.status)}`}>
                  {getStatusText(board.status)}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Price per square:</span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(board.pricePerSquare)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span>Squares claimed:</span>
                  <span className="font-medium text-gray-900">
                    {board.claimedSquares} / {board.totalSquares}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span>Squares paid:</span>
                  <span className="font-medium text-gray-900">
                    {board.paidSquares} / {board.totalSquares}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round((board.paidSquares / board.totalSquares) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(board.paidSquares / board.totalSquares) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Action indicator */}
              <div className="mt-4 flex items-center text-sm">
                {board.status === 'OPEN' && (
                  <div className="flex items-center text-green-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Available to join</span>
                  </div>
                )}
                {board.status === 'FILLED' && (
                  <div className="flex items-center text-yellow-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span>Awaiting assignment</span>
                  </div>
                )}
                {(board.status === 'ASSIGNED' || board.status === 'ACTIVE') && (
                  <div className="flex items-center text-blue-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                    </svg>
                    <span>View your squares</span>
                  </div>
                )}
                {board.status === 'COMPLETED' && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Tournament completed</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Refresh button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => refresh()}
          disabled={loading}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};

export default BoardListWithAmplify;