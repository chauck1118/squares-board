import { describe, it, expect } from 'vitest';
import { Amplify } from 'aws-amplify';

/**
 * Test AWS Amplify setup and configuration
 */
describe('AWS Amplify Setup', () => {
  it('should have Amplify library available', () => {
    expect(Amplify).toBeDefined();
    expect(typeof Amplify.configure).toBe('function');
  });

  it('should have amplify configuration file', async () => {
    // Check if amplify_outputs.json exists
    const configExists = await import('../../../amplify_outputs.json')
      .then(() => true)
      .catch(() => false);
    
    expect(configExists).toBe(true);
  });

  it('should have auth service functions available', async () => {
    const authService = await import('../services/auth');
    
    expect(typeof authService.registerUser).toBe('function');
    expect(typeof authService.loginUser).toBe('function');
    expect(typeof authService.logoutUser).toBe('function');
    expect(typeof authService.getAuthenticatedUser).toBe('function');
    expect(typeof authService.isAuthenticated).toBe('function');
  });

  it('should have amplify client service available', async () => {
    const clientService = await import('../services/amplify-client');
    
    expect(clientService.client).toBeDefined();
  });
});