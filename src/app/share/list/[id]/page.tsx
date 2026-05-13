import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getShoppingList } from "@/lib/services/shopping-list";
import { formatPrice } from "@/lib/utils";

/**
 * Public, read-only view of a shared shopping list (Phase 6 — viral
 * differentiation). Only renders if the list is marked `isPublic`.
 *
 * No login required. The URL is the only credential — owners share
 * `https://<host>/share/list/<id>` and anyone with the link sees the items.
 */

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function PublicShoppingListPage({ params }: PageProps) {
  // First verify the list is public — getShoppingList includes both private
  // and public results when no userId is passed, so we re-check the flag.
  const raw = await prisma.shoppingList.findUnique({
    where: { id: params.id },
    select: { isPublic: true, name: true },
  });

  if (!raw || !raw.isPublic) notFound();

  const list = await getShoppingList(params.id);
  if (!list) notFound();

  const purchased = list.items.filter((i) => i.isPurchased).length;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="border rounded-xl p-6 mb-6 bg-muted/30">
        <p className="text-sm uppercase tracking-wider text-muted-foreground mb-1">
          Shared shopping list
        </p>
        <h1 className="text-3xl font-bold mb-2">{list.name}</h1>
        {list.description && (
          <p className="text-muted-foreground mb-4">{list.description}</p>
        )}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{list.itemCount}</strong> items
          </span>
          <span>
            <strong className="text-foreground">{purchased}</strong> checked off
          </span>
          <span>
            Estimated total:{" "}
            <strong className="text-foreground">
              {formatPrice(list.totalPrice, list.currency)}
            </strong>
          </span>
        </div>
      </div>

      {list.items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          This list is empty.
        </p>
      ) : (
        <ul className="space-y-3">
          {list.items.map((item) => (
            <li
              key={item.id}
              className={`border rounded-lg p-4 flex gap-4 items-center ${
                item.isPurchased ? "opacity-60 bg-muted/30" : ""
              }`}
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-muted rounded">
                {item.productImage ? (
                  <Image
                    src={item.productImage}
                    alt={item.productName}
                    fill
                    className="object-contain p-2"
                    sizes="64px"
                  />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/product/${item.productId}`}
                  className="font-medium hover:underline line-clamp-1"
                >
                  {item.productName}
                </Link>
                <p className="text-sm text-muted-foreground">
                  Qty: {item.quantity} · cheapest at {item.storeName}
                </p>
                {item.notes && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    {item.notes}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold">
                  {formatPrice(item.lowestPrice, item.currency)}
                </p>
                {item.isPurchased && (
                  <span className="text-xs text-emerald-600 font-medium">
                    ✓ Got this
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 text-center text-sm text-muted-foreground">
        <p>
          Powered by{" "}
          <Link href="/" className="underline hover:text-foreground">
            Price Hunter
          </Link>{" "}
          · Find better prices on every item in this list.
        </p>
      </div>
    </div>
  );
}
