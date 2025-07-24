import { test, expect, devices } from '@playwright/test';

// Test on different mobile devices
const mobileDevices = [
  devices['iPhone 12'],
  devices['iPhone 12 Pro'],
  devices['Pixel 5'],
  devices['Galaxy S21'],
];

mobileDevices.forEach(device => {
  test.describe(`Mobile Responsiveness - ${device.name}`, () => {
    test.use({ ...device });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test.describe('Authentication on Mobile', () => {
      test('should display login form properly on mobile', async ({ page }) => {
        await page.goto('/login');

        // Check form layout
        await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
        await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="login-button"]')).toBeVisible();

        // Check form is properly sized for mobile
        const form = page.locator('[data-testid="login-form"]');
        const formBox = await form.boundingBox();
        expect(formBox?.width).toBeLessThan(device.viewport.width);

        // Check inputs are touch-friendly (minimum 44px height)
        const emailInput = page.locator('[data-testid="email-input"]');
        const inputBox = await emailInput.boundingBox();
        expect(inputBox?.height).toBeGreaterThanOrEqual(44);
      });

      test('should handle mobile keyboard interactions', async ({ page }) => {
        await page.goto('/login');

        // Focus on email input
        await page.focus('[data-testid="email-input"]');
        
        // Type email
        await page.type('[data-testid="email-input"]', 'test@example.com');
        
        // Tab to password field
        await page.keyboard.press('Tab');
        await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
        
        // Type password
        await page.type('[data-testid="password-input"]', 'password123');
        
        // Submit with Enter key
        await page.keyboard.press('Enter');
        
        // Should attempt login
        await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      });
    });

    test.describe('Board List on Mobile', () => {
      test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', 'user@example.com');
        await page.fill('[data-testid="password-input"]', 'password123');
        await page.click('[data-testid="login-button"]');
        await expect(page).toHaveURL('/dashboard');
      });

      test('should display board cards in mobile layout', async ({ page }) => {
        // Check board list is visible
        await expect(page.locator('[data-testid="board-list"]')).toBeVisible();

        // Board cards should stack vertically on mobile
        const boardCards = page.locator('[data-testid="board-card"]');
        const cardCount = await boardCards.count();
        
        if (cardCount > 1) {
          const firstCard = boardCards.nth(0);
          const secondCard = boardCards.nth(1);
          
          const firstBox = await firstCard.boundingBox();
          const secondBox = await secondCard.boundingBox();
          
          // Second card should be below first card (stacked vertically)
          expect(secondBox?.y).toBeGreaterThan(firstBox?.y! + firstBox?.height!);
        }
      });

      test('should have touch-friendly board card interactions', async ({ page }) => {
        const boardCard = page.locator('[data-testid="board-card"]').first();
        
        // Card should be large enough for touch
        const cardBox = await boardCard.boundingBox();
        expect(cardBox?.height).toBeGreaterThanOrEqual(44);
        
        // Tap on card
        await boardCard.tap();
        
        // Should navigate to board detail
        await expect(page).toHaveURL(/\/board\/.+/);
      });
    });

    test.describe('Squares Grid on Mobile', () => {
      test.beforeEach(async ({ page }) => {
        // Login and navigate to board
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', 'user@example.com');
        await page.fill('[data-testid="password-input"]', 'password123');
        await page.click('[data-testid="login-button"]');
        await page.click('[data-testid="board-card"]');
      });

      test('should display 10x10 grid properly on mobile', async ({ page }) => {
        await expect(page.locator('[data-testid="squares-grid"]')).toBeVisible();

        // Grid should fit within viewport width
        const grid = page.locator('[data-testid="squares-grid"]');
        const gridBox = await grid.boundingBox();
        expect(gridBox?.width).toBeLessThanOrEqual(device.viewport.width);

        // Should have 100 squares
        const squares = page.locator('[data-testid="grid-square"]');
        await expect(squares).toHaveCount(100);

        // Each square should be touch-friendly
        const firstSquare = squares.first();
        const squareBox = await firstSquare.boundingBox();
        expect(squareBox?.width).toBeGreaterThanOrEqual(30); // Minimum touch target
        expect(squareBox?.height).toBeGreaterThanOrEqual(30);
      });

      test('should handle touch interactions on grid squares', async ({ page }) => {
        const square = page.locator('[data-testid="grid-square"]').first();
        
        // Tap on square
        await square.tap();
        
        // Should show square details or claim modal
        await expect(page.locator('[data-testid="square-modal"], [data-testid="square-details"]')).toBeVisible();
      });

      test('should support pinch-to-zoom on grid', async ({ page }) => {
        const grid = page.locator('[data-testid="squares-grid"]');
        
        // Get initial grid size
        const initialBox = await grid.boundingBox();
        
        // Simulate pinch gesture (zoom in)
        await page.touchscreen.tap(device.viewport.width / 2, device.viewport.height / 2);
        await page.mouse.wheel(0, -100); // Simulate zoom
        
        // Grid should still be visible and functional
        await expect(grid).toBeVisible();
      });
    });

    test.describe('Mobile Navigation', () => {
      test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', 'user@example.com');
        await page.fill('[data-testid="password-input"]', 'password123');
        await page.click('[data-testid="login-button"]');
      });

      test('should show mobile navigation menu', async ({ page }) => {
        // Should show hamburger menu on mobile
        await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
        
        // Tap menu button
        await page.tap('[data-testid="mobile-menu-button"]');
        
        // Should show navigation menu
        await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
        
        // Should have navigation links
        await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
        await expect(page.locator('[data-testid="nav-profile"]')).toBeVisible();
        await expect(page.locator('[data-testid="nav-logout"]')).toBeVisible();
      });

      test('should navigate using mobile menu', async ({ page }) => {
        // Open mobile menu
        await page.tap('[data-testid="mobile-menu-button"]');
        
        // Tap on profile link
        await page.tap('[data-testid="nav-profile"]');
        
        // Should navigate to profile page
        await expect(page).toHaveURL('/profile');
        
        // Menu should close after navigation
        await expect(page.locator('[data-testid="mobile-nav-menu"]')).not.toBeVisible();
      });
    });

    test.describe('Mobile Forms and Modals', () => {
      test.beforeEach(async ({ page }) => {
        // Login as admin
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', 'admin@example.com');
        await page.fill('[data-testid="password-input"]', 'adminpass123');
        await page.click('[data-testid="login-button"]');
        await page.goto('/admin');
      });

      test('should display board creation form properly on mobile', async ({ page }) => {
        await page.tap('[data-testid="create-board-button"]');
        
        // Modal should be visible and properly sized
        const modal = page.locator('[data-testid="board-creation-modal"]');
        await expect(modal).toBeVisible();
        
        const modalBox = await modal.boundingBox();
        expect(modalBox?.width).toBeLessThanOrEqual(device.viewport.width);
        
        // Form inputs should be touch-friendly
        const nameInput = page.locator('[data-testid="board-name-input"]');
        const inputBox = await nameInput.boundingBox();
        expect(inputBox?.height).toBeGreaterThanOrEqual(44);
      });

      test('should handle mobile form submission', async ({ page }) => {
        await page.tap('[data-testid="create-board-button"]');
        
        // Fill form
        await page.fill('[data-testid="board-name-input"]', 'Mobile Test Board');
        await page.fill('[data-testid="price-per-square-input"]', '10');
        
        // Submit form
        await page.tap('[data-testid="create-board-submit"]');
        
        // Should show success message
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      });
    });

    test.describe('Mobile Performance', () => {
      test('should load quickly on mobile', async ({ page }) => {
        const startTime = Date.now();
        
        await page.goto('/dashboard');
        await expect(page.locator('[data-testid="board-list"]')).toBeVisible();
        
        const loadTime = Date.now() - startTime;
        
        // Should load within 3 seconds on mobile
        expect(loadTime).toBeLessThan(3000);
      });

      test('should handle slow network conditions', async ({ page }) => {
        // Simulate slow 3G network
        await page.route('**/*', async route => {
          await new Promise(resolve => setTimeout(resolve, 100)); // Add delay
          await route.continue();
        });
        
        await page.goto('/dashboard');
        
        // Should show loading states
        await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
        
        // Should eventually load content
        await expect(page.locator('[data-testid="board-list"]')).toBeVisible({ timeout: 10000 });
      });
    });

    test.describe('Mobile Accessibility', () => {
      test('should support screen reader navigation', async ({ page }) => {
        await page.goto('/dashboard');
        
        // Check for proper ARIA labels
        await expect(page.locator('[data-testid="board-card"]')).toHaveAttribute('role', 'button');
        await expect(page.locator('[data-testid="board-card"]')).toHaveAttribute('aria-label');
        
        // Check for proper heading structure
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('h2')).toBeVisible();
      });

      test('should support keyboard navigation on mobile', async ({ page }) => {
        await page.goto('/dashboard');
        
        // Tab through interactive elements
        await page.keyboard.press('Tab');
        await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeFocused();
        
        await page.keyboard.press('Tab');
        await expect(page.locator('[data-testid="board-card"]').first()).toBeFocused();
        
        // Enter should activate focused element
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/\/board\/.+/);
      });
    });

    test.describe('Mobile Gestures', () => {
      test('should support swipe gestures', async ({ page }) => {
        await page.goto('/dashboard');
        
        // Simulate swipe down to refresh
        await page.touchscreen.tap(device.viewport.width / 2, 100);
        await page.mouse.move(device.viewport.width / 2, 100);
        await page.mouse.down();
        await page.mouse.move(device.viewport.width / 2, 300);
        await page.mouse.up();
        
        // Should trigger refresh action
        await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible();
      });

      test('should handle long press interactions', async ({ page }) => {
        await page.goto('/dashboard');
        await page.click('[data-testid="board-card"]');
        
        const square = page.locator('[data-testid="grid-square"]').first();
        
        // Long press on square
        await square.tap({ timeout: 1000 });
        
        // Should show context menu or additional options
        await expect(page.locator('[data-testid="square-context-menu"], [data-testid="square-options"]')).toBeVisible();
      });
    });
  });
});

// Cross-device compatibility tests
test.describe('Cross-Device Compatibility', () => {
  test('should maintain functionality across different screen sizes', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 }, // iPhone SE
      { width: 375, height: 667 }, // iPhone 8
      { width: 414, height: 896 }, // iPhone 11
      { width: 768, height: 1024 }, // iPad
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard');
      
      // Core functionality should work at all sizes
      await expect(page.locator('[data-testid="board-list"]')).toBeVisible();
      
      // Navigation should be accessible
      if (viewport.width < 768) {
        await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      } else {
        await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
      }
    }
  });
});