import { query, createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const testMcpServer = createSdkMcpServer({
  name: 'test-tools',
  version: '1.0.0',
  tools: [
    tool(
      'get_test_data',
      'Returns test data',
      { key: z.string().describe('Data key to retrieve') },
      async (args) => ({
        content: [{ type: 'text' as const, text: JSON.stringify({ key: args.key, value: 'test-value-123' }) }]
      })
    ),
  ],
});

async function test() {
  console.log('Testing SDK via tsx with MCP server...');
  try {
    for await (const msg of query({
      prompt: 'Use the get_test_data tool with key "hello" and tell me what you get back.',
      options: {
        pathToClaudeCodeExecutable: '/Users/ivanariza/.local/node-v22.13.1-darwin-x64/bin/claude',
        maxTurns: 5,
        allowedTools: ['mcp__test-tools__get_test_data'],
        mcpServers: {
          'test-tools': testMcpServer,
        },
        permissionMode: 'bypassPermissions',
      }
    })) {
      const m = msg as any;
      console.log('MSG:', m.type, m.subtype || '');
      if (m.type === 'result') {
        console.log('Result:', m.subtype, '-', (m.result || '').substring(0, 200));
        console.log('Cost:', m.total_cost_usd);
      }
    }
  } catch (e: any) {
    console.error('ERROR:', e.message);
  }
}

test();
