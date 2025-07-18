import { test, expect } from '@playwright/test';

test.describe('Basic Application Functionality E2E', () => {
  test('application loads and shows expected elements', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Should show the main page
    await expect(page).toHaveTitle(/March Madness Squares/);
    
    // Should have navigation elements
    await expect(page.locator('nav')).toBeVisible();
    
    // Should have login/register links
    await expect(page.locator('text=Login')).toBeVisible();
    await expect(page.locator('text=Register')).toBeVisible();
  });

  test('registration page loads correctly', async ({ page }) => {
    await page.goto('/register');
    
    // Should show registration form
    await expect(page.locator('form')).toBeVisible();
    
    // Should have required form fields
    await expect(page.locator('input[type="text"]')).toBeVisible(); // Display name
    await expect(page.locator('input[type="email"]')).toBeVisible(); // Email
    await expect(page.locator('input[type="password"]')).toBeVisible(); // Password
    
    // Should have submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');
    
    // Should show login form
    await expect(page.locator('form')).toBeVisible();
    
    // Should have email and password fields
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Should have submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Should be responsive
    await expect(page.locator('body')).toBeVisible();
    
    // Navigation should adapt to mobile
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });
});