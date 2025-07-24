import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminBoardManagement from '../AdminBoardManagement';
import { getBoardWithPaymentStatus, updateSquarePayment, triggerBoardAssignment, validateBoardAssignments } from '../../services/graphql-admin';
import { PaymentStatus } from '../../types/amplify-models';

// Mock the GraphQL service
jest.mock('../../services/graphql-admin', () => ({
  getBoardWithPaymentStatus: jest.fn(),
  updateSquarePayment: jest.fn(),
  triggerBoardAssignment: jest.fn(),
  validateBoardAssignments: jest.fn(),
}));

// Mock the Header component
jest.mock('../Header', () => () => <div data-testid="header">Header</div>);

// Mock window.alert
const mockAlert = jest.fn();
window.alert = mockAlert;

describe('AdminBoardManagement', () => {
  const mockBoardData = {
    board: {
      id: 'board1',
      name: 'Test Board',
      status: 'OPEN',
      pricePerSquare: 10,
    },
    paymentStats: {
      totalSquares: 50,
      paidSquares: 30,
      pendingSquares: 20,
    },
    squaresByUser: [
      {
        user: {
          id: 'user1',
          displayName: 'Test User 1',
        },
        squares: [
          {
            id: 'square1',
            paymentStatus: PaymentStatus.PAID,
            gridPosition: null,
            createdAt: '2025-07-01T12:00:00Z',
          },
          {
            id: 'square2',
            paymentStatus: PaymentStatus.PENDING,
            gridPosition: null,
            createdAt: '2025-07-01T12:00:00Z',
          },
        ],
        paidCount: 1,
        pendingCount: 1,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (getBoardWithPaymentStatus as jest.Mock).mockReturnValue(new Promise(() => {}));
    
    render(
      <MemoryRouter initialEntries={['/admin/boards/board1']}>
        <Routes>
          <Route path="/admin/boards/:id" element={<AdminBoardManagement />} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders board data when loaded', async () => {
    (getBoardWithPaymentStatus as jest.Mock).mockResolvedValue(mockBoardData);
    
    render(
      <MemoryRouter initialEntries={['/admin/boards/board1']}>
        <Routes>
          <Route path="/admin/boards/:id" element={<AdminBoardManagement />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
      expect(screen.getByText('Test User 1')).toBeInTheDocument();
      expect(screen.getByText('2 squares')).toBeInTheDocument();
      expect(screen.getByText('1 paid')).toBeInTheDocument();
      expect(screen.getByText('1 pending')).toBeInTheDocument();
      expect(screen.getByText('$20')).toBeInTheDocument(); // Total amount (2 squares * $10)
    });
    
    // Check statistics
    expect(screen.getByText('30')).toBeInTheDocument(); // Paid squares
    expect(screen.getByText('20')).toBeInTheDocument(); // Pending squares
    expect(screen.getByText('$300')).toBeInTheDocument(); // Revenue (30 * $10)
  });

  it('handles payment status change', async () => {
    (getBoardWithPaymentStatus as jest.Mock).mockResolvedValue(mockBoardData);
    (updateSquarePayment as jest.Mock).mockResolvedValue({});
    
    render(
      <MemoryRouter initialEntries={['/admin/boards/board1']}>
        <Routes>
          <Route path="/admin/boards/:id" element={<AdminBoardManagement />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('PAID')).toBeInTheDocument();
    });
    
    // Click on the PAID button to change status to PENDING
    fireEvent.click(screen.getByText('PAID'));
    
    expect(updateSquarePayment).toHaveBeenCalledWith('square1', PaymentStatus.PENDING);
    
    // Click on the PENDING button to change status to PAID
    await waitFor(() => {
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('PENDING'));
    
    expect(updateSquarePayment).toHaveBeenCalledWith('square2', PaymentStatus.PAID);
  });

  it('handles trigger assignment', async () => {
    const fullBoardData = {
      ...mockBoardData,
      paymentStats: {
        ...mockBoardData.paymentStats,
        paidSquares: 100,
      },
    };
    
    (getBoardWithPaymentStatus as jest.Mock).mockResolvedValue(fullBoardData);
    (triggerBoardAssignment as jest.Mock).mockResolvedValue({
      message: 'Assignment successful',
    });
    
    render(
      <MemoryRouter initialEntries={['/admin/boards/board1']}>
        <Routes>
          <Route path="/admin/boards/:id" element={<AdminBoardManagement />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Trigger Assignment')).toBeInTheDocument();
    });
    
    // Click on the Trigger Assignment button
    fireEvent.click(screen.getByText('Trigger Assignment'));
    
    expect(triggerBoardAssignment).toHaveBeenCalledWith('board1');
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Assignment completed! Assignment successful');
    });
  });

  it('handles validate assignments', async () => {
    (getBoardWithPaymentStatus as jest.Mock).mockResolvedValue(mockBoardData);
    (validateBoardAssignments as jest.Mock).mockResolvedValue({
      valid: true,
    });
    
    render(
      <MemoryRouter initialEntries={['/admin/boards/board1']}>
        <Routes>
          <Route path="/admin/boards/:id" element={<AdminBoardManagement />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Validate Assignments')).toBeInTheDocument();
    });
    
    // Click on the Validate Assignments button
    fireEvent.click(screen.getByText('Validate Assignments'));
    
    expect(validateBoardAssignments).toHaveBeenCalledWith('board1');
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('All assignments are valid!');
    });
  });

  it('handles error state', async () => {
    (getBoardWithPaymentStatus as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(
      <MemoryRouter initialEntries={['/admin/boards/board1']}>
        <Routes>
          <Route path="/admin/boards/:id" element={<AdminBoardManagement />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load board data. Please try again.')).toBeInTheDocument();
    });
  });

  it('renders not found state when board does not exist', async () => {
    (getBoardWithPaymentStatus as jest.Mock).mockResolvedValue(null);
    
    render(
      <MemoryRouter initialEntries={['/admin/boards/nonexistent']}>
        <Routes>
          <Route path="/admin/boards/:id" element={<AdminBoardManagement />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Board not found')).toBeInTheDocument();
    });
  });
});