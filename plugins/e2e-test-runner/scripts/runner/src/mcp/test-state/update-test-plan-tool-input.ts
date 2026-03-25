import z from "zod";

export const updateTestPlanToolInput = z.object({
    stepId: z.number().describe("The ID of the step to update"),
    status: z.enum(["passed", "failed"]).describe("The status of the step"),
    error: z.string().optional().describe("The error message if the step failed"),
});
