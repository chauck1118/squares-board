#!/bin/bash

# Comprehensive AWS Amplify Testing Suite Runner
# This script runs all tests for the March Madness Squares application

set -e

echo "🚀 Starting AWS Amplify Testing Suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required dependencies are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v npx &> /dev/null; then
        print_error "npx is not installed"
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Install dependencies if needed
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install client dependencies
    cd client && npm install && cd ..
    
    # Install amplify dependencies
    cd amplify && npm install && cd ..
    
    print_success "Dependencies installed"
}

# Run Lambda function unit tests
run_lambda_tests() {
    print_status "Running AWS Lambda function unit tests..."
    
    cd amplify
    
    if npm test; then
        print_success "Lambda function tests passed"
    else
        print_error "Lambda function tests failed"
        exit 1
    fi
    
    cd ..
}

# Run GraphQL integration tests
run_graphql_tests() {
    print_status "Running GraphQL integration tests..."
    
    cd client
    
    if npm test -- --run --reporter=verbose src/test/amplify-graphql-integration.test.tsx; then
        print_success "GraphQL integration tests passed"
    else
        print_error "GraphQL integration tests failed"
        exit 1
    fi
    
    cd ..
}

# Run GraphQL subscription tests
run_subscription_tests() {
    print_status "Running GraphQL subscription tests..."
    
    cd client
    
    if npm test -- --run --reporter=verbose src/test/amplify-subscriptions.test.tsx; then
        print_success "GraphQL subscription tests passed"
    else
        print_error "GraphQL subscription tests failed"
        exit 1
    fi
    
    cd ..
}

# Run all client-side tests
run_client_tests() {
    print_status "Running client-side tests..."
    
    cd client
    
    if npm test -- --run --coverage; then
        print_success "Client-side tests passed"
    else
        print_error "Client-side tests failed"
        exit 1
    fi
    
    cd ..
}

# Run E2E tests
run_e2e_tests() {
    print_status "Running E2E tests..."
    
    # Start the development server in background
    print_status "Starting development server..."
    npm run dev &
    DEV_SERVER_PID=$!
    
    # Wait for server to start
    sleep 30
    
    # Run E2E tests
    if npm run test:e2e; then
        print_success "E2E tests passed"
    else
        print_error "E2E tests failed"
        kill $DEV_SERVER_PID
        exit 1
    fi
    
    # Stop development server
    kill $DEV_SERVER_PID
}

# Run mobile responsiveness tests
run_mobile_tests() {
    print_status "Running mobile responsiveness tests..."
    
    # Start the development server in background
    print_status "Starting development server for mobile tests..."
    npm run dev &
    DEV_SERVER_PID=$!
    
    # Wait for server to start
    sleep 30
    
    # Run mobile-specific E2E tests
    if npx playwright test e2e/mobile-responsive.spec.ts; then
        print_success "Mobile responsiveness tests passed"
    else
        print_error "Mobile responsiveness tests failed"
        kill $DEV_SERVER_PID
        exit 1
    fi
    
    # Stop development server
    kill $DEV_SERVER_PID
}

# Generate test coverage report
generate_coverage_report() {
    print_status "Generating test coverage report..."
    
    # Combine coverage from different test suites
    mkdir -p coverage/combined
    
    # Copy Lambda function coverage
    if [ -d "amplify/coverage" ]; then
        cp -r amplify/coverage/* coverage/combined/
    fi
    
    # Copy client coverage
    if [ -d "client/coverage" ]; then
        cp -r client/coverage/* coverage/combined/
    fi
    
    print_success "Coverage report generated in coverage/combined/"
}

# Validate test results
validate_results() {
    print_status "Validating test results..."
    
    # Check if all test files exist and have been run
    local test_files=(
        "amplify/functions/assignment/__tests__/handler.test.ts"
        "amplify/functions/scoring/__tests__/handler.test.ts"
        "client/src/test/amplify-graphql-integration.test.tsx"
        "client/src/test/amplify-subscriptions.test.tsx"
        "e2e/amplify-user-workflows.spec.ts"
        "e2e/mobile-responsive.spec.ts"
    )
    
    for test_file in "${test_files[@]}"; do
        if [ ! -f "$test_file" ]; then
            print_error "Test file missing: $test_file"
            exit 1
        fi
    done
    
    print_success "All test files are present and valid"
}

# Main execution
main() {
    echo "=========================================="
    echo "  AWS Amplify Testing Suite"
    echo "  March Madness Squares Application"
    echo "=========================================="
    echo ""
    
    check_dependencies
    install_dependencies
    validate_results
    
    # Run tests in order
    run_lambda_tests
    run_graphql_tests
    run_subscription_tests
    run_client_tests
    run_e2e_tests
    run_mobile_tests
    
    generate_coverage_report
    
    echo ""
    echo "=========================================="
    print_success "All AWS Amplify tests completed successfully!"
    echo "=========================================="
    echo ""
    echo "Test Summary:"
    echo "✅ Lambda function unit tests"
    echo "✅ GraphQL integration tests"
    echo "✅ GraphQL subscription tests"
    echo "✅ Client-side component tests"
    echo "✅ E2E user workflow tests"
    echo "✅ Mobile responsiveness tests"
    echo ""
    echo "Coverage report: coverage/combined/"
    echo ""
}

# Handle script arguments
case "${1:-all}" in
    "lambda")
        check_dependencies
        run_lambda_tests
        ;;
    "graphql")
        check_dependencies
        run_graphql_tests
        ;;
    "subscriptions")
        check_dependencies
        run_subscription_tests
        ;;
    "client")
        check_dependencies
        run_client_tests
        ;;
    "e2e")
        check_dependencies
        run_e2e_tests
        ;;
    "mobile")
        check_dependencies
        run_mobile_tests
        ;;
    "all"|*)
        main
        ;;
esac