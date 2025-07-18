import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

/**
 * March Madness Squares Backend Configuration
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
});

// Configure hosting for the frontend
backend.addOutput({
  custom: {
    hosting: {
      buildCommand: 'npm run build',
      buildPath: 'client/dist',
      startCommand: 'npm run dev',
    },
  },
});
