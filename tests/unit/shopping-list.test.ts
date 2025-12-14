import { describe, it, expect, vi, beforeEach } from "vitest";
import { Currency } from "@prisma/client";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    shoppingList: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    shoppingListItem: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Shopping List Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getUserShoppingLists", () => {
    it("should return user shopping lists with item counts and totals", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getUserShoppingLists } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findMany).mockResolvedValue([
        {
          id: "list1",
          userId: "user1",
          name: "Weekly Groceries",
          description: "My weekly shopping",
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [
            {
              id: "item1",
              quantity: 2,
              product: {
                storeProducts: [{ price: 50, currency: Currency.SAR }],
              },
            },
            {
              id: "item2",
              quantity: 1,
              product: {
                storeProducts: [{ price: 30, currency: Currency.SAR }],
              },
            },
          ],
        },
      ] as any);

      const lists = await getUserShoppingLists("user1");

      expect(lists).toHaveLength(1);
      expect(lists[0].name).toBe("Weekly Groceries");
      expect(lists[0].itemCount).toBe(2);
      expect(lists[0].totalPrice).toBe(130); // 50*2 + 30*1
    });

    it("should handle empty lists", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getUserShoppingLists } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findMany).mockResolvedValue([]);

      const lists = await getUserShoppingLists("user1");

      expect(lists).toHaveLength(0);
    });
  });

  describe("getShoppingList", () => {
    it("should return shopping list with items", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getShoppingList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue({
        id: "list1",
        userId: "user1",
        name: "My List",
        description: null,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: "item1",
            listId: "list1",
            productId: "p1",
            quantity: 2,
            notes: "Get organic",
            isPurchased: false,
            addedAt: new Date(),
            product: {
              name: "Apples",
              image: "/apples.jpg",
              storeProducts: [
                {
                  price: 25,
                  currency: Currency.SAR,
                  url: "http://store.com/apples",
                  store: { name: "Store1" },
                },
              ],
            },
          },
        ],
      } as any);

      const list = await getShoppingList("list1", "user1");

      expect(list).toBeDefined();
      expect(list?.name).toBe("My List");
      expect(list?.items).toHaveLength(1);
      expect(list?.items[0].productName).toBe("Apples");
      expect(list?.items[0].lowestPrice).toBe(25);
    });

    it("should return null for non-existent list", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getShoppingList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(null);

      const list = await getShoppingList("nonexistent", "user1");

      expect(list).toBeNull();
    });

    it("should allow access to public lists without userId", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getShoppingList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue({
        id: "list1",
        userId: "user1",
        name: "Public List",
        description: null,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      } as any);

      const list = await getShoppingList("list1");

      expect(list).toBeDefined();
      expect(list?.name).toBe("Public List");
    });
  });

  describe("createShoppingList", () => {
    it("should create a new shopping list", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { createShoppingList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.create).mockResolvedValue({
        id: "newlist",
        userId: "user1",
        name: "New List",
        description: "Test description",
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const list = await createShoppingList({
        userId: "user1",
        name: "New List",
        description: "Test description",
      });

      expect(list.id).toBe("newlist");
      expect(list.name).toBe("New List");
      expect(list.itemCount).toBe(0);
      expect(list.totalPrice).toBe(0);
    });

    it("should create public list when specified", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { createShoppingList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.create).mockResolvedValue({
        id: "publiclist",
        userId: "user1",
        name: "Public List",
        description: null,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const list = await createShoppingList({
        userId: "user1",
        name: "Public List",
        isPublic: true,
      });

      expect(list.isPublic).toBe(true);
    });
  });

  describe("updateShoppingList", () => {
    it("should update shopping list details", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { updateShoppingList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue({
        id: "list1",
        userId: "user1",
      } as any);

      vi.mocked(prisma.shoppingList.update).mockResolvedValue({
        id: "list1",
        userId: "user1",
        name: "Updated Name",
        description: "Updated description",
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      } as any);

      const list = await updateShoppingList("user1", "list1", {
        name: "Updated Name",
        description: "Updated description",
        isPublic: true,
      });

      expect(list?.name).toBe("Updated Name");
      expect(list?.isPublic).toBe(true);
    });

    it("should return null for unauthorized update", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { updateShoppingList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(null);

      const list = await updateShoppingList("user2", "list1", {
        name: "Should not update",
      });

      expect(list).toBeNull();
    });
  });

  describe("deleteShoppingList", () => {
    it("should delete shopping list", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { deleteShoppingList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue({
        id: "list1",
        userId: "user1",
      } as any);

      vi.mocked(prisma.shoppingList.delete).mockResolvedValue({} as any);

      const result = await deleteShoppingList("user1", "list1");

      expect(result).toBe(true);
      expect(prisma.shoppingList.delete).toHaveBeenCalledWith({
        where: { id: "list1" },
      });
    });

    it("should return false for unauthorized delete", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { deleteShoppingList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(null);

      const result = await deleteShoppingList("user2", "list1");

      expect(result).toBe(false);
    });
  });

  describe("addItemToList", () => {
    it("should add new item to list", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { addItemToList } = await import("@/lib/services/shopping-list");

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue({
        id: "list1",
        userId: "user1",
      } as any);

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "p1",
        name: "Test Product",
        image: "/test.jpg",
        storeProducts: [
          {
            price: 100,
            currency: Currency.SAR,
            url: "http://store.com",
            store: { name: "Store1" },
          },
        ],
      } as any);

      vi.mocked(prisma.shoppingListItem.findUnique).mockResolvedValue(null);

      vi.mocked(prisma.shoppingListItem.create).mockResolvedValue({
        id: "item1",
        listId: "list1",
        productId: "p1",
        quantity: 2,
        notes: "Test note",
        isPurchased: false,
        addedAt: new Date(),
      } as any);

      vi.mocked(prisma.shoppingList.update).mockResolvedValue({} as any);

      const item = await addItemToList("user1", "list1", {
        productId: "p1",
        quantity: 2,
        notes: "Test note",
      });

      expect(item).toBeDefined();
      expect(item?.productName).toBe("Test Product");
      expect(item?.quantity).toBe(2);
      expect(item?.lowestPrice).toBe(100);
    });

    it("should increment quantity for existing item", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { addItemToList } = await import("@/lib/services/shopping-list");

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue({
        id: "list1",
        userId: "user1",
      } as any);

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "p1",
        name: "Test Product",
        image: null,
        storeProducts: [
          {
            price: 50,
            currency: Currency.SAR,
            url: "http://store.com",
            store: { name: "Store1" },
          },
        ],
      } as any);

      vi.mocked(prisma.shoppingListItem.findUnique).mockResolvedValue({
        id: "item1",
        listId: "list1",
        productId: "p1",
        quantity: 1,
        notes: null,
        isPurchased: false,
        addedAt: new Date(),
      } as any);

      vi.mocked(prisma.shoppingListItem.update).mockResolvedValue({
        id: "item1",
        listId: "list1",
        productId: "p1",
        quantity: 3, // 1 + 2
        notes: null,
        isPurchased: false,
        addedAt: new Date(),
      } as any);

      const item = await addItemToList("user1", "list1", {
        productId: "p1",
        quantity: 2,
      });

      expect(item?.quantity).toBe(3);
    });

    it("should return null for non-existent list", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { addItemToList } = await import("@/lib/services/shopping-list");

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(null);

      const item = await addItemToList("user1", "nonexistent", {
        productId: "p1",
      });

      expect(item).toBeNull();
    });

    it("should return null for non-existent product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { addItemToList } = await import("@/lib/services/shopping-list");

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue({
        id: "list1",
        userId: "user1",
      } as any);

      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const item = await addItemToList("user1", "list1", {
        productId: "nonexistent",
      });

      expect(item).toBeNull();
    });
  });

  describe("updateListItem", () => {
    it("should update item quantity and notes", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { updateListItem } = await import("@/lib/services/shopping-list");

      vi.mocked(prisma.shoppingListItem.findFirst).mockResolvedValue({
        id: "item1",
        listId: "list1",
        productId: "p1",
        quantity: 1,
        notes: null,
        isPurchased: false,
        addedAt: new Date(),
        list: { userId: "user1" },
        product: {
          name: "Test Product",
          image: null,
          storeProducts: [
            {
              price: 50,
              currency: Currency.SAR,
              url: "http://store.com",
              store: { name: "Store1" },
            },
          ],
        },
      } as any);

      vi.mocked(prisma.shoppingListItem.update).mockResolvedValue({
        id: "item1",
        listId: "list1",
        productId: "p1",
        quantity: 5,
        notes: "Updated note",
        isPurchased: false,
        addedAt: new Date(),
      } as any);

      const item = await updateListItem("user1", "item1", {
        quantity: 5,
        notes: "Updated note",
      });

      expect(item?.quantity).toBe(5);
      expect(item?.notes).toBe("Updated note");
    });

    it("should mark item as purchased", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { updateListItem } = await import("@/lib/services/shopping-list");

      vi.mocked(prisma.shoppingListItem.findFirst).mockResolvedValue({
        id: "item1",
        listId: "list1",
        productId: "p1",
        quantity: 1,
        notes: null,
        isPurchased: false,
        addedAt: new Date(),
        list: { userId: "user1" },
        product: {
          name: "Test Product",
          image: null,
          storeProducts: [
            {
              price: 50,
              currency: Currency.SAR,
              url: "http://store.com",
              store: { name: "Store1" },
            },
          ],
        },
      } as any);

      vi.mocked(prisma.shoppingListItem.update).mockResolvedValue({
        id: "item1",
        listId: "list1",
        productId: "p1",
        quantity: 1,
        notes: null,
        isPurchased: true,
        addedAt: new Date(),
      } as any);

      const item = await updateListItem("user1", "item1", {
        isPurchased: true,
      });

      expect(item?.isPurchased).toBe(true);
    });

    it("should return null for unauthorized update", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { updateListItem } = await import("@/lib/services/shopping-list");

      vi.mocked(prisma.shoppingListItem.findFirst).mockResolvedValue(null);

      const item = await updateListItem("user2", "item1", { quantity: 10 });

      expect(item).toBeNull();
    });
  });

  describe("removeItemFromList", () => {
    it("should remove item from list", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { removeItemFromList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingListItem.findFirst).mockResolvedValue({
        id: "item1",
        listId: "list1",
        list: { userId: "user1" },
      } as any);

      vi.mocked(prisma.shoppingListItem.delete).mockResolvedValue({} as any);

      const result = await removeItemFromList("user1", "item1");

      expect(result).toBe(true);
      expect(prisma.shoppingListItem.delete).toHaveBeenCalledWith({
        where: { id: "item1" },
      });
    });

    it("should return false for unauthorized remove", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { removeItemFromList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingListItem.findFirst).mockResolvedValue(null);

      const result = await removeItemFromList("user2", "item1");

      expect(result).toBe(false);
    });
  });

  describe("getShoppingListSummary", () => {
    it("should return list summary with store breakdown", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getShoppingListSummary } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue({
        id: "list1",
        userId: "user1",
        name: "My List",
        description: null,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: "item1",
            listId: "list1",
            productId: "p1",
            quantity: 2,
            notes: null,
            isPurchased: true,
            addedAt: new Date(),
            product: {
              name: "Product 1",
              image: null,
              storeProducts: [
                {
                  price: 50,
                  currency: Currency.SAR,
                  url: "http://store1.com",
                  store: { name: "Store1" },
                },
              ],
            },
          },
          {
            id: "item2",
            listId: "list1",
            productId: "p2",
            quantity: 1,
            notes: null,
            isPurchased: false,
            addedAt: new Date(),
            product: {
              name: "Product 2",
              image: null,
              storeProducts: [
                {
                  price: 100,
                  currency: Currency.SAR,
                  url: "http://store2.com",
                  store: { name: "Store2" },
                },
              ],
            },
          },
        ],
      } as any);

      const summary = await getShoppingListSummary("list1", "user1");

      expect(summary).toBeDefined();
      expect(summary?.totalItems).toBe(3); // 2 + 1
      expect(summary?.purchasedItems).toBe(1);
      expect(summary?.totalPrice).toBe(200); // 50*2 + 100*1
      expect(summary?.storeBreakdown).toHaveLength(2);
    });

    it("should return null for non-existent list", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getShoppingListSummary } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(null);

      const summary = await getShoppingListSummary("nonexistent");

      expect(summary).toBeNull();
    });
  });

  describe("copyShoppingList", () => {
    it("should copy shopping list with items", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { copyShoppingList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue({
        id: "list1",
        userId: "user1",
        name: "Original List",
        description: "Original description",
        isPublic: true,
        items: [
          { productId: "p1", quantity: 2, notes: "Note 1" },
          { productId: "p2", quantity: 1, notes: null },
        ],
      } as any);

      vi.mocked(prisma.shoppingList.create).mockResolvedValue({
        id: "newlist",
        userId: "user2",
        name: "Copy of Original List",
        description: "Original description",
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const list = await copyShoppingList("list1", "user2");

      expect(list).toBeDefined();
      expect(list?.name).toBe("Copy of Original List");
      expect(list?.itemCount).toBe(2);
    });

    it("should use custom name when provided", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { copyShoppingList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue({
        id: "list1",
        userId: "user1",
        name: "Original List",
        description: null,
        isPublic: true,
        items: [],
      } as any);

      vi.mocked(prisma.shoppingList.create).mockResolvedValue({
        id: "newlist",
        userId: "user2",
        name: "My Custom Name",
        description: null,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const list = await copyShoppingList("list1", "user2", "My Custom Name");

      expect(list?.name).toBe("My Custom Name");
    });

    it("should return null for inaccessible list", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { copyShoppingList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(null);

      const list = await copyShoppingList("nonexistent", "user1");

      expect(list).toBeNull();
    });
  });

  describe("shareShoppingList", () => {
    it("should make list public and return share URL", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { shareShoppingList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue({
        id: "list1",
        userId: "user1",
      } as any);

      vi.mocked(prisma.shoppingList.update).mockResolvedValue({} as any);

      const result = await shareShoppingList("user1", "list1");

      expect(result).toBeDefined();
      expect(result?.shareUrl).toContain("/lists/list1");
    });

    it("should return null for unauthorized share", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { shareShoppingList } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findFirst).mockResolvedValue(null);

      const result = await shareShoppingList("user2", "list1");

      expect(result).toBeNull();
    });
  });

  describe("getPublicShoppingLists", () => {
    it("should return public shopping lists", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPublicShoppingLists } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findMany).mockResolvedValue([
        {
          id: "list1",
          userId: "user1",
          name: "Public List 1",
          description: null,
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [
            {
              quantity: 1,
              product: {
                storeProducts: [{ price: 50, currency: Currency.SAR }],
              },
            },
          ],
          user: { name: "User 1" },
        },
        {
          id: "list2",
          userId: "user2",
          name: "Public List 2",
          description: "Description",
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
          user: { name: "User 2" },
        },
      ] as any);

      const lists = await getPublicShoppingLists(10);

      expect(lists).toHaveLength(2);
      expect(lists[0].isPublic).toBe(true);
      expect(lists[0].totalPrice).toBe(50);
    });

    it("should respect limit parameter", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPublicShoppingLists } = await import(
        "@/lib/services/shopping-list"
      );

      vi.mocked(prisma.shoppingList.findMany).mockResolvedValue([
        {
          id: "list1",
          userId: "user1",
          name: "List 1",
          description: null,
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
          user: { name: "User 1" },
        },
      ] as any);

      await getPublicShoppingLists(5);

      expect(prisma.shoppingList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });
  });
});
