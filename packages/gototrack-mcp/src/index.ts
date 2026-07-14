#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  createGototrackClient,
  resolveGototrackMcpConfig,
} from './client.js';
import { createGototrackMcpServer } from './server.js';

const config = resolveGototrackMcpConfig();
const client = createGototrackClient(config);
const server = createGototrackMcpServer({
  client,
  authToken: config.authToken,
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('GoGoTrack MCP server failed:', error);
  process.exit(1);
});
