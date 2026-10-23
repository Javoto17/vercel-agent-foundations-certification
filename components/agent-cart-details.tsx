"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { GetCartDetailsToolInvocation } from "@/lib/agent";

interface AgentCartDetailsProps {
  invocation: GetCartDetailsToolInvocation;
}

export function AgentCartDetails({ invocation }: AgentCartDetailsProps) {
  if (
    invocation.state === "input-streaming" ||
    invocation.state === "input-available"
  ) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Checking your cart and live availability…
      </div>
    );
  }

  if (invocation.state !== "output-available") return null;

  const output = invocation.output;
  if (!output) return null;

  if ("error" in output) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Could not load your cart: {output.error}
      </div>
    );
  }

  if (!("items" in output) || !Array.isArray(output.items)) {
    return null;
  }

  if (output.items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Your cart is empty.
      </div>
    );
  }

  const currency = output.currency || "USD";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">
          Your cart ({output.itemCount} {output.itemCount === 1 ? "item" : "items"})
        </h3>
      </div>
      <ul className="divide-y divide-border">
        {output.items.map((item) => {
          const stock = item.stock;
          const availability = !stock
            ? "Availability unknown"
            : !stock.inStock
              ? "Out of stock"
              : stock.stock < item.quantity
                ? `Only ${stock.stock} available — fewer than in your cart`
                : stock.lowStock
                  ? `Low stock · ${stock.stock} available`
                  : `In stock · ${stock.stock} available`;
          const unavailable = !stock || !stock.inStock || stock.stock < item.quantity;

          return (
            <li key={item.productId} className="flex items-center gap-3 p-3">
              <Link
                href={`/products/${item.product.slug}`}
                className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary"
                aria-label={`View ${item.product.name}`}
              >
                {item.product.image && (
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${item.product.slug}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {item.product.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} × {formatPrice(item.product.price, currency)}
                </p>
                <p
                  className={`text-xs ${
                    unavailable ? "text-destructive" : "text-muted-foreground"
                  }`}
                  role="status"
                >
                  {availability}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium tabular-nums">
                {formatPrice(item.lineTotal, currency)}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm font-semibold">
        <span>Subtotal</span>
        <span>{formatPrice(output.subtotal, currency)}</span>
      </div>
    </div>
  );
}
