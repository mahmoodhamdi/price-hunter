import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";

export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  itemCount: number;
  totalPrice: number;
  currency: Currency;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingListItem {
  id: string;
  listId: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  quantity: number;
  notes?: string | null;
  isPurchased: boolean;
  lowestPrice: number;
  currency: Currency;
  storeName: string;
  storeUrl: string;
  addedAt: Date;
}

export interface ShoppingListWithItems extends ShoppingList {
  items: ShoppingListItem[];
}

export interface ShoppingListSummary {
  listId: string;
  totalItems: number;
  purchasedItems: number;
  totalPrice: number;
  savingsFromLowest: number;
  currency: Currency;
  storeBreakdown: {
    storeName: string;
    itemCount: number;
    totalPrice: number;
  }[];
}

// Get all shopping lists for a user
export async function getUserShoppingLists(
  userId: string
): Promise<ShoppingList[]> {
  const lists = await prisma.shoppingList.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              storeProducts: {
                orderBy: { price: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return lists.map((list) => {
    const totalPrice = list.items.reduce((sum, item) => {
      const lowestPrice = item.product.storeProducts[0]?.price || 0;
      return sum + Number(lowestPrice) * item.quantity;
    }, 0);

    return {
      id: list.id,
      userId: list.userId,
      name: list.name,
      description: list.description,
      isPublic: list.isPublic,
      itemCount: list.items.length,
      totalPrice: Math.round(totalPrice * 100) / 100,
      currency: list.items[0]?.product.storeProducts[0]?.currency || Currency.SAR,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    };
  });
}

// Get a single shopping list with items
export async function getShoppingList(
  listId: string,
  userId?: string
): Promise<ShoppingListWithItems | null> {
  const list = await prisma.shoppingList.findFirst({
    where: {
      id: listId,
      OR: [{ userId }, { isPublic: true }],
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              storeProducts: {
                include: { store: true },
                orderBy: { price: "asc" },
              },
            },
          },
        },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  if (!list) {
    return null;
  }

  const items: ShoppingListItem[] = list.items.map((item) => {
    const lowestStoreProduct = item.product.storeProducts[0];
    return {
      id: item.id,
      listId: item.listId,
      productId: item.productId,
      productName: item.product.name,
      productImage: item.product.image,
      quantity: item.quantity,
      notes: item.notes,
      isPurchased: item.isPurchased,
      lowestPrice: Number(lowestStoreProduct?.price || 0),
      currency: lowestStoreProduct?.currency || Currency.SAR,
      storeName: lowestStoreProduct?.store.name || "Unknown",
      storeUrl: lowestStoreProduct?.url || "",
      addedAt: item.addedAt,
    };
  });

  const totalPrice = items.reduce(
    (sum, item) => sum + item.lowestPrice * item.quantity,
    0
  );

  return {
    id: list.id,
    userId: list.userId,
    name: list.name,
    description: list.description,
    isPublic: list.isPublic,
    itemCount: items.length,
    totalPrice: Math.round(totalPrice * 100) / 100,
    currency: items[0]?.currency || Currency.SAR,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    items,
  };
}

// Create a new shopping list
export async function createShoppingList(data: {
  userId: string;
  name: string;
  description?: string;
  isPublic?: boolean;
}): Promise<ShoppingList> {
  const list = await prisma.shoppingList.create({
    data: {
      userId: data.userId,
      name: data.name,
      description: data.description,
      isPublic: data.isPublic ?? false,
    },
  });

  return {
    id: list.id,
    userId: list.userId,
    name: list.name,
    description: list.description,
    isPublic: list.isPublic,
    itemCount: 0,
    totalPrice: 0,
    currency: Currency.SAR,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  };
}

// Update a shopping list
export async function updateShoppingList(
  userId: string,
  listId: string,
  data: {
    name?: string;
    description?: string;
    isPublic?: boolean;
  }
): Promise<ShoppingList | null> {
  const existing = await prisma.shoppingList.findFirst({
    where: { id: listId, userId },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.shoppingList.update({
    where: { id: listId },
    data: {
      name: data.name,
      description: data.description,
      isPublic: data.isPublic,
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              storeProducts: {
                orderBy: { price: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const totalPrice = updated.items.reduce((sum, item) => {
    const lowestPrice = item.product.storeProducts[0]?.price || 0;
    return sum + Number(lowestPrice) * item.quantity;
  }, 0);

  return {
    id: updated.id,
    userId: updated.userId,
    name: updated.name,
    description: updated.description,
    isPublic: updated.isPublic,
    itemCount: updated.items.length,
    totalPrice: Math.round(totalPrice * 100) / 100,
    currency: updated.items[0]?.product.storeProducts[0]?.currency || Currency.SAR,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

// Delete a shopping list
export async function deleteShoppingList(
  userId: string,
  listId: string
): Promise<boolean> {
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, userId },
  });

  if (!list) {
    return false;
  }

  await prisma.shoppingList.delete({
    where: { id: listId },
  });

  return true;
}

// Add item to shopping list
export async function addItemToList(
  userId: string,
  listId: string,
  data: {
    productId: string;
    quantity?: number;
    notes?: string;
  }
): Promise<ShoppingListItem | null> {
  // Verify list ownership
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, userId },
  });

  if (!list) {
    return null;
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
    include: {
      storeProducts: {
        include: { store: true },
        orderBy: { price: "asc" },
      },
    },
  });

  if (!product) {
    return null;
  }

  // Check if item already in list
  const existing = await prisma.shoppingListItem.findUnique({
    where: {
      listId_productId: {
        listId,
        productId: data.productId,
      },
    },
  });

  if (existing) {
    // Update quantity
    const updated = await prisma.shoppingListItem.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + (data.quantity || 1),
        notes: data.notes || existing.notes,
      },
    });

    const lowestStoreProduct = product.storeProducts[0];
    return {
      id: updated.id,
      listId: updated.listId,
      productId: updated.productId,
      productName: product.name,
      productImage: product.image,
      quantity: updated.quantity,
      notes: updated.notes,
      isPurchased: updated.isPurchased,
      lowestPrice: Number(lowestStoreProduct?.price || 0),
      currency: lowestStoreProduct?.currency || Currency.SAR,
      storeName: lowestStoreProduct?.store.name || "Unknown",
      storeUrl: lowestStoreProduct?.url || "",
      addedAt: updated.addedAt,
    };
  }

  // Create new item
  const item = await prisma.shoppingListItem.create({
    data: {
      listId,
      productId: data.productId,
      quantity: data.quantity || 1,
      notes: data.notes,
    },
  });

  // Update list timestamp
  await prisma.shoppingList.update({
    where: { id: listId },
    data: { updatedAt: new Date() },
  });

  const lowestStoreProduct = product.storeProducts[0];
  return {
    id: item.id,
    listId: item.listId,
    productId: item.productId,
    productName: product.name,
    productImage: product.image,
    quantity: item.quantity,
    notes: item.notes,
    isPurchased: item.isPurchased,
    lowestPrice: Number(lowestStoreProduct?.price || 0),
    currency: lowestStoreProduct?.currency || Currency.SAR,
    storeName: lowestStoreProduct?.store.name || "Unknown",
    storeUrl: lowestStoreProduct?.url || "",
    addedAt: item.addedAt,
  };
}

// Update item in list
export async function updateListItem(
  userId: string,
  itemId: string,
  data: {
    quantity?: number;
    notes?: string;
    isPurchased?: boolean;
  }
): Promise<ShoppingListItem | null> {
  const item = await prisma.shoppingListItem.findFirst({
    where: {
      id: itemId,
      list: { userId },
    },
    include: {
      product: {
        include: {
          storeProducts: {
            include: { store: true },
            orderBy: { price: "asc" },
          },
        },
      },
    },
  });

  if (!item) {
    return null;
  }

  const updated = await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: {
      quantity: data.quantity,
      notes: data.notes,
      isPurchased: data.isPurchased,
    },
  });

  const lowestStoreProduct = item.product.storeProducts[0];
  return {
    id: updated.id,
    listId: updated.listId,
    productId: updated.productId,
    productName: item.product.name,
    productImage: item.product.image,
    quantity: updated.quantity,
    notes: updated.notes,
    isPurchased: updated.isPurchased,
    lowestPrice: Number(lowestStoreProduct?.price || 0),
    currency: lowestStoreProduct?.currency || Currency.SAR,
    storeName: lowestStoreProduct?.store.name || "Unknown",
    storeUrl: lowestStoreProduct?.url || "",
    addedAt: updated.addedAt,
  };
}

