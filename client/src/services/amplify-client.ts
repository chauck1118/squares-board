import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

/**
 * AWS Amplify Data client for March Madness Squares
 * Provides type-safe GraphQL operations
 */
export const client = generateClient<Schema>();

export type { Schema };