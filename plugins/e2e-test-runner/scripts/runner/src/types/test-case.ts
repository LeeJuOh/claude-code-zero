import z from "zod";

export const testCaseSchema = z.object({
    id: z
        .string()
        .describe("The name of the test")
        .regex(/^[a-zA-Z0-9-]+$/, "Name must be alphanumeric and can contain hyphens"),
    description: z.string().describe("A high-level description of what the test verifies"),
    baseUrl: z.string().url().optional().describe("The base URL of the application under test"),
    steps: z.array(
        z.object({
            id: z.number(),
            description: z.string().describe("The description of the step, and how to complete it"),
            status: z.enum(["pending", "passed", "failed"]).default("pending").optional(),
            error: z.string().optional().describe("The error message if the step failed"),
        })
    ),
});

export type TestCase = z.infer<typeof testCaseSchema>;