// Remove item from list
export async function removeItemFromList(
  userId: string,
  itemId: string
): Promise<boolean> {
  const item = await prisma.shoppingListItem.findFirst({
    where: {
      id: itemId,
      list: { userId },
    },
  });

  if (!item) {
    return false;
  }

  await prisma.shoppingListItem.delete({
    where: { id: itemId },
  });

  return true;
}

// Get shopping list summary
export async function getShoppingListSummary(
  listId: string,
  userId?: string
): Promise<ShoppingListSummary | null> {
  const list = await getShoppingList(listId, userId);

  if (!list) {
    return null;
  }

  const storeBreakdown: Record<string, { itemCount: number; totalPrice: number }> = {};

  for (const item of list.items) {
    const storeName = item.storeName;
    if (!storeBreakdown[storeName]) {
      storeBreakdown[storeName] = { itemCount: 0, totalPrice: 0 };
    }
    storeBreakdown[storeName].itemCount += item.quantity;
    storeBreakdown[storeName].totalPrice += item.lowestPrice * item.quantity;
  }

  const purchasedItems = list.items.filter((i) => i.isPurchased).length;

  return {
    listId: list.id,
    totalItems: list.items.reduce((sum, i) => sum + i.quantity, 0),
    purchasedItems,
    totalPrice: list.totalPrice,
    savingsFromLowest: 0, // Would calculate from highest vs lowest prices
    currency: list.currency,
    storeBreakdown: Object.entries(storeBreakdown).map(([storeName, data]) => ({
      storeName,
      itemCount: data.itemCount,
      totalPrice: Math.round(data.totalPrice * 100) / 100,
    })),
  };
}

