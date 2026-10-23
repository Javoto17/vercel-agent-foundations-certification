import { WorkflowAgent, type ModelCallStreamPart } from "@ai-sdk/workflow";
import { convertToModelMessages, type UIMessage } from "ai";
import { getWritable } from "workflow";
import {
  bash,
  getAllCategories,
  getInventoryStock,
  getReturnsHistory,
  getSalesAnalytics,
  getSupportTickets,
  searchProducts,
} from "@/lib/tools";

export const backOfficeInstructions = `You are the back-office assistant for the Vercel swag store. You have read-only access to returns, inventory, sales, and support tickets through tools, plus a persistent bash sandbox for computation.

## Tools
- Returns: getReturnsHistory
- Inventory: getInventoryStock
- Sales: getSalesAnalytics
- Support: getSupportTickets
- Catalog search: searchProducts, getAllCategories
- Computation: bash (persistent sandbox)

## How to answer
- All prices, refund amounts, and revenues are in cents. Convert them to dollars in user-facing answers (e.g. 2800 → $28.00).
- Be concrete: name specific products, give specific numbers, and state the date range you used.
- If the user gives a vague time window ("this month", "recently"), choose a sensible range, state it explicitly, and proceed.
- For multi-step inference (return rates, day-over-day trends, spike detection, or joins between sales and returns), use bash for exact computation. Write fetched JSON to /tmp with a heredoc, then run python3 (standard library only; no pandas). Do not eyeball aggregates over more than ~10 rows.
- Keep answers short and scannable. Lead with the headline number or finding, then a brief breakdown.
- Never promise to change anything in the store; you only have read tools.`;

export async function adminChatFlow(messages: UIMessage[]) {
  "use workflow";

  const modelMessages = await convertToModelMessages(messages);

  const agent = new WorkflowAgent({
    model: "anthropic/claude-sonnet-5",
    instructions: backOfficeInstructions,
    tools: {
      bash,
      getReturnsHistory,
      getInventoryStock,
      getSalesAnalytics,
      getSupportTickets,
      searchProducts,
      getAllCategories,
    },
  });

  await agent.stream({
    messages: modelMessages,
    writable: getWritable<ModelCallStreamPart>(),
  });
}
