import { defineFunction } from '@aws-amplify/backend';

export const scoringFunction = defineFunction({
  name: 'scoring',
  entry: './handler.ts',
  environment: {
    AMPLIFY_DATA_GRAPHQL_ENDPOINT: process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT || '',
  },
});