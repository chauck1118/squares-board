import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { BoardPaymentStatusResponse, BoardAssignmentResponse } from '../types/board';
import Header from './Header';

const AdminBoardManagement: React.FC = () => {
  const { id: boardId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [boardData, setBoardData] = useState<BoardPaymentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (boardId) {
      loadBoardData();
    }
  }, [boardId]);

  const loadBoardData = async () => {
    if (!boardId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getBoardPaymentStatus(boardId);
      setBoardData(response);
    } catch (err: any) {
      console.error('Failed to load board data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load board data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentStatusChange = async (squareId: string, newStatus: 'PENDING' | 'PAID') => {
    try {
      setActionLoading(squareId);
      await apiService.updateSquarePayment(squareId, newStatus);
      await loadBoardData(); // Reload to get updated data
    } catch (err: any) {
      console.error('Failed to update payment status:', err);
      setError(err.response?.data?.error?.message || 'Failed to update payment status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerAssignment = async () => {
    if (!boardId) return;
    
    try {
      setActionLoading('assignment');
      const response: BoardAssignmentResponse = await apiService.triggerBoardAssignment(boardId);
      console.log('Assignment result:', response);
      await loadBoardData(); // Reload to get updated data
      alert(`Assignment completed! ${response.message}`);
    } catch (err: any) {
      console.error('Failed to trigger assignment:', err);
      setError(err.response?.data?.error?.message || 'Failed to trigger assignment.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleValidateAssignments = async () => {
    if (!boardId) return;
    
    try {
      setActionLoading('validation');
      const response = await apiService.validateBoardAssignments(boardId);
      
      if (response.valid) {
        alert('All assignments are valid!');
      } else {
        alert(`Assignment validation failed:\n${response.errors.join('\n')}`);
      }
    } catch (err: any) {
      console.error('Failed to validate assignments:', err);
      setError(err.response?.data?.error?.message || 'Failed to validate assignments.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!boardData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Board not found</h1>
            <button
              onClick={() => navigate('/admin')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Back to Admin Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canTriggerAssignment = boardData.paymentStats.paidSquares >= 100 && 
    ['FILLED', 'OPEN'].includes(boardData.board.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{boardData.board.name}</h1>
              <p className="mt-2 text-gray-600">
                Manage payments and board assignments
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleValidateAssignments}
                disabled={actionLoading === 'validation'}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading === 'validation' ? 'Validating...' : 'Validate Assignments'}
              </button>
              {canTriggerAssignment && (
                <button
                  onClick={handleTriggerAssignment}
                  disabled={actionLoading === 'assignment'}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'assignment' ? 'Assigning...' : 'Trigger Assignment'}
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Board Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Squares</dt>
                    <dd className="text-lg font-medium text-gray-900">{boardData.paymentStats.totalSquares}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Paid Squares</dt>
                    <dd className="text-lg font-medium text-gray-900">{boardData.paymentStats.paidSquares}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Squares</dt>
                    <dd className="text-lg font-medium text-gray-900">{boardData.paymentStats.pendingSquares}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${(boardData.paymentStats.paidSquares * boardData.board.pricePerSquare).toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Management */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Payment Management
            </h3>
            
            {boardData.squaresByUser.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No squares claimed</h3>
                <p className="mt-1 text-sm text-gray-500">Users haven't claimed any squares yet.</p>
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Squares
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {boardData.squaresByUser.map((userSquares) => (
                      <tr key={userSquares.user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{userSquares.user.displayName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {userSquares.squares.length} squares
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            {userSquares.paidCount > 0 && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                {userSquares.paidCount} paid
                              </span>
                            )}
                            {userSquares.pendingCount > 0 && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                {userSquares.pendingCount} pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${(userSquares.squares.length * boardData.board.pricePerSquare).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {userSquares.squares.map((square) => (
                              <div key={square.id} className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500">#{square.id.slice(-4)}</span>
                                <button
                                  onClick={() => handlePaymentStatusChange(
                                    square.id, 
                                    square.paymentStatus === 'PAID' ? 'PENDING' : 'PAID'
                                  )}
                                  disabled={actionLoading === square.id}
                                  className={`px-2 py-1 text-xs font-medium rounded ${
                                    square.paymentStatus === 'PAID'
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                  } disabled:opacity-50`}
                                >
                                  {actionLoading === square.id ? '...' : square.paymentStatus}
                                </button>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBoardManagement;