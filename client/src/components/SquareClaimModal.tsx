import React, { useState } from 'react';
import { BoardDetail, Square } from '../types/board';

interface SquareClaimModalProps {
  board: BoardDetail;
  userSquares: Square[];
  onClaim: (numberOfSquares: number) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

const SquareClaimModal: React.FC<SquareClaimModalProps> = ({
  board,
  userSquares,
  onClaim,
  onClose,
  isLoading,
}) => {
  const [numberOfSquares, setNumberOfSquares] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const maxSquares = Math.min(10 - userSquares.length, 100 - board.claimedSquares);
  const totalCost = numberOfSquares * board.pricePerSquare;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (numberOfSquares < 1 || numberOfSquares > maxSquares) {
      setError(`Please select between 1 and ${maxSquares} squares`);
      return;
    }

    try {
      setError(null);
      await onClaim(numberOfSquares);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div className="mobile-modal">
      <div className="mobile-modal-content">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Claim Squares
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Board info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <h4 className="font-medium text-gray-900">{board.name}</h4>
            <p className="text-sm text-gray-600">
              {formatPrice(board.pricePerSquare)} per square
            </p>
          </div>

          {/* Current status */}
          <div className="mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Your current squares:</span>
              <span className="font-medium">{userSquares.length} / 10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Available squares:</span>
              <span className="font-medium">{100 - board.claimedSquares}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="numberOfSquares" className="block text-sm font-medium text-gray-700 mb-2">
                Number of squares to claim
              </label>
              <div className="flex items-center justify-center space-x-4">
                <button
                  type="button"
                  onClick={() => setNumberOfSquares(Math.max(1, numberOfSquares - 1))}
                  disabled={numberOfSquares <= 1 || isLoading}
                  className="w-10 h-10 sm:w-8 sm:h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  -
                </button>
                <input
                  type="number"
                  id="numberOfSquares"
                  min="1"
                  max={maxSquares}
                  value={numberOfSquares}
                  onChange={(e) => setNumberOfSquares(Math.max(1, Math.min(maxSquares, parseInt(e.target.value) || 1)))}
                  className="w-24 sm:w-20 text-center border border-gray-300 rounded-md px-3 py-3 sm:py-2 text-lg sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setNumberOfSquares(Math.min(maxSquares, numberOfSquares + 1))}
                  disabled={numberOfSquares >= maxSquares || isLoading}
                  className="w-10 h-10 sm:w-8 sm:h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  +
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Maximum {maxSquares} squares available
              </p>
            </div>

            {/* Cost calculation */}
            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total cost:</span>
                <span className="text-lg font-bold text-blue-900">
                  {formatPrice(totalCost)}
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                {numberOfSquares} square{numberOfSquares !== 1 ? 's' : ''} × {formatPrice(board.pricePerSquare)}
              </p>
            </div>

            {/* Payment notice */}
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Payment Required:</strong> Your squares will be marked as "pending" until payment is confirmed by an administrator.
                  </p>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || numberOfSquares < 1 || numberOfSquares > maxSquares}
                className="flex-1 px-4 py-3 sm:py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Claiming...
                  </>
                ) : (
                  `Claim ${numberOfSquares} Square${numberOfSquares !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SquareClaimModal;