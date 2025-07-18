import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SquareClaimModal from '../components/SquareClaimModal';
import { BoardDetail, Square } from '../types/board';

// Mock data
const mockBoard: BoardDetail = {
  id: '1',
  name: 'Test Board',
  pricePerSquare: 10,
  status: 'OPEN',
  claimedSquares: 50,
  paidSquares: 40,
  payoutStructure: {
    round1: 25,
    round2: 50,
    sweet16: 100,
    elite8: 200,
    final4: 400,
    championship: 800,
  },
  squares: [],
  games: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockUserSquares: Square[] = [
  {
    id: '1',
    boardId: '1',
    userId: 'user1',
    gridPosition: 0,
    paymentStatus: 'PAID',
    winningTeamNumber: null,
    losingTeamNumber: null,
    createdAt: new Date().toISOString(),
  },
];

// Mock window.matchMedia for responsive testing
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('Responsive Design Tests', () => {
  beforeEach(() => {
    // Reset viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Mobile Layout (< 768px)', () => {
    beforeEach(() => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      mockMatchMedia(true); // Matches mobile media query
    });

    it('should render mobile-optimized modal', async () => {
      const mockOnClaim = vi.fn().mockResolvedValue(undefined);
      const mockOnClose = vi.fn();

      render(
        <BrowserRouter>
          <SquareClaimModal
            board={mockBoard}
            userSquares={mockUserSquares}
            onClaim={mockOnClaim}
            onClose={mockOnClose}
            isLoading={false}
          />
        </BrowserRouter>
      );

      // Check for mobile-specific classes
      const modal = screen.getByRole('dialog', { hidden: true }) || 
                   document.querySelector('.mobile-modal');
      expect(modal).toBeInTheDocument();

      // Check for mobile-optimized button sizes
      const buttons = screen.getAllByRole('button');
      const claimButton = buttons.find(btn => 
        btn.textContent?.includes('Claim') && !btn.textContent?.includes('Cancel')
      );
      
      expect(claimButton).toHaveClass('touch-manipulation');
    });

    it('should have larger touch targets on mobile', () => {
      const mockOnClaim = vi.fn().mockResolvedValue(undefined);
      const mockOnClose = vi.fn();

      render(
        <BrowserRouter>
          <SquareClaimModal
            board={mockBoard}
            userSquares={mockUserSquares}
            onClaim={mockOnClaim}
            onClose={mockOnClose}
            isLoading={false}
          />
        </BrowserRouter>
      );

      // Check increment/decrement buttons have mobile-friendly sizes
      const incrementButton = screen.getByRole('button', { name: '+' });
      const decrementButton = screen.getByRole('button', { name: '-' });

      // These should have larger touch targets on mobile
      expect(incrementButton).toHaveClass('w-10', 'h-10');
      expect(decrementButton).toHaveClass('w-10', 'h-10');
    });

    it('should stack form elements vertically on mobile', () => {
      const mockOnClaim = vi.fn().mockResolvedValue(undefined);
      const mockOnClose = vi.fn();

      render(
        <BrowserRouter>
          <SquareClaimModal
            board={mockBoard}
            userSquares={mockUserSquares}
            onClaim={mockOnClaim}
            onClose={mockOnClose}
            isLoading={false}
          />
        </BrowserRouter>
      );

      // Check for mobile stacking classes
      const actionContainer = document.querySelector('.flex-col');
      expect(actionContainer).toBeInTheDocument();
    });
  });

  describe('Tablet Layout (768px - 1024px)', () => {
    beforeEach(() => {
      // Set tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      mockMatchMedia(false); // Doesn't match mobile media query
    });

    it('should use medium-sized touch targets on tablet', () => {
      const mockOnClaim = vi.fn().mockResolvedValue(undefined);
      const mockOnClose = vi.fn();

      render(
        <BrowserRouter>
          <SquareClaimModal
            board={mockBoard}
            userSquares={mockUserSquares}
            onClaim={mockOnClaim}
            onClose={mockOnClose}
            isLoading={false}
          />
        </BrowserRouter>
      );

      // Check for tablet-optimized sizes
      const incrementButton = screen.getByRole('button', { name: '+' });
      const decrementButton = screen.getByRole('button', { name: '-' });

      // Should fall back to smaller desktop sizes on tablet
      expect(incrementButton).toHaveClass('sm:w-8', 'sm:h-8');
      expect(decrementButton).toHaveClass('sm:w-8', 'sm:h-8');
    });
  });

  describe('Desktop Layout (> 1024px)', () => {
    beforeEach(() => {
      // Set desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });
      mockMatchMedia(false);
    });

    it('should use horizontal layout on desktop', () => {
      const mockOnClaim = vi.fn().mockResolvedValue(undefined);
      const mockOnClose = vi.fn();

      render(
        <BrowserRouter>
          <SquareClaimModal
            board={mockBoard}
            userSquares={mockUserSquares}
            onClaim={mockOnClaim}
            onClose={mockOnClose}
            isLoading={false}
          />
        </BrowserRouter>
      );

      // Check for desktop horizontal layout
      const actionContainer = document.querySelector('.sm\\:flex-row');
      expect(actionContainer).toBeInTheDocument();
    });

    it('should use smaller button sizes on desktop', () => {
      const mockOnClaim = vi.fn().mockResolvedValue(undefined);
      const mockOnClose = vi.fn();

      render(
        <BrowserRouter>
          <SquareClaimModal
            board={mockBoard}
            userSquares={mockUserSquares}
            onClaim={mockOnClaim}
            onClose={mockOnClose}
            isLoading={false}
          />
        </BrowserRouter>
      );

      // Check for desktop-optimized sizes
      const incrementButton = screen.getByRole('button', { name: '+' });
      const decrementButton = screen.getByRole('button', { name: '-' });

      expect(incrementButton).toHaveClass('sm:w-8', 'sm:h-8');
      expect(decrementButton).toHaveClass('sm:w-8', 'sm:h-8');
    });
  });

  describe('Touch Interactions', () => {
    it('should handle touch events on mobile', async () => {
      const mockOnClaim = vi.fn().mockResolvedValue(undefined);
      const mockOnClose = vi.fn();

      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
      });

      render(
        <BrowserRouter>
          <SquareClaimModal
            board={mockBoard}
            userSquares={mockUserSquares}
            onClaim={mockOnClaim}
            onClose={mockOnClose}
            isLoading={false}
          />
        </BrowserRouter>
      );

      const incrementButton = screen.getByRole('button', { name: '+' });

      // Simulate touch interaction
      fireEvent.touchStart(incrementButton);
      fireEvent.touchEnd(incrementButton);
      fireEvent.click(incrementButton);

      // Should update the number input
      const numberInput = screen.getByRole('spinbutton');
      expect(numberInput).toHaveValue(2); // Should increment from default 1
    });

    it('should prevent double-tap zoom on touch elements', () => {
      const mockOnClaim = vi.fn().mockResolvedValue(undefined);
      const mockOnClose = vi.fn();

      render(
        <BrowserRouter>
          <SquareClaimModal
            board={mockBoard}
            userSquares={mockUserSquares}
            onClaim={mockOnClaim}
            onClose={mockOnClose}
            isLoading={false}
          />
        </BrowserRouter>
      );

      // Check for touch-manipulation class to prevent zoom
      const touchElements = document.querySelectorAll('.touch-manipulation');
      expect(touchElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility on Different Screen Sizes', () => {
    it('should maintain accessibility on mobile', () => {
      const mockOnClaim = vi.fn().mockResolvedValue(undefined);
      const mockOnClose = vi.fn();

      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
      });

      render(
        <BrowserRouter>
          <SquareClaimModal
            board={mockBoard}
            userSquares={mockUserSquares}
            onClaim={mockOnClaim}
            onClose={mockOnClose}
            isLoading={false}
          />
        </BrowserRouter>
      );

      // Check for proper ARIA labels
      const numberInput = screen.getByRole('spinbutton');
      expect(numberInput).toHaveAccessibleName();

      // Check for proper button labels
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should have proper focus management on all screen sizes', async () => {
      const mockOnClaim = vi.fn().mockResolvedValue(undefined);
      const mockOnClose = vi.fn();

      render(
        <BrowserRouter>
          <SquareClaimModal
            board={mockBoard}
            userSquares={mockUserSquares}
            onClaim={mockOnClaim}
            onClose={mockOnClose}
            isLoading={false}
          />
        </BrowserRouter>
      );

      // Check that focusable elements have proper focus styles
      const focusableElements = document.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])'
      );

      focusableElements.forEach(element => {
        // Should have focus styles
        expect(element).toHaveClass(/focus:/);
      });
    });
  });

  describe('Viewport Meta Tag', () => {
    it('should have proper viewport meta tag for mobile', () => {
      // This would typically be tested in an E2E test
      // Here we can check if the component renders without layout issues
      const mockOnClaim = vi.fn().mockResolvedValue(undefined);
      const mockOnClose = vi.fn();

      const { container } = render(
        <BrowserRouter>
          <SquareClaimModal
            board={mockBoard}
            userSquares={mockUserSquares}
            onClaim={mockOnClaim}
            onClose={mockOnClose}
            isLoading={false}
          />
        </BrowserRouter>
      );

      // Check that content doesn't overflow on small screens
      const modal = container.querySelector('.mobile-modal-content');
      expect(modal).toBeInTheDocument();
    });
  });
});