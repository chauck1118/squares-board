import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { AuthProvider } from '../contexts/AuthContext';
import SquaresGrid from '../components/SquaresGrid';
import ScoringTable from '../components/ScoringTable';
import AdminDashboard from '../components/AdminDashboard';
import SquareClaimModal from '../components/SquareClaimModal';
import { BoardDetail, Square, Game, PayoutStructure } from '../types/board';

// Mock API service
vi.mock('../services/api', () => ({
  apiService: {
    getBoards: vi.fn().mockResolvedValue({
      boards: [
        {
          id: '1',
          name: 'Test Board 1',
          status: 'OPEN',
          pricePerSquare: 10,
          claimedSquares: 25,
          paidSquares: 20,
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'Test Board 2',
          status: 'ACTIVE',
          pricePerSquare: 20,
          claimedSquares: 100,
          paidSquares: 100,
          createdAt: '2024-01-02T00:00:00Z'
        }
      ]
    })
  }
}));

// Mock auth context
const mockAuthContext = {
  user: {
    id: '1',
    displayName: 'Test User',
    email: 'test@example.com',
    isAdmin: true
  },
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isLoading: false
};

vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext
}));

// Helper to render components with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

// Mock data
const mockBoard: BoardDetail = {
  id: '1',
  name: 'Test Board',
  status: 'ASSIGNED',
  pricePerSquare: 10,
  claimedSquares: 50,
  paidSquares: 45,
  squares: Array.from({ length: 50 }, (_, i) => ({
    id: `square-${i}`,
    boardId: '1',
    userId: i < 5 ? '1' : `user-${i}`,
    gridPosition: i,
    paymentStatus: i < 45 ? 'PAID' : 'PENDING',
    winningTeamNumber: null,
    losingTeamNumber: null,
    createdAt: '2024-01-01T00:00:00Z',
    user: {
      id: i < 5 ? '1' : `user-${i}`,
      displayName: i < 5 ? 'Test User' : `User ${i}`,
      email: `user${i}@example.com`,
      isAdmin: false
    }
  })),
  payoutStructure: {
    id: '1',
    boardId: '1',
    round1: 25,
    round2: 50,
    sweet16: 100,
    elite8: 200,
    final4: 400,
    championship: 800
  }
};

const mockUserSquares: Square[] = mockBoard.squares.slice(0, 5);

const mockGames: Game[] = [
  {
    id: '1',
    boardId: '1',
    gameNumber: 1,
    round: 'Round 1',
    team1: 'Duke',
    team2: 'UNC',
    team1Score: 78,
    team2Score: 74,
    status: 'COMPLETED',
    winnerSquareId: 'square-1',
    scheduledTime: '2024-03-21T20:00:00Z',
    winnerSquare: mockBoard.squares[1],
    payout: 25
  },
  {
    id: '2',
    boardId: '1',
    gameNumber: 2,
    round: 'Round 1',
    team1: 'Kansas',
    team2: 'Kentucky',
    team1Score: null,
    team2Score: null,
    status: 'SCHEDULED',
    winnerSquareId: null,
    scheduledTime: '2024-03-21T22:00:00Z',
    winnerSquare: null,
    payout: null
  }
];

