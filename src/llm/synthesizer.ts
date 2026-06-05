import { Journey, RepoAnalysis } from '../types';
import { callClaude } from './client';

const SYSTEM_PROMPT = `You are a senior QA architect. Given a summary of a web application's routes and components, identify the most important user journeys to test end-to-end.

Return ONLY a valid JSON array of journey objects. No markdown, no explanation, just the JSON array.

Each journey object must have:
- name: string (short descriptive name, e.g. "User login")
- actor: string (e.g. "authenticated user", "admin", "guest")
- steps: string[] (ordered user actions, e.g. ["Navigate to /login", "Fill email field", "Submit form"])
- assertions: string[] (what to verify after the flow, e.g. ["Dashboard page is shown", "Welcome message includes user name"])
- edgeCases: string[] (error/boundary scenarios worth testing, e.g. ["Invalid credentials shows error message"])
- relatedRoutes: string[] (which routes this journey touches)

Focus on:
1. Authentication flows (login, signup, logout, password reset)
2. Core CRUD operations visible in the routes
3. Navigation flows between key pages
4. Form submission happy paths and error states
5. Access control (what authenticated vs unauthenticated users can do)

Return 3–8 journeys. Prioritise the most critical user flows.`;

export async function synthesizeJourneys(analysis: RepoAnalysis): Promise<Journey[]> {
  const routeSummary = analysis.routes
    .map(r => {
      const comp = analysis.components.find(c => c.route === r.path);
      const details = comp?.rawText ? `\n  ${comp.rawText.replace(/\n/g, '\n  ')}` : '';
      return `- ${r.path}${r.isDynamic ? ' (dynamic)' : ''}${r.group ? ` [group: ${r.group}]` : ''}${details}`;
    })
    .join('\n');

  const userMessage = `Framework: ${analysis.framework}
Has authentication: ${analysis.hasAuth}
Has API routes: ${analysis.hasApi}
Total routes: ${analysis.routes.length}

Routes and component details:
${routeSummary}

Identify the key user journeys to test for this application.`;

  const raw = await callClaude(SYSTEM_PROMPT, userMessage, 'opus');
  return parseJourneys(raw);
}

export async function synthesizeFromPrompt(
  journeyPrompt: string,
  analysis: RepoAnalysis
): Promise<Journey[]> {
  const routeList = analysis.routes.map(r => r.path).join(', ');

  const system = `You are a QA architect. Convert a plain English journey description into a structured test journey.
Return ONLY a valid JSON array with a single journey object (same schema as before).
No markdown, no explanation.`;

  const userMessage = `Journey to test: "${journeyPrompt}"

Available routes in the app: ${routeList}
Framework: ${analysis.framework}
Has auth: ${analysis.hasAuth}

Convert this into a structured journey with steps, assertions, and edge cases.`;

  const raw = await callClaude(system, userMessage, 'sonnet');
  return parseJourneys(raw);
}

function parseJourneys(raw: string): Journey[] {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed as Journey[];
    if (parsed && typeof parsed === 'object') return [parsed] as Journey[];
    throw new Error('Expected JSON array');
  } catch (err) {
    throw new Error(`Failed to parse journey JSON from LLM response.\nRaw:\n${raw}\n\nError: ${err}`);
  }
}
