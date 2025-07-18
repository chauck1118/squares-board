# End-to-End Testing Documentation

This directory contains comprehensive end-to-end tests for the March Madness Squares application using Playwright.

## Test Structure

### Test Files

1. **basic-functionality.spec.ts** - Basic application loading and navigation tests
2. **user-registration-and-claiming.spec.ts** - Complete user registration and square claiming workflows
3. **admin-board-management.spec.ts** - Admin dashboard and board management functionality
4. **payment-tracking-and-assignment.spec.ts** - Payment processing and square assignment flows
5. **tournament-scoring-and-winners.spec.ts** - Game scoring and winner determination
6. **mobile-responsive.spec.ts** - Mobile user experience and responsive design
7. **complete-user-journey.spec.ts** - Full end-to-end user journey from registration to winning

### Helper Files

- **helpers/test-data.ts** - Test data, user accounts, and utility functions
- **global-setup.ts** - Global test setup and database seeding

## Running Tests

### Prerequisites

1. Ensure the application is built and ready:
   ```bash
   npm run build
   npm run db:generate
   npm run db:seed
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npm run test:e2e -- user-registration-and-claiming.spec.ts

# Run tests on specific browser
npm run test:e2e -- --project=chromium

# Debug tests
npm run test:e2e:debug
```

## Test Coverage

### User Registration and Authentication
- ✅ User registration with validation
- ✅ User login/logout flows
- ✅ Authentication error handling
- ✅ Session management

### Board Management
- ✅ Board creation (admin)
- ✅ Board listing and filtering
- ✅ Board detail views
- ✅ Board status transitions

### Square Claiming
- ✅ Square claiming workflow (0-10 squares)
- ✅ Validation and error handling
- ✅ Payment status tracking
- ✅ Real-time updates

### Payment Processing
- ✅ Admin payment management
- ✅ Payment status updates
- ✅ Real-time payment notifications
- ✅ Payment validation

### Square Assignment
- ✅ Automatic assignment triggers
- ✅ Manual assignment controls
- ✅ Fisher-Yates shuffle verification
- ✅ Assignment conflict resolution

### Tournament Scoring
- ✅ Game score updates
- ✅ Winner determination logic
- ✅ Payout calculations
- ✅ Real-time score notifications

### Mobile Experience
- ✅ Responsive design validation
- ✅ Touch interaction testing
- ✅ Mobile navigation
- ✅ Mobile form handling

### Complete User Journeys
- ✅ Registration to winning workflow
- ✅ Error recovery scenarios
- ✅ Concurrent user interactions
- ✅ Race condition handling

## Test Data

### Test Users
- **admin@example.com** - Admin user for management functions
- **testuser@example.com** - Standard user for basic functionality
- **mobile@example.com** - User for mobile testing
- **journey@example.com** - User for complete journey tests
- **winner@example.com** - User for winner scenario tests

### Test Boards
- **E2E Test Board** - Standard board for most tests
- **March Madness 2024** - Full tournament board
- **Test Board Small** - Small board for race condition tests

## Test Environment

### Browser Coverage
- ✅ Chromium (Chrome/Edge)
- ✅ Firefox
- ✅ WebKit (Safari)
- ✅ Mobile Chrome
- ✅ Mobile Safari

### Viewport Testing
- Desktop: 1920x1080
- Tablet: 768x1024
- Mobile: 375x667 (iPhone SE)
- Mobile: 390x844 (iPhone 12)

## Debugging Tests

### Screenshots and Videos
- Screenshots are captured on test failures
- Videos are recorded for failed tests
- Traces are collected for debugging

### Debug Mode
```bash
# Run single test in debug mode
npm run test:e2e:debug -- --grep "user registration"

# Run with browser visible
npm run test:e2e:headed
```

### Test Reports
- HTML reports are generated in `playwright-report/`
- Test results include screenshots and videos
- Trace files can be viewed in Playwright Trace Viewer

## Best Practices

### Test Organization
- Each test file focuses on a specific feature area
- Tests are independent and can run in any order
- Shared utilities are in the helpers directory

### Data Management
- Tests use isolated test data
- Database is reset between test runs
- Test users are created as needed

### Error Handling
- Tests include both success and failure scenarios
- Network errors and timeouts are tested
- Race conditions and concurrent access are validated

### Performance
- Tests run in parallel where possible
- Slow operations are mocked when appropriate
- Real-time features are tested with proper waits

## Continuous Integration

### CI Configuration
```yaml
# Example GitHub Actions configuration
- name: Run E2E Tests
  run: |
    npm run build
    npm run db:generate
    npm run test:e2e
```

### Environment Variables
- `CI=true` - Enables CI-specific settings
- `PLAYWRIGHT_BROWSERS_PATH` - Custom browser installation path

## Troubleshooting

### Common Issues

1. **Server startup timeout**
   - Increase timeout in playwright.config.ts
   - Check if ports 3000/3001 are available

2. **Database connection errors**
   - Ensure PostgreSQL is running
   - Run database migrations

3. **Test flakiness**
   - Add proper waits for async operations
   - Use data-testid attributes for reliable selectors

4. **Mobile test failures**
   - Verify viewport settings
   - Check touch target sizes

### Getting Help
- Check Playwright documentation: https://playwright.dev/
- Review test logs and screenshots
- Use debug mode for step-by-step execution