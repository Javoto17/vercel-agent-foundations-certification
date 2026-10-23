"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { ProductDetailsToolInvocation } from "@/lib/agent";

interface AgentProductCardProps {
  invocation: ProductDetailsToolInvocation;
}

export function AgentProductCard({ invocation }: AgentProductCardProps) {
  if (
    invocation.state === "input-streaming" ||
    invocation.state === "input-available"
  ) {
    const idOrSlug = invocation.input?.idOrSlug;
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Looking up{idOrSlug ? ` "${idOrSlug}"` : " product"}…
      </div>
    );
  }

  if (invocation.state !== "output-available") return null;

  const output = invocation.output;

  if (!output) return null;

  if ("error" in output) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {output.error || "Could not load product details."}
      </div>
    );
  }

  if (
    !("product" in output) ||
    !output.product ||
    !("stock" in output) ||
    !output.stock
  ) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Product details are unavailable.
      </div>
    );
  }

  const { product, stock } = output;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {product.images[0] && (
        <div className="relative aspect-4/3 bg-secondary">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 480px, 100vw"
            className="object-cover"
          />
        </div>
      )}
      {product.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3">
          {product.images.slice(1).map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary"
            >
              <Image
                src={image}
                alt={`${product.name}, image ${index + 2}`}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
      <div className="space-y-3 p-4">
        <div>
          {product.featured && (
            <span className="mb-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              Featured
            </span>
          )}
          <p className="text-xs capitalize text-muted-foreground">
            {product.category}
          </p>
          <h3 className="text-base font-semibold leading-tight">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {formatPrice(product.price, product.currency)}
          </p>
        </div>

        <p
          className={`text-sm ${
            stock.inStock ? "text-foreground" : "text-destructive"
          }`}
          role="status"
        >
          {stock.inStock
            ? `${stock.lowStock ? "Low stock" : "In stock"} · ${
                stock.stock
              } available`
            : "Out of stock"}
        </p>

        <p className="line-clamp-3 text-sm text-muted-foreground">
          {product.description}
        </p>

        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <Link
          href={`/products/${product.slug}`}
          className="inline-flex text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          View product →
        </Link>
      </div>
    </div>
  );
}
