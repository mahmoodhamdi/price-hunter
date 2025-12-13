# Affiliate Links & Coupons Implementation Plan

## Overview
Implement affiliate link tracking and coupon system to monetize Price Hunter.

## Phase 1: Affiliate Link System

### 1.1 Database Schema Updates
Add to Prisma schema:
```prisma
model AffiliateClick {
  id          String   @id @default(cuid())
  userId      String?
  storeId     String
  productId   String?
  url         String
  referrer    String?
  userAgent   String?
  ipHash      String   // Hashed for privacy
  converted   Boolean  @default(false)
  revenue     Decimal? @db.Decimal(10, 2)
  createdAt   DateTime @default(now())

  user    User?   @relation(fields: [userId], references: [id])
  store   Store   @relation(fields: [storeId], references: [id])
  product Product? @relation(fields: [productId], references: [id])

  @@index([storeId, createdAt])
  @@map("affiliate_clicks")
}

// Update Store model
model Store {
  // ... existing fields
  affiliateTag    String?  // e.g., "pricehunter-21" for Amazon
  affiliateRate   Decimal? @db.Decimal(5, 2) // Commission rate %
  affiliateClicks AffiliateClick[]
}
```

### 1.2 Affiliate Link Generator Service
File: `src/lib/services/affiliate.ts`

```typescript
// Generate affiliate URL for each store
export function generateAffiliateUrl(store: Store, originalUrl: string): string {
  switch (store.slug) {
    case 'amazon-sa':
    case 'amazon-eg':
    case 'amazon-ae':
      return addAmazonTag(originalUrl, store.affiliateTag);
    case 'noon-sa':
    case 'noon-eg':
    case 'noon-ae':
      return addNoonTracking(originalUrl);
    // ... other stores
  }
}
```

### 1.3 Click Tracking API
File: `src/app/api/go/[storeProductId]/route.ts`

- Log click to database
- Redirect to affiliate URL
- Track conversion via postback URLs

### 1.4 Update Store Links
- Replace all direct store links with `/api/go/[id]`
- Add click tracking on "Visit Store" buttons

## Phase 2: Coupons System

### 2.1 Database Schema
```prisma
model Coupon {
  id          String    @id @default(cuid())
  storeId     String
  store       Store     @relation(fields: [storeId], references: [id])

  code        String
  description String
  descriptionAr String?
  discount    String    // "10% OFF", "50 SAR OFF"
  minPurchase Decimal?  @db.Decimal(10, 2)
  maxDiscount Decimal?  @db.Decimal(10, 2)

  startDate   DateTime?
  endDate     DateTime?
  isActive    Boolean   @default(true)
  isVerified  Boolean   @default(false)
  usageCount  Int       @default(0)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([storeId, isActive])
  @@map("coupons")
}
```

### 2.2 Coupons API
- GET /api/coupons - List all active coupons
- GET /api/coupons?store=amazon-sa - Filter by store
- POST /api/admin/coupons - Create coupon (admin)
- PATCH /api/admin/coupons/[id] - Update coupon
- DELETE /api/admin/coupons/[id] - Delete coupon

### 2.3 Coupons Pages
- `/coupons` - All coupons listing
- `/coupons/[store]` - Store-specific coupons
- Admin panel for coupon management

### 2.4 Coupon Components
- CouponCard - Display coupon with copy button
- CouponModal - Coupon details popup
- CouponBadge - Show on product cards if coupon available

## Implementation Steps

1. Run Prisma migration for new models
2. Create affiliate service
3. Create click tracking API
4. Update PriceComparison component links
5. Create coupons API routes
6. Create coupons page
7. Create admin coupon management
8. Add coupon badges to product cards
9. Write tests
10. Commit and push

## Testing
- Unit tests for affiliate URL generation
- Integration tests for click tracking
- E2E tests for coupon display and copy
