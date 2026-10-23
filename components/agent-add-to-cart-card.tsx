"use client";

import { useEffect } from "react";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import type { AddToCartToolInvocation } from "@/lib/agent";
import { useCart } from "@/components/cart-provider";

interface AgentAddToCartCardProps {
  invocation: AddToCartToolInvocation;
}

export function AgentAddToCartCard({ invocation }: AgentAddToCartCardProps) {
  const { openCart, refreshCart } = useCart();

  useEffect(() => {
    if (invocation.state !== "output-available") return;

    const output = invocation.output;
    if (!output || "error" in output) return;

    void refreshCart().catch((error: unknown) => {
      console.error("Failed to refresh cart after agent add", error);
    });
  }, [invocation.state, invocation.output, refreshCart]);

  if (
    invocation.state === "input-streaming" ||
    invocation.state === "input-available"
  ) {
    const productId = invocation.input?.productId;
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Adding{productId ? ` product ${productId}` : " product"} to your cart…
      </div>
    );
  }

  if (invocation.state !== "output-available") return null;

  const output = invocation.output;
  if (!output) return null;

  if ("error" in output) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Could not add the item to your cart: {output.error}
      </div>
    );
  }

  if (!("product" in output) || !output.product) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        The item was added, but its details are unavailable.
      </div>
    );
  }

  const { product } = output;
  const quantity = "quantity" in output ? output.quantity : 1;
  const itemCount = "itemCount" in output ? output.itemCount : undefined;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-secondary">
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="64px"
            className="object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Added to your cart</p>
        <p className="truncate text-sm">{product.name}</p>
        <p className="text-xs text-muted-foreground">
          {quantity} × {formatPrice(product.price, product.currency)}
          {typeof itemCount === "number" ? ` · ${itemCount} items in cart` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={openCart}
        className="shrink-0 text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        View cart
      </button>
    </div>
  );
}
