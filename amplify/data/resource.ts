import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * March Madness Squares GraphQL Schema
 * Defines data models for users, boards, squares, and games
 */
const schema = a.schema({
  // User model - extends Cognito user with additional fields
  User: a
    .model({
      email: a.string().required(),
      displayName: a.string().required(),
      isAdmin: a.boolean().default(false),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.groups(['admins']),
    ]),

  // Board model - represents a March Madness squares board
  Board: a
    .model({
      name: a.string().required(),
      pricePerSquare: a.float().required(),
      status: a.enum(['OPEN', 'FILLED', 'ASSIGNED', 'ACTIVE', 'COMPLETED']),
      totalSquares: a.integer().default(100),
      claimedSquares: a.integer().default(0),
      paidSquares: a.integer().default(0),
      createdBy: a.id().required(),
      payoutStructure: a.json(),
      winningTeamNumbers: a.json(), // Array of 0-9 numbers for top row
      losingTeamNumbers: a.json(),  // Array of 0-9 numbers for left column
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['admins']),
      allow.owner().to(['read', 'update']),
    ]),

  // Square model - represents individual squares on a board
  Square: a
    .model({
      boardId: a.id().required(),
      userId: a.id(),
      gridPosition: a.integer(), // 0-99, assigned after board is filled
      paymentStatus: a.enum(['PENDING', 'PAID']),
      winningTeamNumber: a.integer(), // 0-9, assigned during random assignment
      losingTeamNumber: a.integer(), // 0-9, assigned during random assignment
      claimOrder: a.integer(), // Order in which square was claimed (1-100)
      board: a.belongsTo('Board', 'boardId'),
      user: a.belongsTo('User', 'userId'),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['admins']),
      allow.owner().to(['read', 'update']),
    ]),

  // Game model - represents tournament games
  Game: a
    .model({
      boardId: a.id().required(),
      gameNumber: a.integer().required(), // 1-63 for March Madness
      round: a.enum(['ROUND1', 'ROUND2', 'SWEET16', 'ELITE8', 'FINAL4', 'CHAMPIONSHIP']),
      team1: a.string().required(),
      team2: a.string().required(),
      team1Score: a.integer(),
      team2Score: a.integer(),
      status: a.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']),
      winnerSquareId: a.id(),
      scheduledTime: a.datetime().required(),
      completedAt: a.datetime(),
      board: a.belongsTo('Board', 'boardId'),
      winnerSquare: a.belongsTo('Square', 'winnerSquareId'),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.groups(['admins']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
