import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { token: string };
}

/**
 * Public viewer for a shared wishlist (Phase 6 — viral mechanic).
 * Anyone with the URL can browse the wishlist; no login required.
 * Owner controls visibility by rotating or revoking the token.
 */
export default async function SharedWishlistPage({ params }: PageProps) {
  const user = await prisma.user.findUnique({
    where: { wishlistShareToken: params.token },
    select: { id: true, name: true },
  });

  if (!user) notFound();

  const items = await prisma.wishlist.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          storeProducts: {
            where: { store: { isActive: true } },
            include: { store: true },
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  const totalCount = items.length;
  const ownerDisplay = user.name?.split(" (")[0] ?? "A Price Hunter user";

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="border rounded-xl p-6 mb-6 bg-muted/30">
        <p className="text-sm uppercase tracking-wider text-muted-foreground mb-1">
          Shared wishlist
        </p>
        <h1 className="text-3xl font-bold mb-2">{ownerDisplay}&apos;s picks</h1>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{totalCount}</strong> items
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          This wishlist is empty.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const cheapest = item.product.storeProducts[0];
            return (
              <Link
                key={item.id}
                href={`/product/${item.product.slug}`}
                className="border rounded-lg p-4 hover:bg-muted/30 transition-colors flex gap-3"
              >
                <div className="relative w-20 h-20 flex-shrink-0 bg-muted rounded">
                  {item.product.image ? (
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      className="object-contain p-2"
                      sizes="80px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium line-clamp-2 mb-1">
                    {item.product.name}
                  </p>
                  {item.product.brand && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {item.product.brand}
                    </p>
                  )}
                  {cheapest ? (
                    <p className="font-bold">
                      {formatPrice(
                        Number(cheapest.price),
                        cheapest.currency
                      )}
                      <span className="text-xs text-muted-foreground font-normal ml-1">
                        at {cheapest.store.name}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No prices available
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-10 text-center text-sm text-muted-foreground">
        <p>
          Powered by{" "}
          <Link href="/" className="underline hover:text-foreground">
            Price Hunter
          </Link>{" "}
          · Track your own deals.
        </p>
      </div>
    </div>
  );
}
