import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BoardCreationForm from '../BoardCreationForm';
import { createBoard } from '../../services/graphql-admin';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

// Mock the GraphQL service
jest.mock('../../services/graphql-admin', () => ({
  createBoard: jest.fn(),
}));

// Mock the Header component
jest.mock('../Header', () => () => <div data-testid="header">Header</div>);

// Mock the useNetworkStatus hook
jest.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}));

// Mock the navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('BoardCreationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNetworkStatus as jest.Mock).mockReturnValue({ isFullyConnected: true });
  });

  it('renders the form correctly', () => {
    render(
      <MemoryRouter>
        <BoardCreationForm />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Create New Board')).toBeInTheDocument();
    expect(screen.getByLabelText('Board Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Price per Square ($)')).toBeInTheDocument();
    expect(screen.getByLabelText('Round 1 (Games 1-32)')).toBeInTheDocument();
    expect(screen.getByLabelText('Championship (Game 63)')).toBeInTheDocument();
    expect(screen.getByText('Financial Summary')).toBeInTheDocument();
  });

  it('submits the form with valid data', async () => {
    const mockResponse = {
      message: 'Board created successfully',
      board: {
        id: 'new-board-id',
      },
    };
    
    (createBoard as jest.Mock).mockResolvedValue(mockResponse);
    
    render(
      <MemoryRouter>
        <BoardCreationForm />
      </MemoryRouter>
    );
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('Board Name'), {
      target: { value: 'Test Board' },
    });
    
    fireEvent.change(screen.getByLabelText('Price per Square ($)'), {
      target: { value: '15' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Board'));
    
    await waitFor(() => {
      expect(createBoard).toHaveBeenCalledWith({
        name: 'Test Board',
        pricePerSquare: 15,
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

  it('displays validation errors', async () => {
    render(
      <MemoryRouter>
        <BoardCreationForm />
      </MemoryRouter>
    );
    
    // Clear the board name field
    fireEvent.change(screen.getByLabelText('Board Name'), {
      target: { value: '' },
    });
    
    // Set an invalid price
    fireEvent.change(screen.getByLabelText('Price per Square ($)'), {
      target: { value: '-5' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Board'));
    
    await waitFor(() => {
      expect(screen.getByText(/Board name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Price per square must be greater than 0/i)).toBeInTheDocument();
    });
    
    expect(createBoard).not.toHaveBeenCalled();
  });

  it('handles API errors', async () => {
    const errorMessage = 'Board creation failed';
    (createBoard as jest.Mock).mockRejectedValue(new Error(errorMessage));
    
    render(
      <MemoryRouter>
        <BoardCreationForm />
      </MemoryRouter>
    );
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('Board Name'), {
      target: { value: 'Test Board' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Board'));
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('disables form when offline', () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isFullyConnected: false });
    
    render(
      <MemoryRouter>
        <BoardCreationForm />
      </MemoryRouter>
    );
    
    expect(screen.getByLabelText('Board Name')).toBeDisabled();
    expect(screen.getByLabelText('Price per Square ($)')).toBeDisabled();
    expect(screen.getByText('Connection Required')).toBeInTheDocument();
    expect(screen.getByText('Connection issues detected. Please check your network.')).toBeInTheDocument();
  });

  it('calculates financial summary correctly', () => {
    render(
      <MemoryRouter>
        <BoardCreationForm />
      </MemoryRouter>
    );
    
    // Default values
    expect(screen.getByText('$1,000')).toBeInTheDocument(); // Expected Revenue (100 * $10)
    expect(screen.getByText('$1,575')).toBeInTheDocument(); // Total Payouts (25+50+100+200+400+800)
    expect(screen.getByText('-$575')).toBeInTheDocument(); // Net Profit
    expect(screen.getByText('Negative margin')).toBeInTheDocument();
    
    // Change price to make it profitable
    fireEvent.change(screen.getByLabelText('Price per Square ($)'), {
      target: { value: '20' },
    });
    
    expect(screen.getByText('$2,000')).toBeInTheDocument(); // Expected Revenue (100 * $20)
    expect(screen.getByText('$425')).toBeInTheDocument(); // Net Profit
    expect(screen.getByText('Positive margin')).toBeInTheDocument();
  });
});