// Copy shopping list
export async function copyShoppingList(
  sourceListId: string,
  userId: string,
  newName?: string
): Promise<ShoppingList | null> {
  const sourceList = await prisma.shoppingList.findFirst({
    where: {
      id: sourceListId,
      OR: [{ userId }, { isPublic: true }],
    },
    include: { items: true },
  });

  if (!sourceList) {
    return null;
  }

  const newList = await prisma.shoppingList.create({
    data: {
      userId,
      name: newName || `Copy of ${sourceList.name}`,
      description: sourceList.description,
      isPublic: false,
      items: {
        create: sourceList.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes,
        })),
      },
    },
  });

  return {
    id: newList.id,
    userId: newList.userId,
    name: newList.name,
    description: newList.description,
    isPublic: newList.isPublic,
    itemCount: sourceList.items.length,
    totalPrice: 0,
    currency: Currency.SAR,
    createdAt: newList.createdAt,
    updatedAt: newList.updatedAt,
  };
}

// Share shopping list (make public)
export async function shareShoppingList(
  userId: string,
  listId: string
): Promise<{ shareUrl: string } | null> {
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, userId },
  });

  if (!list) {
    return null;
  }

  await prisma.shoppingList.update({
    where: { id: listId },
    data: { isPublic: true },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pricehunter.app";
  return { shareUrl: `${baseUrl}/lists/${listId}` };
}

// Get public shopping lists
export async function getPublicShoppingLists(
  limit = 10
): Promise<ShoppingList[]> {
  const lists = await prisma.shoppingList.findMany({
    where: { isPublic: true },
    include: {
      items: {
        include: {
          product: {
            include: {
              storeProducts: {
                orderBy: { price: "asc" },
                take: 1,
              },
            },
          },
        },
      },
      user: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return lists.map((list) => {
    const totalPrice = list.items.reduce((sum, item) => {
      const lowestPrice = item.product.storeProducts[0]?.price || 0;
      return sum + Number(lowestPrice) * item.quantity;
    }, 0);

    return {
      id: list.id,
      userId: list.userId,
      name: list.name,
      description: list.description,
      isPublic: list.isPublic,
      itemCount: list.items.length,
      totalPrice: Math.round(totalPrice * 100) / 100,
      currency: list.items[0]?.product.storeProducts[0]?.currency || Currency.SAR,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    };
  });
}
