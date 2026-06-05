#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import { analyzeRepo } from './analyzer/index';
import { synthesizeJourneys, synthesizeFromPrompt } from './llm/synthesizer';
import { generateTest } from './llm/generator';
import { writeTests, writeSummary } from './writer/index';

const program = new Command();

program
  .name('retrospec')
  .description("Didn't do TDD? No problem. retrospec generates Playwright E2E tests by reading your repository.")
  .version('0.1.0');

program
  .command('generate', { isDefault: true })
  .description('Generate Playwright tests from a repository')
  .option('-r, --repo <path>', 'Path to the repository root', '.')
  .option('-o, --output <path>', 'Output directory for generated tests', './retrospec-tests')
  .option('-j, --journey <description>', 'Natural language description of a specific journey to test')
  .option('-u, --base-url <url>', 'Base URL of the running app', 'http://localhost:3000')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    const repoPath = path.resolve(options.repo);
    const outputDir = path.resolve(options.output);
    const baseUrl = options.baseUrl;
    const verbose = options.verbose ?? false;

    console.log(chalk.bold('\n retrospec\n'));
    console.log(chalk.gray(`Repo:   ${repoPath}`));
    console.log(chalk.gray(`Output: ${outputDir}`));
    console.log(chalk.gray(`Target: ${baseUrl}\n`));

    // Step 1: Analyze repo
    const analyzeSpinner = ora('Analyzing repository...').start();
    let analysis;
    try {
      analysis = analyzeRepo(repoPath);
      analyzeSpinner.succeed(
        `Found ${analysis.routes.length} routes (${analysis.framework})${analysis.hasAuth ? ' · auth detected' : ''}`
      );
    } catch (err) {
      analyzeSpinner.fail('Failed to analyze repository');
      console.error(chalk.red(String(err)));
      process.exit(1);
    }

    if (analysis.routes.length === 0) {
      console.log(chalk.yellow('\nNo routes found. Make sure this is a Next.js app with an app/ or pages/ directory.'));
      process.exit(1);
    }

    if (verbose) {
      console.log(chalk.gray('\nRoutes:'));
      analysis.routes.forEach(r => console.log(chalk.gray(`  ${r.path}`)));
      console.log('');
    }

    // Step 2: Synthesize journeys
    const journeySpinner = ora('Synthesizing user journeys...').start();
    let journeys;
    try {
      if (options.journey) {
        journeySpinner.text = `Building journey: "${options.journey}"`;
        journeys = await synthesizeFromPrompt(options.journey, analysis);
      } else {
        journeys = await synthesizeJourneys(analysis);
      }
      journeySpinner.succeed(`Identified ${journeys.length} user journey(s)`);
      journeys.forEach(j => console.log(chalk.cyan(`  · ${j.name} (${j.actor})`)));
      console.log('');
    } catch (err) {
      journeySpinner.fail('Failed to synthesize journeys');
      console.error(chalk.red(String(err)));
      process.exit(1);
    }

    // Step 3: Generate tests
    const tests = [];
    for (const journey of journeys) {
      const genSpinner = ora(`Generating test: ${journey.name}`).start();
      try {
        const test = await generateTest(journey, analysis, baseUrl);
        tests.push(test);
        genSpinner.succeed(`Generated: ${test.fileName}`);
      } catch (err) {
        genSpinner.fail(`Failed to generate test for: ${journey.name}`);
        console.error(chalk.red(String(err)));
      }
    }

    if (tests.length === 0) {
      console.log(chalk.red('\nNo tests were generated.'));
      process.exit(1);
    }

    // Step 4: Write to disk
    const writeSpinner = ora('Writing files...').start();
    try {
      writeTests(tests, outputDir, baseUrl, repoPath);
      writeSummary(tests, outputDir);
      writeSpinner.succeed(`Wrote ${tests.length} test file(s) to ${outputDir}`);
    } catch (err) {
      writeSpinner.fail('Failed to write test files');
      console.error(chalk.red(String(err)));
      process.exit(1);
    }

    console.log(chalk.bold.green('\n Done!\n'));
    console.log('Next steps:');
    console.log(`  1. Start your dev server at ${baseUrl}`);
    console.log(`  2. Run: ${chalk.cyan('npx playwright test --config playwright.config.ts')}`);
    console.log(`  3. Review ${chalk.cyan('RETROSPEC.md')} in the output directory\n`);
  });

program.parse(process.argv);
