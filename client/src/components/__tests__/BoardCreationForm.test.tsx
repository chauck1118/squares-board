import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import BoardCreationForm from '../BoardCreationForm';
import { CreateBoardResponse } from '../../types/board';
import { vi } from 'vitest';

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    createBoard: vi.fn(),
  },
}));

import { apiService } from '../../services/api';
const mockCreateBoard = vi.mocked(apiService.createBoard);

// Mock the AuthContext
const mockAuthContext = {
  user: {
    id: '1',
    email: 'admin@test.com',
    displayName: 'Admin User',
    isAdmin: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  token: 'mock-token',
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
  isAuthenticated: true,
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('BoardCreationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the board creation form', () => {
    renderWithRouter(<BoardCreationForm />);

    expect(screen.getByText('Create New Board')).toBeInTheDocument();
    expect(screen.getByLabelText('Board Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Price per Square ($)')).toBeInTheDocument();
    expect(screen.getByText('Payout Structure')).toBeInTheDocument();
  });

  it('displays default payout values', () => {
    renderWithRouter(<BoardCreationForm />);

    expect(screen.getByDisplayValue('25')).toBeInTheDocument(); // Round 1
    expect(screen.getByDisplayValue('50')).toBeInTheDocument(); // Round 2
    expect(screen.getByDisplayValue('100')).toBeInTheDocument(); // Sweet 16
    expect(screen.getByDisplayValue('200')).toBeInTheDocument(); // Elite 8
    expect(screen.getByDisplayValue('400')).toBeInTheDocument(); // Final 4
    expect(screen.getByDisplayValue('800')).toBeInTheDocument(); // Championship
  });

  it('calculates financial summary correctly', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BoardCreationForm />);

    // Change price per square to $20
    const priceInput = screen.getByLabelText('Price per Square ($)');
    await user.clear(priceInput);
    await user.type(priceInput, '20');

    // Check expected revenue (100 squares * $20)
    expect(screen.getByText('$2,000')).toBeInTheDocument();

    // Check total payouts (sum of default payouts: 25+50+100+200+400+800 = 1575)
    expect(screen.getByText('$1,575')).toBeInTheDocument();

    // Check net profit (2000 - 1575 = 425)
    expect(screen.getByText('$425')).toBeInTheDocument();
  });

  it('shows validation error for empty board name', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BoardCreationForm />);

    const submitButton = screen.getByText('Create Board');
    await user.click(submitButton);

    expect(screen.getByText('Board name is required')).toBeInTheDocument();
  });

  it('shows validation error for invalid price', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BoardCreationForm />);

    const nameInput = screen.getByLabelText('Board Name');
    const priceInput = screen.getByLabelText('Price per Square ($)');
    const submitButton = screen.getByText('Create Board');

    await user.type(nameInput, 'Test Board');
    await user.clear(priceInput);
    await user.type(priceInput, '0');
    await user.click(submitButton);

    expect(screen.getByText('Price per square must be greater than 0')).toBeInTheDocument();
  });

  it('successfully creates a board', async () => {
    const user = userEvent.setup();
    const mockResponse: CreateBoardResponse = {
      message: 'Board created successfully',
      board: {
        id: 'new-board-id',
        name: 'Test Board',
        pricePerSquare: 10,
        status: 'OPEN',
        totalSquares: 0,
        claimedSquares: 0,
        paidSquares: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };

    mockCreateBoard.mockResolvedValue(mockResponse);

    renderWithRouter(<BoardCreationForm />);

    const nameInput = screen.getByLabelText('Board Name');
    const submitButton = screen.getByText('Create Board');

    await user.type(nameInput, 'Test Board');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateBoard).toHaveBeenCalledWith({
        name: 'Test Board',
        pricePerSquare: 10,
        payoutStructure: {
          round1: 25,
          round2: 50,
          sweet16: 100,
          elite8: 200,
          final4: 400,
          championship: 800,
        },
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/admin/boards/new-board-id');
  });

  it('handles API error during board creation', async () => {
    const user = userEvent.setup();
    mockCreateBoard.mockRejectedValue({
      response: {
        data: {
          error: {
            message: 'Board name already exists',
          },
        },
      },
    });

    renderWithRouter(<BoardCreationForm />);

    const nameInput = screen.getByLabelText('Board Name');
    const submitButton = screen.getByText('Create Board');

    await user.type(nameInput, 'Test Board');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Board name already exists')).toBeInTheDocument();
    });
  });

  it('updates payout values correctly', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BoardCreationForm />);

    const round1Input = screen.getByDisplayValue('25');
    await user.clear(round1Input);
    await user.type(round1Input, '30');

    // Check that the total payout updated (30+50+100+200+400+800 = 1580)
    expect(screen.getByText('$1,580')).toBeInTheDocument();
  });

  it('navigates back to admin dashboard when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BoardCreationForm />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  it('shows loading state during form submission', async () => {
    const user = userEvent.setup();
    mockCreateBoard.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithRouter(<BoardCreationForm />);

    const nameInput = screen.getByLabelText('Board Name');
    const submitButton = screen.getByText('Create Board');

    await user.type(nameInput, 'Test Board');
    await user.click(submitButton);

    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});