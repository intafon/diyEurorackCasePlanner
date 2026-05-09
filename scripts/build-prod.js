#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { createInterface } from 'readline';

const packageJsonPath = './package.json';

async function askQuestion(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  try {
    // Read current package.json
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version;

    console.log(`Current version: ${currentVersion}`);
    
    // Ask if user wants to update version
    const answer = await askQuestion('Would you like to update the package version? (y/N): ');
    
    // If user says no (or just hits enter), proceed with build
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('Proceeding with build using current version...');
    } else {
      // Ask for new version
      const newVersion = await askQuestion(`Enter new version (current: ${currentVersion}): `);
      
      if (newVersion && newVersion !== currentVersion) {
        // Update package.json
        packageJson.version = newVersion;
        writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        console.log(`Version updated to: ${newVersion}`);
      } else {
        console.log('No version change made.');
      }
    }

    // Run the build
    console.log('Starting build...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('Build completed successfully!');

  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

main();