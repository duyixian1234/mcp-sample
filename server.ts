import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
});

server.addTool({
  name: "add",
  description: "Add two numbers",
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  // deno-lint-ignore require-await
  execute: async (args) => {
    return String(args.a + args.b);
  },
});

server.addTool({
  name: "system-battery",
  description: "Get the current system battery status",
  parameters: z.object({}),
  execute: async () => {
    const command = new Deno.Command(
      "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
      {
        args: [
          "-c",
          "Get-WmiObject -Class Win32_Battery | Select-Object -Property EstimatedChargeRemaining",
        ],
      }
    );
    const output = await command.output();
    return JSON.stringify(new TextDecoder().decode(output.stdout));
  },
});

server.start({
  transportType: "stdio",
});