describe('Mobile Responsive Design Tests', () => {
  beforeEach(() => {
    // Set mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
  });

  describe('SquaresGrid Mobile Optimization', () => {
    it('should have proper touch targets for mobile', () => {
      render(
        <SquaresGrid 
          board={mockBoard} 
          userSquares={mockUserSquares}
          currentUserId="1"
        />
      );

      // Check that squares have minimum touch target size
      const squares = screen.getAllByRole('button');
      squares.forEach(square => {
        expect(square).toHaveClass('min-h-[32px]', 'min-w-[32px]');
        expect(square).toHaveClass('touch-manipulation');
        expect(square).toHaveClass('select-none'); // Prevent text selection on touch
      });
    });

    it('should be horizontally scrollable on mobile', () => {
      render(
        <SquaresGrid 
          board={mockBoard} 
          userSquares={mockUserSquares}
          currentUserId="1"
        />
      );

      const scrollContainer = screen.getByText('How the Grid Works').closest('.overflow-x-auto');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('should have responsive square sizes', () => {
      render(
        <SquaresGrid 
          board={mockBoard} 
          userSquares={mockUserSquares}
          currentUserId="1"
        />
      );

      const squares = screen.getAllByRole('button');
      // Check that squares have responsive sizing classes
      squares.forEach(square => {
        expect(square).toHaveClass('w-8', 'h-8', 'sm:w-10', 'sm:h-10', 'md:w-12', 'md:h-12');
      });
    });

    it('should have proper active states for touch', () => {
      render(
        <SquaresGrid 
          board={mockBoard} 
          userSquares={mockUserSquares}
          currentUserId="1"
        />
      );

      const squares = screen.getAllByRole('button');
      squares.forEach(square => {
        // Check for active state classes
        expect(square.className).toMatch(/active:bg-/);
        expect(square).toHaveClass('active:scale-95');
      });
    });
  });

  describe('ScoringTable Mobile Layout', () => {
    it('should show mobile card layout on small screens', () => {
      render(
        <ScoringTable 
          games={mockGames}
          payoutStructure={mockBoard.payoutStructure}
        />
      );

      // Mobile layout should be visible
      const mobileLayout = document.querySelector('.block.sm\\:hidden');
      expect(mobileLayout).toBeInTheDocument();

      // Desktop table should be hidden on mobile
      const desktopLayout = document.querySelector('.hidden.sm\\:block');
      expect(desktopLayout).toBeInTheDocument();
    });

    it('should display game information in mobile cards', () => {
      render(
        <ScoringTable 
          games={mockGames}
          payoutStructure={mockBoard.payoutStructure}
        />
      );

      // Check for mobile card content
      expect(screen.getByText('Game #1')).toBeInTheDocument();
      expect(screen.getAllByText('Duke')[0]).toBeInTheDocument(); // Multiple instances due to mobile and desktop layouts
      expect(screen.getAllByText('UNC')[0]).toBeInTheDocument();
      expect(screen.getAllByText('78-74')[0]).toBeInTheDocument();
    });

    it('should have proper spacing in mobile cards', () => {
      render(
        <ScoringTable 
          games={mockGames}
          payoutStructure={mockBoard.payoutStructure}
        />
      );

      const mobileCards = document.querySelectorAll('.bg-gray-50.rounded-lg.p-4');
      expect(mobileCards.length).toBeGreaterThan(0);
    });
  });

  describe('AdminDashboard Mobile Layout', () => {
    it('should show mobile card layout for boards', async () => {
      renderWithRouter(<AdminDashboard />);

      // Wait for boards to load
      await waitFor(() => {
        expect(screen.getAllByText('Test Board 1')[0]).toBeInTheDocument();
      });

      // Mobile layout should be visible
      const mobileLayout = document.querySelector('.block.sm\\:hidden');
      expect(mobileLayout).toBeInTheDocument();

      // Desktop table should be hidden on mobile
      const desktopLayout = document.querySelector('.hidden.sm\\:block');
      expect(desktopLayout).toBeInTheDocument();
    });

    it('should have responsive header layout', async () => {
      renderWithRouter(<AdminDashboard />);

      // Wait for the dashboard to fully load
      await waitFor(() => {
        expect(screen.getAllByText('Test Board 1')[0]).toBeInTheDocument();
      });

      // Find the header container with the responsive classes
      const headerContainer = document.querySelector('.flex.flex-col.space-y-4.sm\\:flex-row');
      expect(headerContainer).toBeInTheDocument();
    });

    it('should have full-width buttons on mobile', async () => {
      renderWithRouter(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getAllByText('Create New Board')[0]).toBeInTheDocument();
      });

      const createButton = screen.getAllByText('Create New Board')[0];
      expect(createButton).toHaveClass('w-full', 'sm:w-auto');
      expect(createButton).toHaveClass('touch-manipulation');
    });

    it('should display board statistics in mobile cards', async () => {
      renderWithRouter(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Board 1')[0]).toBeInTheDocument();
      });

      // Check for mobile card elements
      const priceElements = screen.getAllByText('Price:');
      const squareElements = screen.getAllByText('Squares:');
      
      expect(priceElements.length).toBeGreaterThan(0);
      expect(squareElements.length).toBeGreaterThan(0);
    });
  });

  describe('SquareClaimModal Mobile Optimization', () => {
    it('should use mobile modal classes', () => {
      render(
        <SquareClaimModal
          board={mockBoard}
          userSquares={mockUserSquares}
          onClaim={vi.fn()}
          onClose={vi.fn()}
          isLoading={false}
        />
      );

      const modal = document.querySelector('.mobile-modal');
      const modalContent = document.querySelector('.mobile-modal-content');
      
      expect(modal).toBeInTheDocument();
      expect(modalContent).toBeInTheDocument();
    });

    it('should have larger touch targets for controls', () => {
      render(
        <SquareClaimModal
          board={mockBoard}
          userSquares={mockUserSquares}
          onClaim={vi.fn()}
          onClose={vi.fn()}
          isLoading={false}
        />
      );

      const minusButton = screen.getByRole('button', { name: '-' });
      const plusButton = screen.getByRole('button', { name: '+' });
      
      expect(minusButton).toHaveClass('w-10', 'h-10', 'touch-manipulation');
      expect(plusButton).toHaveClass('w-10', 'h-10', 'touch-manipulation');
    });

    it('should stack action buttons vertically on mobile', () => {
      render(
        <SquareClaimModal
          board={mockBoard}
          userSquares={mockUserSquares}
          onClaim={vi.fn()}
          onClose={vi.fn()}
          isLoading={false}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const buttonContainer = cancelButton.closest('.flex');
      
      expect(buttonContainer).toHaveClass('flex-col', 'sm:flex-row');
    });

    it('should have larger input field on mobile', () => {
      render(
        <SquareClaimModal
          board={mockBoard}
          userSquares={mockUserSquares}
          onClaim={vi.fn()}
          onClose={vi.fn()}
          isLoading={false}
        />
      );

      const numberInput = screen.getByRole('spinbutton');
      expect(numberInput).toHaveClass('py-3', 'sm:py-2');
      expect(numberInput).toHaveClass('text-lg', 'sm:text-base');
    });
  });

  describe('Touch Interaction Enhancements', () => {
    it('should have touch-manipulation on interactive elements', () => {
      render(
        <SquareClaimModal
          board={mockBoard}
          userSquares={mockUserSquares}
          onClaim={vi.fn()}
          onClose={vi.fn()}
          isLoading={false}
        />
      );

      // Check specific buttons that should have touch-manipulation
      const minusButton = screen.getByRole('button', { name: '-' });
      const plusButton = screen.getByRole('button', { name: '+' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const claimButton = screen.getByRole('button', { name: /Claim \d+ Square/ });
      
      expect(minusButton).toHaveClass('touch-manipulation');
      expect(plusButton).toHaveClass('touch-manipulation');
      expect(cancelButton).toHaveClass('touch-manipulation');
      expect(claimButton).toHaveClass('touch-manipulation');
    });

    it('should prevent text selection on grid squares', () => {
      render(
        <SquaresGrid 
          board={mockBoard} 
          userSquares={mockUserSquares}
          currentUserId="1"
        />
      );

      const squares = screen.getAllByRole('button');
      squares.forEach(square => {
        expect(square).toHaveClass('select-none');
      });
    });

    it('should have proper active states for touch feedback', () => {
      render(
        <SquaresGrid 
          board={mockBoard} 
          userSquares={mockUserSquares}
          currentUserId="1"
        />
      );

      const squares = screen.getAllByRole('button');
      squares.forEach(square => {
        expect(square).toHaveClass('active:scale-95');
        expect(square.className).toMatch(/active:bg-/);
      });
    });
  });

  describe('Responsive Typography', () => {
    it('should use responsive text sizes', async () => {
      renderWithRouter(<AdminDashboard />);

      // Wait for the dashboard to fully load
      await waitFor(() => {
        expect(screen.getAllByText('Test Board 1')[0]).toBeInTheDocument();
      });

      // Find the h1 element with Admin Dashboard text - get all and find the one with responsive classes
      const titles = screen.getAllByText('Admin Dashboard');
      const mainTitle = titles.find(title => title.classList.contains('text-2xl'));
      expect(mainTitle).toHaveClass('text-2xl', 'sm:text-3xl');
    });
  });

  describe('Mobile Form Optimization', () => {
    it('should have larger form inputs on mobile', () => {
      render(
        <SquareClaimModal
          board={mockBoard}
          userSquares={mockUserSquares}
          onClaim={vi.fn()}
          onClose={vi.fn()}
          isLoading={false}
        />
      );

      const numberInput = screen.getByRole('spinbutton');
      expect(numberInput).toHaveClass('py-3', 'sm:py-2');
    });

    it('should have proper button sizing on mobile', () => {
      render(
        <SquareClaimModal
          board={mockBoard}
          userSquares={mockUserSquares}
          onClaim={vi.fn()}
          onClose={vi.fn()}
          isLoading={false}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const claimButton = screen.getByRole('button', { name: /Claim \d+ Square/ });
      
      expect(cancelButton).toHaveClass('py-3', 'sm:py-2');
      expect(claimButton).toHaveClass('py-3', 'sm:py-2');
    });
  });

  describe('Cross-browser Compatibility', () => {
    it('should use standard CSS properties for touch', () => {
      render(
        <SquaresGrid 
          board={mockBoard} 
          userSquares={mockUserSquares}
          currentUserId="1"
        />
      );

      const squares = screen.getAllByRole('button');
      squares.forEach(square => {
        expect(square).toHaveClass('touch-manipulation');
      });
    });

    it('should use flexbox for responsive layouts', async () => {
      renderWithRouter(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      const flexContainers = document.querySelectorAll('.flex');
      expect(flexContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility on Mobile', () => {
    it('should have proper ARIA labels on grid squares', () => {
      render(
        <SquaresGrid 
          board={mockBoard} 
          userSquares={mockUserSquares}
          currentUserId="1"
        />
      );

      const squares = screen.getAllByRole('button');
      squares.forEach(square => {
        expect(square).toHaveAttribute('aria-label');
      });
    });

    it('should support keyboard navigation', () => {
      render(
        <SquaresGrid 
          board={mockBoard} 
          userSquares={mockUserSquares}
          currentUserId="1"
        />
      );

      const squares = screen.getAllByRole('button');
      squares.forEach(square => {
        expect(square).toHaveAttribute('tabIndex', '0');
      });
    });
  });
});