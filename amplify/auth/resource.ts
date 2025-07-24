import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource for March Madness Squares
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      required: true,
    },
    'custom:displayName': {
      dataType: 'String',
    },
    'custom:isAdmin': {
      dataType: 'Boolean',
    },
  },
  groups: ['admins'],
});
