#!/usr/bin/env node

/**
 * Verification script for AWS Amplify setup
 * Checks that all required files and configurations are in place
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'amplify/backend.ts',
  'amplify/auth/resource.ts',
  'amplify/data/resource.ts',
  'amplify/package.json',
  'amplify/tsconfig.json',
  'amplify_outputs.json',
  'client/src/amplify-config.ts',
  'client/src/services/amplify-client.ts',
  'client/src/services/auth.ts',
  'AMPLIFY_SETUP.md'
];

const requiredDependencies = [
  'aws-amplify',
  '@aws-amplify/ui-react',
  '@aws-amplify/backend',
  '@aws-amplify/backend-cli'
];

console.log('🔍 Verifying AWS Amplify setup...\n');

// Check required files
console.log('📁 Checking required files:');
let missingFiles = 0;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) missingFiles++;
});

// Check package.json dependencies
console.log('\n📦 Checking dependencies:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const clientPackageJson = JSON.parse(fs.readFileSync('client/package.json', 'utf8'));

const allDeps = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
  ...clientPackageJson.dependencies,
  ...clientPackageJson.devDependencies
};

let missingDeps = 0;
requiredDependencies.forEach(dep => {
  const exists = allDeps[dep];
  console.log(`  ${exists ? '✅' : '❌'} ${dep}${exists ? ` (${exists})` : ''}`);
  if (!exists) missingDeps++;
});

// Check scripts
console.log('\n🔧 Checking npm scripts:');
const requiredScripts = ['amplify:sandbox', 'amplify:generate', 'amplify:deploy'];
let missingScripts = 0;
requiredScripts.forEach(script => {
  const exists = packageJson.scripts[script];
  console.log(`  ${exists ? '✅' : '❌'} ${script}`);
  if (!exists) missingScripts++;
});

// Summary
console.log('\n📊 Summary:');
const totalIssues = missingFiles + missingDeps + missingScripts;
if (totalIssues === 0) {
  console.log('✅ AWS Amplify setup is complete!');
  console.log('\n🚀 Next steps:');
  console.log('  1. Configure AWS credentials: npx ampx configure profile');
  console.log('  2. Start sandbox: npm run amplify:sandbox');
  console.log('  3. Generate types: npm run amplify:generate');
} else {
  console.log(`❌ Found ${totalIssues} issues that need to be resolved.`);
  process.exit(1);
}