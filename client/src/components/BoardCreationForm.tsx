import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { joiResolver } from '@hookform/resolvers/joi';
import { createBoard } from '../services/graphql-admin';
import { boardCreationSchema } from '../utils/validation';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';

interface CreateBoardRequest {
  name: string;
  pricePerSquare: number;
  payoutStructure: {
    round1: number;
    round2: number;
    sweet16: number;
    elite8: number;
    final4: number;
    championship: number;
  };
}

const BoardCreationForm: React.FC = () => {
  const navigate = useNavigate();
  const { isFullyConnected } = useNetworkStatus();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<CreateBoardRequest>({
    resolver: joiResolver(boardCreationSchema),
    defaultValues: {
      name: '',
      pricePerSquare: 10,
      payoutStructure: {
        round1: 25,
        round2: 50,
        sweet16: 100,
        elite8: 200,
        final4: 400,
        championship: 800,
      },
    },
    mode: 'onBlur',
  });

  const watchedValues = watch();

  const onSubmit = async (data: CreateBoardRequest): Promise<void> => {
    try {
      setServerError(null);
      clearErrors();
      
      const response = await createBoard(data);
      console.log('Board created:', response);
      
      // Navigate to the admin board management page
      navigate(`/admin/boards/${response.board.id}`);
    } catch (error: any) {
      console.error('Board creation failed:', error);
      
      // Handle specific validation errors
      if (error.errors && error.errors.length > 0) {
        const validationErrors = error.errors[0];
        
        if (validationErrors.message.includes('name')) {
          setError('name', {
            type: 'server',
            message: validationErrors.message,
          });
        } else if (validationErrors.message.includes('pricePerSquare')) {
          setError('pricePerSquare', {
            type: 'server',
            message: validationErrors.message,
          });
        } else if (validationErrors.message.includes('payoutStructure')) {
          setError('payoutStructure', {
            type: 'server',
            message: validationErrors.message,
          });
        } else {
          setServerError(validationErrors.message || 'An error occurred while creating the board.');
        }
      } else {
        setServerError(error.message || 'An error occurred while creating the board.');
      }
    }
  };

  const totalPayout = Object.values(watchedValues.payoutStructure || {}).reduce((sum, value) => sum + (value || 0), 0);
  const expectedRevenue = 100 * (watchedValues.pricePerSquare || 0);
  const profitMargin = expectedRevenue - totalPayout;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => navigate('/admin')}
              className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Admin Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Create New Board</h1>
            <p className="mt-2 text-gray-600">
              Set up a new March Madness squares board with custom pricing and payouts.
            </p>
          </div>

          {/* Network status warning */}
          {!isFullyConnected && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Connection issues detected. Please check your network.
              </div>
            </div>
          )}

          {/* Server error */}
          {serverError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{serverError}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Board Details</h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Board Name
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    id="name"
                    className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="e.g., March Madness 2024"
                    disabled={isSubmitting || !isFullyConnected}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="pricePerSquare" className="block text-sm font-medium text-gray-700">
                    Price per Square ($)
                  </label>
                  <input
                    {...register('pricePerSquare', { valueAsNumber: true })}
                    type="number"
                    id="pricePerSquare"
                    min="0.01"
                    step="0.01"
                    className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.pricePerSquare ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    disabled={isSubmitting || !isFullyConnected}
                  />
                  {errors.pricePerSquare && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.pricePerSquare.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payout Structure</h3>
              <p className="text-sm text-gray-600 mb-4">
                Set the payout amounts for each tournament round. These will be distributed to winning squares.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="payoutStructure.round1" className="block text-sm font-medium text-gray-700">
                    Round 1 (Games 1-32)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      {...register('payoutStructure.round1', { valueAsNumber: true })}
                      type="number"
                      id="payoutStructure.round1"
                      min="0"
                      step="0.01"
                      className={`pl-7 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.payoutStructure?.round1 ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      disabled={isSubmitting || !isFullyConnected}
                    />
                  </div>
                  {errors.payoutStructure?.round1 && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.payoutStructure.round1.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="payoutStructure.round2" className="block text-sm font-medium text-gray-700">
                    Round 2 (Games 33-48)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      {...register('payoutStructure.round2', { valueAsNumber: true })}
                      type="number"
                      id="payoutStructure.round2"
                      min="0"
                      step="0.01"
                      className={`pl-7 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.payoutStructure?.round2 ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      disabled={isSubmitting || !isFullyConnected}
                    />
                  </div>
                  {errors.payoutStructure?.round2 && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.payoutStructure.round2.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="payoutStructure.sweet16" className="block text-sm font-medium text-gray-700">
                    Sweet 16 (Games 49-56)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      {...register('payoutStructure.sweet16', { valueAsNumber: true })}
                      type="number"
                      id="payoutStructure.sweet16"
                      min="0"
                      step="0.01"
                      className={`pl-7 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.payoutStructure?.sweet16 ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      disabled={isSubmitting || !isFullyConnected}
                    />
                  </div>
                  {errors.payoutStructure?.sweet16 && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.payoutStructure.sweet16.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="payoutStructure.elite8" className="block text-sm font-medium text-gray-700">
                    Elite 8 (Games 57-60)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      {...register('payoutStructure.elite8', { valueAsNumber: true })}
                      type="number"
                      id="payoutStructure.elite8"
                      min="0"
                      step="0.01"
                      className={`pl-7 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.payoutStructure?.elite8 ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      disabled={isSubmitting || !isFullyConnected}
                    />
                  </div>
                  {errors.payoutStructure?.elite8 && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.payoutStructure.elite8.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="payoutStructure.final4" className="block text-sm font-medium text-gray-700">
                    Final 4 (Games 61-62)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      {...register('payoutStructure.final4', { valueAsNumber: true })}
                      type="number"
                      id="payoutStructure.final4"
                      min="0"
                      step="0.01"
                      className={`pl-7 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.payoutStructure?.final4 ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      disabled={isSubmitting || !isFullyConnected}
                    />
                  </div>
                  {errors.payoutStructure?.final4 && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.payoutStructure.final4.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="payoutStructure.championship" className="block text-sm font-medium text-gray-700">
                    Championship (Game 63)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      {...register('payoutStructure.championship', { valueAsNumber: true })}
                      type="number"
                      id="payoutStructure.championship"
                      min="0"
                      step="0.01"
                      className={`pl-7 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.payoutStructure?.championship ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      disabled={isSubmitting || !isFullyConnected}
                    />
                  </div>
                  {errors.payoutStructure?.championship && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {errors.payoutStructure.championship.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-800">Expected Revenue</div>
                  <div className="text-2xl font-bold text-blue-900">${expectedRevenue.toLocaleString()}</div>
                  <div className="text-xs text-blue-600">100 squares × ${watchedValues.pricePerSquare || 0}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-red-800">Total Payouts</div>
                  <div className="text-2xl font-bold text-red-900">${totalPayout.toLocaleString()}</div>
                  <div className="text-xs text-red-600">Sum of all round payouts</div>
                </div>
                <div className={`p-4 rounded-lg ${profitMargin >= 0 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                  <div className={`text-sm font-medium ${profitMargin >= 0 ? 'text-green-800' : 'text-yellow-800'}`}>
                    Net Profit
                  </div>
                  <div className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-900' : 'text-yellow-900'}`}>
                    ${profitMargin.toLocaleString()}
                  </div>
                  <div className={`text-xs ${profitMargin >= 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {profitMargin >= 0 ? 'Positive margin' : 'Negative margin'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isFullyConnected}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" color="white" className="mr-2" />
                    Creating...
                  </>
                ) : !isFullyConnected ? (
                  'Connection Required'
                ) : (
                  'Create Board'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BoardCreationForm;