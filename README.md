# MCP 示例项目

这个项目是使用 Model Context Protocol (MCP)的示例应用，展示了如何通过 MCP 协议将大型语言模型与各种工具集成。

## 项目概述

本项目使用 MCP SDK 将 OpenAI 模型与自定义工具连接起来，使模型能够调用外部工具来解决用户查询。在示例中，用户可以询问系统电量等信息，模型会调用相应的工具来获取答案。

## 项目结构

- `main.ts` - 主程序入口，处理用户查询并协调模型与工具之间的通信
- `server.ts` - MCP 工具服务器，提供工具功能实现（如系统状态查询等）

## 技术栈

- TypeScript
- OpenAI API
- AI SDK
- Model Context Protocol
- Deno (用于运行服务端)

## 环境要求

- Node.js
- Deno
- OpenAI API 密钥

## 环境变量

在运行前，请设置以下环境变量：

- `OPENAI_API_KEY` - 你的 OpenAI API 密钥
- `OPENAI_BASE_URL` - OpenAI API 的基础 URL（可选，默认为官方 URL）
- `OPENAI_MODEL` - 使用的模型名称（例如："gpt-4-turbo"）

## 安装依赖

```bash
deno install
```

## 使用方法

1. 确保已安装 Deno
2. 设置必要的环境变量
3. 运行主程序：

```bash
deno run -A main.ts
```

## 功能示例

程序会启动并处理预设的用户查询，例如"系统还有多少电？"。模型会：

1. 理解用户查询
2. 调用适当的工具（如系统状态查询工具）
3. 接收工具返回的结果
4. 生成最终响应并呈现给用户

## 自定义工具

可以通过修改`server.ts`文件来添加或修改可用工具。每个工具需要定义：

- 名称
- 描述
- 输入参数模式
- 执行逻辑
