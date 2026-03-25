import express, { type Request, type Response } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { TestCase } from "../../types/test-case.ts";
import z from "zod";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import http from "http";
import { logger } from "../../utils/logger.ts";
import { updateTestPlanToolInput } from "./update-test-plan-tool-input.ts";

class MCPStateServer {
    private app: express.Application;
    private server: http.Server | null = null;
    private port: number;
    private mcpServer: Server;
    private transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
    });
    private testState: TestCase | null = null;

    constructor(port: number = 3001) {
        this.port = port;
        this.app = express();
        this.app.use(express.json());

        this.mcpServer = new Server(
            { name: "test-state-server", version: "0.1.0" },
            { capabilities: { tools: {} } }
        );

        this.setupMCPHandlers();
        this.setupRoutes();
    }

    private setupMCPHandlers() {
        this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "get_test_plan",
                    description: "Get the entire test plan with current state",
                    inputSchema: {
                        type: "object" as const,
                        properties: {},
                        additionalProperties: false,
                    },
                },
                {
                    name: "update_test_step",
                    description: "Update a test step with passed/failed status",
                    inputSchema: z.toJSONSchema(updateTestPlanToolInput),
                },
            ],
        }));

        this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            switch (name) {
                case "get_test_plan":
                    return {
                        content: [{ type: "text" as const, text: JSON.stringify(this.testState, null, 2) }],
                    };

                case "update_test_step": {
                    const { stepId, status, error } = updateTestPlanToolInput.parse(args);
                    const step = this.testState?.steps.find((s) => s.id === stepId);

                    if (!step) throw new Error(`Step ${stepId} not found`);

                    step.status = status;
                    if (error) step.error = error;

                    return {
                        content: [{
                            type: "text" as const,
                            text: `Updated step ${stepId} (${step.description}) to ${status}${error ? `: ${error}` : ""}`,
                        }],
                    };
                }

                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        });
    }

    private setupRoutes() {
        this.app.post("/", async (req: Request, res: Response) => {
            this.transport.handleRequest(req, res, req.body);
        });
        this.mcpServer.connect(this.transport);
    }

    public start(): Promise<void> {
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                logger.debug(`Test State MCP Server running on port ${this.port}`);
                resolve();
            });
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => resolve());
            } else {
                resolve();
            }
        });
    }

    public setTestState(testState: TestCase) {
        this.testState = testState;
    }

    public getState(): TestCase | null {
        return this.testState;
    }
}

export { MCPStateServer };
