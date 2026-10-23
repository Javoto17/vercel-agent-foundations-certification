import { WorkflowAgent, type ModelCallStreamPart } from "@ai-sdk/workflow";
import { getWritable } from "workflow";
import { convertToModelMessages, type UIMessage } from "ai";
import {
  searchProducts,
  getAllCategories,
  returnOrder,
  getProductDetails,
  addToCart,
  getCartDetails,
} from "@/lib/tools";

export async function chatFlow(messages: UIMessage[]) {
  "use workflow";

  const modelMessages = await convertToModelMessages(messages);

  const agent = new WorkflowAgent({
    model: "anthropic/claude-sonnet-5",
    instructions: `You are a helpful assistant for the Vercel swag store.
    When the user asks about products, availability, or recommendations, use the searchProducts tool to look up real catalog data before answering.
    When asked about a type or category of product, use the getAllCategories tool to get valid categories before using searchProducts.
    When the user asks about a specific item — for details, sizing, images, or whether it's in stock — use getProductDetails with its product ID or slug rather than relying on searchProducts summaries.
    When the user explicitly asks to add or buy a product, use addToCart after identifying the exact product. Use quantity 1 if they do not specify one. Do not add products just because the user is browsing or asking questions.
    When the user asks what is in their cart or whether a cart item is available, use getCartDetails for the current cart and live stock. Do not use product search to answer questions about the user's cart. If an item's stock is unknown, say availability could not be checked; do not describe it as out of stock.
    When the user wants to return an order, use the returnOrder tool. Ask for the order ID and reason if they haven't provided them. Example order IDs are 11111, 22222, and 33333.`,
    tools: {
      searchProducts,
      getAllCategories,
      returnOrder,
      getProductDetails,
      addToCart,
      getCartDetails,
    },
  });

  await agent.stream({
    messages: modelMessages,
    writable: getWritable<ModelCallStreamPart>(),
  });
}
