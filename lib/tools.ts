import { tool } from "ai";
import { z } from "zod";
import {
  ApiRequestError,
  cartAdd,
  cartGet,
  createReturn,
  getCategories,
  getOrder,
  getProductById,
  getProductStock,
  getProducts,
  preauthorizeRefund,
  notifyReturnInProcess,
} from "@/lib/api";
import { getCartToken, getOrCreateCartToken } from "@/lib/cart-token";
import { start } from "workflow/api";
import { returnFlow } from "./workflows/return-flow";

export const searchProducts = tool({
  description: `Search the Vercel swag store product catalog. Use this whenever the user asks about products, what the store sells, or wants recommendations. Optionally narrow results to a single category.`,
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        `Optional free-text search terms describing what the user is looking for, e.g. 'hoodie' or 'water bottle'.`,
      ),
    category: z
      .string()
      .optional()
      .describe(
        `Optional category slug to filter results. Only set this when the user clearly wants a specific category. Use the getAllCategories tool to get all valid categories.`,
      ),
  }),
  execute: async ({ query, category }) => {
    "use step";
    try {
      const products = await getProducts({
        search: query,
        category,
        limit: 10,
      });
      return {
        count: products.length,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          image: p.images[0],
          price: p.price,
          currency: p.currency,
          category: p.category,
          description: p.description,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, products: [], error: message };
    }
  },
});

export const getProductDetails = tool({
  description: `Get the full catalog details and live stock for one specific product, including its description, price, all product images, category, tags, and availability. Use this when the user asks about a particular item (for example, "Tell me more about the black hoodie"). If you do not know the exact product id or slug, first use searchProducts to identify it, then call this tool.`,
  inputSchema: z.object({
    idOrSlug: z
      .string()
      .trim()
      .min(1)
      .describe("The exact product id or slug, usually from searchProducts."),
  }),
  execute: async ({ idOrSlug }) => {
    "use step";
    try {
      const [product, stock] = await Promise.all([
        getProductById(idOrSlug),
        getProductStock(idOrSlug),
      ]);
      return { product, stock };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { error: message };
    }
  },
});

export const addToCart = tool({
  description: `Add one specific product to the user's shopping cart. Use only when the user explicitly asks to add or buy an item, not when they are only browsing or asking questions. Identify the exact product first with searchProducts if needed. Use the product id from the catalog, and use quantity 1 when the user does not specify a quantity.`,
  inputSchema: z.object({
    productId: z
      .string()
      .trim()
      .min(1)
      .describe("The product id from the store catalog."),
    quantity: z
      .number()
      .int()
      .min(1)
      .max(99)
      .default(1)
      .describe("Number of units to add; defaults to 1."),
  }),
  execute: async ({ productId, quantity }) => {
    "use step";
    try {
      const product = await getProductById(productId);
      const token = await getOrCreateCartToken();
      const cart = await cartAdd(token, product.id, quantity);

      return {
        success: true,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          image: product.images[0] ?? null,
          price: product.price,
          currency: product.currency,
        },
        quantity,
        itemCount: cart.totalItems,
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { error: message };
    }
  },
});

export const getCartDetails = tool({
  description: `Read the current shopping cart and check live stock for every item in it. Use this when the user asks what is in their cart, how many items they have, or whether cart items are currently available. This is read-only and does not change the cart. A null stock value means that item's availability could not be checked; do not treat it as out of stock.`,
  inputSchema: z.object({}),
  execute: async () => {
    "use step";
    try {
      const token = await getCartToken();
      if (!token) {
        return {
          items: [],
          itemCount: 0,
          subtotal: 0,
          currency: "USD",
        };
      }

      const cart = await cartGet(token);
      const stockResults = await Promise.allSettled(
        cart.items.map((item) => getProductStock(item.productId)),
      );

      const items = cart.items.map((item, index) => {
        const result = stockResults[index];
        const stock = result?.status === "fulfilled" ? result.value : null;

        return {
          productId: item.productId,
          product: {
            name: item.product.name,
            slug: item.product.slug,
            image: item.product.images[0] ?? null,
            price: item.product.price,
            currency: item.product.currency,
          },
          quantity: item.quantity,
          lineTotal: item.lineTotal,
          stock,
        };
      });

      return {
        items,
        itemCount: cart.totalItems,
        subtotal: cart.subtotal,
        currency: cart.currency,
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { error: message };
    }
  },
});

export const getAllCategories = tool({
  description: `List every product category available in the Vercel swag store, along with the number of products in each. Use this when the user asks what categories exist, what kinds of products are sold, or wants to browse the store at a high level.`,
  inputSchema: z.object({}),
  execute: async () => {
    "use step";
    try {
      const categories = await getCategories();
      return {
        count: categories.length,
        categories: categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          productCount: c.productCount,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, categories: [], error: message };
    }
  },
});

export const returnOrder = tool({
  description: `File a return for one of the user's past orders. The user must provide an order ID and a reason. Example order IDs: 11111, 22222, 33333.`,
  inputSchema: z.object({
    orderId: z.string().describe("The order ID the user wants to return."),
    reason: z
      .string()
      .min(10)
      .max(500)
      .describe("Why the user is returning the order."),
  }),
  execute: async ({ orderId, reason }) => {
    "use step";
    const run = await start(returnFlow, [orderId, reason]);
    return {
      runId: run.runId,
      message: `Return request received for order ${orderId}.`,
    };
  },
});
