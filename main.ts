// deno-lint-ignore-file no-explicit-any
import { createOpenAI } from "@ai-sdk/openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CoreMessage, Tool, generateText } from "ai";
import process from "node:process";
import readline from "node:readline";
import { z } from "zod";

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
    tool_desc.inputSchema.properties as Record<string, { type: string }>
  ) as [string, { type: string }][]) {
    parameters[name] = type === "number" ? z.number() : z.string();
  }
  tools[tool_desc.name] = {
    description: tool_desc.description,
    parameters: z.object(parameters),
    execute: async (args) => {
      const result = (await client.callTool({
        name: tool_desc.name,
        arguments: args,
      })) as { content: { text: string }[] };
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
  const messages: CoreMessage[] = [];

  // 创建readline接口来处理用户输入
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = () => {
    return new Promise<string>((resolve) => {
      rl.question("您: ", (input) => {
        resolve(input);
      });
    });
  };

  // 处理工具调用并将结果添加到消息数组
  const handleToolCalls = async (response: any) => {
    if (response.toolCalls.length === 0) return null;

    const toolCallMessages = response.toolCalls.map(
      (toolCall: any) =>
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
        (toolResult: any) =>
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

    return await generateText({
      model,
      tools,
      messages,
    });
  };

  // 处理并显示助手的回复
  const handleAssistantResponse = (responseText: string) => {
    console.log(responseText);
    messages.push({ role: "assistant", content: responseText });
  };

  console.log("开始与AI助手对话，输入 .exit 可以退出程序");

  while (true) {
    const userInput = await askQuestion();

    // 检查用户是否要退出
    if (userInput.trim() === ".exit") {
      console.log("感谢使用，再见！");
      rl.close();
      break;
    }

    // 添加用户消息
    messages.push({ role: "user", content: userInput });

    console.log("AI助手: ");
    // 生成回复
    const response = await generateText({
      model,
      tools,
      messages,
    });

    // 处理工具调用或直接显示回复
    const finalResponse = (await handleToolCalls(response)) || response;
    handleAssistantResponse(finalResponse.text);
  }
}

main().finally(() => Deno.exit(0));
