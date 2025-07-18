import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig): Promise<void> {
  console.log('🚀 Starting E2E test setup...');
  
  // Start the application servers (handled by webServer in playwright.config.ts)
  // Wait for servers to be ready
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Create a browser instance for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the application to be ready
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Seed test data by creating admin user and initial board
    await page.goto('http://localhost:3000/register');
    
    // Register admin user
    await page.fill('[data-testid="display-name-input"]', 'Admin User');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="register-submit"]');
    
    // Login as admin
    await page.goto('http://localhost:3000/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-password"]', 'AdminPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    // Create initial test board
    if (await page.locator('[data-testid="create-board-button"]').isVisible()) {
      await page.click('[data-testid="create-board-button"]');
      await page.fill('[data-testid="board-name-input"]', 'E2E Test Board');
      await page.fill('[data-testid="price-per-square-input"]', '25');
      
      // Set payout structure
      await page.fill('[data-testid="round1-payout"]', '25');
      await page.fill('[data-testid="round2-payout"]', '50');
      await page.fill('[data-testid="sweet16-payout"]', '100');
      await page.fill('[data-testid="elite8-payout"]', '200');
      await page.fill('[data-testid="final4-payout"]', '400');
      await page.fill('[data-testid="championship-payout"]', '800');
      
      await page.click('[data-testid="create-board-submit"]');
    }
    
    console.log('✅ E2E test setup completed successfully');
    
  } catch (error) {
    console.error('❌ E2E test setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;