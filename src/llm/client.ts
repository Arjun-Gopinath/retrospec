import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is not set.\n' +
        'Run: export ANTHROPIC_API_KEY=your_key_here'
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  model: 'sonnet' | 'opus' = 'sonnet'
): Promise<string> {
  const client = getClient();

  const modelId =
    model === 'opus'
      ? 'claude-opus-4-8'
      : 'claude-sonnet-4-6';

  const response = await client.messages.create({
    model: modelId,
    max_tokens: 8192,
    messages: [{ role: 'user', content: userMessage }],
    system: systemPrompt,
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text;
}
