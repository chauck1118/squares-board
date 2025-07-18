# Requirements Document

## Introduction

This feature implements a responsive web application for March Madness squares boards, allowing users to participate in tournament betting pools on both desktop and mobile devices. Users can register, log in, claim squares on boards, and track their progress throughout the tournament. The system manages random square assignment and board monitoring functionality.

## Requirements

### Requirement 1

**User Story:** As a user, I want to create an account and log in, so that I can participate in March Madness squares boards.

#### Acceptance Criteria

1. WHEN a new user visits the registration page THEN the system SHALL display fields for display name, email, and password
2. WHEN a user submits valid registration information THEN the system SHALL create a new account and redirect to login
3. WHEN a user enters valid login credentials THEN the system SHALL authenticate them and redirect to the dashboard
4. WHEN a user enters invalid login credentials THEN the system SHALL display an error message
5. IF a user is not authenticated THEN the system SHALL redirect them to the login page when accessing protected routes

### Requirement 2

**User Story:** As a user, I want to view available squares boards, so that I can choose which ones to participate in.

#### Acceptance Criteria

1. WHEN an authenticated user accesses the dashboard THEN the system SHALL display a list of available boards
2. WHEN displaying boards THEN the system SHALL show board name, total squares, claimed squares, and status
3. WHEN a board is full THEN the system SHALL indicate it is no longer accepting new participants
4. WHEN the tournament has started THEN the system SHALL display boards in "active" status

### Requirement 3

**User Story:** As a user, I want to claim between 0-10 squares on a board, so that I can participate in the betting pool.

#### Acceptance Criteria

1. WHEN a user selects a board THEN the system SHALL display an interface to claim squares
2. WHEN a user attempts to claim squares THEN the system SHALL allow selection of 0 to 10 squares maximum
3. WHEN a user confirms their square selection THEN the system SHALL reserve those squares as "pending payment"
4. WHEN a board reaches 100 paid squares THEN the system SHALL randomly assign specific square positions to all participants
5. IF a user tries to claim more than 10 squares THEN the system SHALL display an error message
6. IF a board is already full THEN the system SHALL prevent new square claims
7. WHEN squares are reserved THEN the system SHALL indicate they are pending payment until marked as paid by admin

### Requirement 4

**User Story:** As a user, I want to see my assigned squares after the board is filled, so that I know which numbers I'm rooting for.

#### Acceptance Criteria

1. WHEN a board is completely filled THEN the system SHALL randomly assign grid positions to all claimed squares
2. WHEN squares are assigned THEN the system SHALL randomly assign numbers 0-9 across the top row (winning team) and down the first column (losing team)
3. WHEN a user views their boards THEN the system SHALL highlight their assigned squares
4. WHEN displaying assigned squares THEN the system SHALL show the corresponding team score combinations based on the randomly assigned numbers

### Requirement 5

**User Story:** As a user, I want to monitor my squares during the tournament, so that I can track my potential winnings.

#### Acceptance Criteria

1. WHEN the tournament is active THEN the system SHALL display current scores for relevant games in a scoring table
2. WHEN a game is completed THEN the system SHALL determine winning squares based on final score digits (last digit of each team's score)
3. WHEN a user's square wins THEN the system SHALL clearly indicate their winning status and payout amount
4. WHEN viewing active boards THEN the system SHALL show real-time score updates alongside the squares grid
5. IF a game is completed THEN the system SHALL display final results and winners based on final score only
6. WHEN displaying potential winnings THEN the system SHALL show increasing payout amounts for each tournament round (e.g., Round 1: $25, Round 2: $50, Sweet 16: $100, etc.)
7. WHEN displaying the board THEN the system SHALL show a scoring table that maps game results to winning squares (e.g., Game 1: 78-74 wins square at Column 8, Row 4)

### Requirement 6

**User Story:** As an administrator, I want to create and manage squares boards, so that users can participate in organized betting pools.

#### Acceptance Criteria

1. WHEN an admin creates a new board THEN the system SHALL allow setting board name and tournament details
2. WHEN a board is created THEN the system SHALL initialize it with 100 available squares
3. WHEN an admin manages a board THEN the system SHALL provide options to view participants and square assignments
4. WHEN the tournament starts THEN the system SHALL allow admins to activate boards for score tracking
5. IF needed THEN the system SHALL allow admins to manually trigger square assignment for filled boards
6. WHEN an admin views pending squares THEN the system SHALL allow marking individual squares as "paid"
7. WHEN an admin marks a square as paid THEN the system SHALL update the square status from "pending" to "claimed"