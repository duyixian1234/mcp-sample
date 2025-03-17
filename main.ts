import { createOpenAI } from "@ai-sdk/openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CoreMessage, Tool, ToolCall, ToolResult, generateText } from "ai";
import { z } from "zod";
import process from "node:process";

const transport = new StdioClientTransport({
  command: "deno",
  args: ["run", "-A", "server.ts"],
});

const client = new Client(
  {
    name: "example-client",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
    },
  }
);

await client.connect(transport);

const { tools: tool_descs } = await client.listTools();
const tools: Record<string, Tool> = {};
for (const tool_desc of tool_descs) {
  const parameters: Record<string, z.ZodType> = {};
  for (const [name, { type }] of Object.entries(
    tool_desc.inputSchema.properties
  ) as [string, { type: string }][]) {
    parameters[name] = type === "number" ? z.number() : z.string();
  }
  tools[tool_desc.name] = {
    description: tool_desc.description,
    parameters: z.object(parameters),
    execute: async (args) => {
      const result = await client.callTool({
        name: tool_desc.name,
        arguments: args,
      });
      console.log(`Tool ${tool_desc.name} executed with result:`, result);
      return result.content[0].text;
    },
  };
}

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

async function main() {
  const model = openai(process.env.OPENAI_MODEL!);
  const messages: CoreMessage[] = [{ role: "user", content: "20+33=?" }];
  const response = await generateText({
    model,
    tools,
    messages,
  });
  if (response.toolCalls.length > 0) {
    const toolCallMessages = response.toolCalls.map(
      (toolCall: ToolCall) =>
        ({
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              args: toolCall.args,
            },
          ],
        } as CoreMessage)
    );
    messages.push(...toolCallMessages);
    if (response.toolResults.length > 0) {
      const toolResultMessages = response.toolResults.map(
        (toolResult: ToolResult) =>
          ({
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolCallId: toolResult.toolCallId,
                toolName: toolResult.toolName,
                result: toolResult.result,
              },
            ],
          } as CoreMessage)
      );
      messages.push(...toolResultMessages);
    }
    const { text } = await generateText({
      model,
      tools,
      messages,
    });
    console.log(text);
  }
}

main();
