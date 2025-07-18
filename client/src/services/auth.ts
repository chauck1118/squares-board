import { signUp, signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

/**
 * AWS Amplify Auth service for March Madness Squares
 * Provides authentication operations using AWS Cognito
 */

export interface SignUpParams {
  email: string;
  password: string;
  displayName: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  isAdmin?: boolean;
}

/**
 * Register a new user
 */
export const registerUser = async ({ email, password, displayName }: SignUpParams): Promise<void> => {
  await signUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        'custom:displayName': displayName,
      },
    },
  });
};

/**
 * Sign in user
 */
export const loginUser = async ({ email, password }: SignInParams): Promise<void> => {
  await signIn({
    username: email,
    password,
  });
};

/**
 * Sign out user
 */
export const logoutUser = async (): Promise<void> => {
  await signOut();
};

/**
 * Get current authenticated user
 */
export const getAuthenticatedUser = async (): Promise<AuthUser | null> => {
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    
    return {
      id: user.userId,
      email: user.signInDetails?.loginId || '',
      displayName: user.signInDetails?.loginId || '',
      isAdmin: false, // Will be determined from user groups
    };
  } catch (error) {
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
};