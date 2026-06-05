import { Journey, RepoAnalysis, GeneratedTest } from '../types';
import { callClaude } from './client';

const SYSTEM_PROMPT = `You are an expert Playwright test engineer. Generate a complete, production-quality Playwright test file for the given user journey.

Rules:
- Use TypeScript
- Use \`test.describe\` to group the journey
- Use semantic locators: \`getByRole\`, \`getByLabel\`, \`getByPlaceholder\`, \`getByText\` — never CSS selectors or XPath
- Use \`expect\` assertions that verify meaningful state (not just visibility)
- Add \`await page.waitForURL\` after navigation actions
- Include a test for the happy path AND one test per edge case
- Use \`test.beforeEach\` for shared setup (e.g. navigation to start page)
- For auth-required journeys, add a comment: // TODO: replace with storageState fixture
- Output ONLY the TypeScript file content — no markdown fences, no explanation`;

export async function generateTest(
  journey: Journey,
  analysis: RepoAnalysis,
  baseUrl: string
): Promise<GeneratedTest> {
  const compDetails = journey.relatedRoutes
    .map(route => {
      const comp = analysis.components.find(c => c.route === route);
      return comp?.rawText ? `Route ${route}:\n${comp.rawText}` : `Route ${route}: (no component details)`;
    })
    .join('\n\n');

  const userMessage = `Generate a Playwright test file for this journey:

Journey name: ${journey.name}
Actor: ${journey.actor}
Base URL: ${baseUrl}

Steps:
${journey.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Assertions to verify:
${journey.assertions.map(a => `- ${a}`).join('\n')}

Edge cases to test:
${journey.edgeCases.map(e => `- ${e}`).join('\n')}

Component details for related routes:
${compDetails || 'Not available — use reasonable locator guesses based on the journey context.'}

Framework: ${analysis.framework}`;

  const content = await callClaude(SYSTEM_PROMPT, userMessage, 'sonnet');
  const fileName = toFileName(journey.name);

  return { journey, fileName, content };
}

function toFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.spec.ts';
}
