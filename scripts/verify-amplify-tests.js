#!/usr/bin/env node

/**
 * AWS Amplify Test Verification Script
 * Verifies that all test files are properly configured and can run
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test file configurations
const testConfigurations = [
  {
    name: 'Lambda Assignment Function Tests',
    path: 'amplify/functions/assignment/__tests__/handler.test.ts',
    type: 'unit',
    framework: 'jest',
    command: 'cd amplify && npm test -- assignment/__tests__/handler.test.ts',
  },
  {
    name: 'Lambda Scoring Function Tests',
    path: 'amplify/functions/scoring/__tests__/handler.test.ts',
    type: 'unit',
    framework: 'jest',
    command: 'cd amplify && npm test -- scoring/__tests__/handler.test.ts',
  },
  {
    name: 'GraphQL Integration Tests',
    path: 'client/src/test/amplify-graphql-integration.test.tsx',
    type: 'integration',
    framework: 'vitest',
    command: 'cd client && npm test -- --run src/test/amplify-graphql-integration.test.tsx',
  },
  {
    name: 'GraphQL Subscriptions Tests',
    path: 'client/src/test/amplify-subscriptions.test.tsx',
    type: 'integration',
    framework: 'vitest',
    command: 'cd client && npm test -- --run src/test/amplify-subscriptions.test.tsx',
  },
  {
    name: 'E2E User Workflows Tests',
    path: 'e2e/amplify-user-workflows.spec.ts',
    type: 'e2e',
    framework: 'playwright',
    command: 'npx playwright test e2e/amplify-user-workflows.spec.ts',
  },
  {
    name: 'Mobile Responsiveness Tests',
    path: 'e2e/mobile-responsive.spec.ts',
    type: 'e2e',
    framework: 'playwright',
    command: 'npx playwright test e2e/mobile-responsive.spec.ts',
  },
];

// Configuration files to verify
const configFiles = [
  {
    name: 'Amplify Jest Config',
    path: 'amplify/jest.config.js',
    required: true,
  },
  {
    name: 'Amplify Test Setup',
    path: 'amplify/test/setup.ts',
    required: true,
  },
  {
    name: 'Client Test Setup',
    path: 'client/src/test/setup.ts',
    required: true,
  },
  {
    name: 'Playwright Config',
    path: 'playwright.config.ts',
    required: true,
  },
  {
    name: 'Test Runner Script',
    path: 'scripts/run-amplify-tests.sh',
    required: true,
  },
];

// Package.json scripts to verify
const requiredScripts = [
  {
    file: 'package.json',
    scripts: ['test', 'test:e2e', 'amplify:sandbox'],
  },
  {
    file: 'client/package.json',
    scripts: ['test', 'test:watch'],
  },
  {
    file: 'amplify/package.json',
    scripts: ['test'],
  },
];

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function checkFileContent(filePath, requiredContent = []) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    for (const required of requiredContent) {
      if (!content.includes(required)) {
        return { valid: false, missing: required };
      }
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function verifyTestFiles() {
  logInfo('Verifying test files...');
  let allValid = true;

  for (const test of testConfigurations) {
    if (checkFileExists(test.path)) {
      logSuccess(`${test.name} - File exists`);
      
      // Check for basic test structure
      const contentCheck = checkFileContent(test.path, ['describe', 'it', 'expect']);
      if (contentCheck.valid) {
        logSuccess(`${test.name} - Has valid test structure`);
      } else {
        logError(`${test.name} - Missing test structure: ${contentCheck.missing || contentCheck.error}`);
        allValid = false;
      }
    } else {
      logError(`${test.name} - File missing: ${test.path}`);
      allValid = false;
    }
  }

  return allValid;
}

function verifyConfigFiles() {
  logInfo('Verifying configuration files...');
  let allValid = true;

  for (const config of configFiles) {
    if (checkFileExists(config.path)) {
      logSuccess(`${config.name} - File exists`);
    } else {
      if (config.required) {
        logError(`${config.name} - Required file missing: ${config.path}`);
        allValid = false;
      } else {
        logWarning(`${config.name} - Optional file missing: ${config.path}`);
      }
    }
  }

  return allValid;
}

function verifyPackageScripts() {
  logInfo('Verifying package.json scripts...');
  let allValid = true;

  for (const pkg of requiredScripts) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(pkg.file, 'utf8'));
      
      for (const script of pkg.scripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          logSuccess(`${pkg.file} - Script '${script}' exists`);
        } else {
          logError(`${pkg.file} - Missing script '${script}'`);
          allValid = false;
        }
      }
    } catch (error) {
      logError(`${pkg.file} - Cannot read file: ${error.message}`);
      allValid = false;
    }
  }

  return allValid;
}

function verifyDependencies() {
  logInfo('Verifying test dependencies...');
  let allValid = true;

  const requiredDeps = [
    { file: 'package.json', deps: ['jest', '@playwright/test'] },
    { file: 'client/package.json', deps: ['vitest', '@testing-library/react'] },
    { file: 'amplify/package.json', deps: ['jest', 'ts-jest'] },
  ];

  for (const pkg of requiredDeps) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(pkg.file, 'utf8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      for (const dep of pkg.deps) {
        if (allDeps[dep]) {
          logSuccess(`${pkg.file} - Dependency '${dep}' installed`);
        } else {
          logError(`${pkg.file} - Missing dependency '${dep}'`);
          allValid = false;
        }
      }
    } catch (error) {
      logError(`${pkg.file} - Cannot read file: ${error.message}`);
      allValid = false;
    }
  }

  return allValid;
}

function runSyntaxCheck() {
  logInfo('Running syntax checks...');
  let allValid = true;

  // Check TypeScript compilation
  try {
    execSync('cd amplify && npx tsc --noEmit', { stdio: 'pipe' });
    logSuccess('Amplify TypeScript compilation - OK');
  } catch (error) {
    logError('Amplify TypeScript compilation - Failed');
    allValid = false;
  }

  try {
    execSync('cd client && npx tsc --noEmit', { stdio: 'pipe' });
    logSuccess('Client TypeScript compilation - OK');
  } catch (error) {
    logError('Client TypeScript compilation - Failed');
    allValid = false;
  }

  return allValid;
}

function generateTestReport() {
  const report = {
    timestamp: new Date().toISOString(),
    testFiles: testConfigurations.length,
    configFiles: configFiles.length,
    status: 'unknown',
    details: {
      testFiles: testConfigurations.map(test => ({
        name: test.name,
        path: test.path,
        exists: checkFileExists(test.path),
        type: test.type,
        framework: test.framework,
      })),
      configFiles: configFiles.map(config => ({
        name: config.name,
        path: config.path,
        exists: checkFileExists(config.path),
        required: config.required,
      })),
    },
  };

  fs.writeFileSync('test-verification-report.json', JSON.stringify(report, null, 2));
  logInfo('Test verification report saved to test-verification-report.json');
}

function main() {
  log('\n🧪 AWS Amplify Test Suite Verification\n', 'cyan');
  log('========================================\n', 'cyan');

  const checks = [
    { name: 'Test Files', fn: verifyTestFiles },
    { name: 'Configuration Files', fn: verifyConfigFiles },
    { name: 'Package Scripts', fn: verifyPackageScripts },
    { name: 'Dependencies', fn: verifyDependencies },
    { name: 'Syntax Check', fn: runSyntaxCheck },
  ];

  let allPassed = true;

  for (const check of checks) {
    log(`\n--- ${check.name} ---`, 'magenta');
    const result = check.fn();
    if (!result) {
      allPassed = false;
    }
  }

  generateTestReport();

  log('\n========================================', 'cyan');
  if (allPassed) {
    logSuccess('All verification checks passed! ✨');
    log('\nYou can now run the test suite with:', 'blue');
    log('  ./scripts/run-amplify-tests.sh', 'cyan');
  } else {
    logError('Some verification checks failed! 💥');
    log('\nPlease fix the issues above before running tests.', 'yellow');
  }
  log('========================================\n', 'cyan');

  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  verifyTestFiles,
  verifyConfigFiles,
  verifyPackageScripts,
  verifyDependencies,
  runSyntaxCheck,
};