const { query, createSdkMcpServer, tool } = require('@anthropic-ai/claude-agent-sdk');
const { z } = require('zod');

const testMcpServer = createSdkMcpServer({
  name: 'test-tools',
  version: '1.0.0',
  tools: [
    tool(
      'get_test_data',
      'Returns test data',
      { key: z.string().describe('Data key to retrieve') },
      async (args) => ({
        content: [{ type: 'text', text: JSON.stringify({ key: args.key, value: 'test-value-123' }) }]
      })
    ),
  ],
});

async function test() {
  console.log('Testing SDK with MCP server and agents...');
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
      console.log('MSG:', msg.type, msg.subtype || '');
      if (msg.type === 'result') {
        console.log('Result subtype:', msg.subtype);
        console.log('Result text:', (msg.result || '').substring(0, 300));
        console.log('Cost:', msg.total_cost_usd);
        console.log('Turns:', msg.num_turns);
      }
    }
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error('Stack:', e.stack);
  }
}

test();
