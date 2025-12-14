# Price Hunter Service Files - Security & Code Review

## Executive Summary

This document provides a comprehensive security and code quality review of 5 service files in the Price Hunter project. The analysis covers bugs, security vulnerabilities, N+1 query issues, validation gaps, error handling, and race conditions.

---

## 1. Price Alerts Service (`D:\price-hunter\src\lib\services\price-alerts.ts`)

### Critical Issues

#### 1.1 Security Vulnerabilities

**Missing Input Validation**
- **Lines 92-95**: No validation for `targetPrice` (could be negative, zero, or extremely large)
- **Lines 92-95**: No validation for `userId` and `productId` format
- **Line 95**: No maximum limits on notification preferences

```typescript
// Current code has no validation
export async function createPriceAlert(input: CreateAlertInput): Promise<PriceAlert> {
  const { userId, productId, targetPrice, currency, ... } = input;
  // Missing: targetPrice validation, userId/productId format checks
}
```

**Recommendation**: Add input validation:
```typescript
if (targetPrice <= 0) throw new Error("Target price must be positive");
if (targetPrice > 1000000) throw new Error("Target price exceeds maximum");
```

#### 1.2 Race Conditions

**Critical Race Condition in `createPriceAlert`**
- **Lines 98-104**: Check-then-update pattern creates race condition
- Multiple concurrent requests could create duplicate alerts

```typescript
// VULNERABLE CODE
const existing = await prisma.priceAlert.findFirst({ ... });
if (existing) {
  // Race condition: Another request might update between check and update
  const alert = await prisma.priceAlert.update({ ... });
}
```

**Impact**: Users could end up with multiple active alerts for the same product.

**Recommendation**: Use Prisma's `upsert` operation or implement optimistic locking.

#### 1.3 N+1 Query Issues

**N+1 in `checkAndTriggerAlerts`**
- **Lines 293-333**: Loop executes individual updates and notification sends
- For 1000 alerts, this generates 1000+ database queries

```typescript
for (const alert of alerts) {
  // Individual update per alert
  await prisma.priceAlert.update({ where: { id: alert.id }, ... });
  // Individual notification sends
  await sendPriceAlertEmail(...);
  await sendPriceAlertTelegram(...);
}
```

**Impact**: Severe performance degradation with large alert volumes.

**Recommendation**: Batch updates using `updateMany` and queue notifications for background processing.

#### 1.4 Missing Error Handling

**No Error Handling for External Services**
- **Lines 311-330**: Email and Telegram notification failures not caught
- **Line 302**: Database update could fail, leaving alert in inconsistent state

```typescript
// No try-catch blocks
await sendPriceAlertEmail({ ... });
await sendPriceAlertTelegram({ ... });
```

**Impact**: Single notification failure could break entire cron job.

**Recommendation**: Wrap in try-catch blocks and implement retry logic.

#### 1.5 Business Logic Issues

**Missing Product Existence Check**
- **Lines 151-171**: Creates alert without verifying product exists
- Could create orphaned alerts if product ID is invalid

**Missing Alert Limits**
- No limit on alerts per user (potential abuse)
- No rate limiting on alert creation

### Medium Issues

#### 1.6 Data Consistency

**Potential Null Reference**
- **Lines 69, 131, 173, 225**: `alert.product.storeProducts[0]` could be undefined
- No explicit check before accessing array element

```typescript
const lowestPrice = alert.product.storeProducts[0]; // Could be undefined
return {
  currentPrice: lowestPrice ? Number(lowestPrice.price) : undefined, // Good fallback
}
```

**Recommendation**: Add explicit length check.

#### 1.7 Performance Issues

**Inefficient Pagination in `getUserAlerts`**
- **Lines 47-65**: Always includes full product data even for pagination
- Fetches price history unnecessarily

**Missing Index Usage**
- Query on `userId + isActive + triggered` combination not optimized in schema

---

## 2. Wishlist Service (`D:\price-hunter\src\lib\services\wishlist.ts`)

### Critical Issues

#### 2.1 Severe N+1 Query Problem

**Critical N+1 in `bulkAddToWishlist`**
- **Lines 307-332**: Sequential database queries for each product
- For 100 products: 100 findUnique + 100 create queries = 200 queries!

```typescript
for (const productId of productIds) {
  const existing = await prisma.wishlist.findUnique({ ... }); // N queries
  const product = await prisma.product.findUnique({ ... });    // N queries
  await prisma.wishlist.create({ ... });                      // N queries
}
```

**Impact**: Catastrophic performance for bulk operations.

**Recommendation**: Use `createMany` with `skipDuplicates: true`:
```typescript
const products = await prisma.product.findMany({
  where: { id: { in: productIds } }
});
await prisma.wishlist.createMany({
  data: products.map(p => ({ userId, productId: p.id })),
  skipDuplicates: true
});
```

#### 2.2 Race Conditions

**Race Condition in `addToWishlist`**
- **Lines 121-143**: Check-then-create pattern vulnerable to race conditions
- Concurrent requests could bypass unique constraint and cause errors

```typescript
// VULNERABLE CODE
const existing = await prisma.wishlist.findUnique({ ... });
if (existing) {
  // Return existing
}
// Race condition window here
const wishlistItem = await prisma.wishlist.create({ ... });
```

**Recommendation**: Use `upsert` or handle unique constraint violations gracefully.

#### 2.3 Missing Input Validation

**No Validation in Public Functions**
- **Lines 32, 109, 201**: No validation for `userId` or `productId`
- **Line 302**: `productIds` array not validated (could be empty or too large)

**Security Risk**: User could DOS the system by passing array of 100,000 product IDs.

**Recommendation**:
```typescript
if (!productIds || productIds.length === 0) throw new Error("Empty array");
if (productIds.length > 100) throw new Error("Max 100 products at once");
```

#### 2.4 Business Logic Flaws

**Inefficient `addToWishlist` Flow**
- **Lines 121-143**: Fetches existing item, then fetches it again with full relations
- Duplicate database query

```typescript
const existing = await prisma.wishlist.findUnique({ ... }); // First query
if (existing) {
  const fullItem = await prisma.wishlist.findUnique({        // Second query - DUPLICATE!
    where: { id: existing.id },
    include: { ... }
  });
}
```

**Recommendation**: Combine into single query with includes.

### Medium Issues

#### 2.5 Performance Issues

**Expensive `getWishlistStats` Query**
- **Lines 236-255**: Loads ALL wishlist items with full relations
- No pagination, could load thousands of records

```typescript
const wishlistItems = await prisma.wishlist.findMany({
  where: { userId },
  include: { product: { include: { storeProducts: { ... } } } }
});
```

**Impact**: Memory issues for users with large wishlists.

**Recommendation**: Use aggregation queries instead of loading all data.

#### 2.6 Missing Error Handling

**No Error Handling**
- All functions lack try-catch blocks
- Database errors propagate directly to caller

---

## 3. Cashback Service (`D:\price-hunter\src\lib\services\cashback.ts`)

### Critical Issues

#### 3.1 Authorization Vulnerability

**CRITICAL: Missing Authorization in `updateCashbackStatus`**
- **Lines 165-168**: No admin role check
- **Line 167**: Any user could approve their own cashback!

```typescript
export async function updateCashbackStatus(
  transactionId: string,
  status: CashbackStatus
): Promise<CashbackTransaction> {
  // MISSING: Admin role check
  // MISSING: Transaction ownership verification
  const transaction = await prisma.cashbackTransaction.update({ ... });
}
```

**Impact**: CRITICAL security flaw - users can self-approve cashback and steal money.

**Recommendation**: Add immediate authorization:
```typescript
export async function updateCashbackStatus(
  transactionId: string,
  status: CashbackStatus,
  adminUserId: string // Add this parameter
): Promise<CashbackTransaction> {
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId }
  });
  if (admin?.role !== 'ADMIN') throw new Error("Unauthorized");
  // Continue with update...
}
```

#### 3.2 Business Logic Vulnerabilities

**Missing Validation in `createCashbackTransaction`**
- **Lines 138-162**: No validation for amount (could be negative)
- **Line 147**: No check if affiliateClickId exists
- **Line 147**: No validation that click belongs to userId

```typescript
export async function createCashbackTransaction(data: {
  userId: string;
  affiliateClickId?: string;
  amount: number; // UNVALIDATED - could be negative or huge
  currency: Currency;
}): Promise<CashbackTransaction>
```

**Impact**: Fraudulent cashback creation.

**Recommendation**:
```typescript
if (amount <= 0) throw new Error("Invalid amount");
if (amount > 10000) throw new Error("Amount exceeds maximum");
if (affiliateClickId) {
  const click = await prisma.affiliateClick.findUnique({
    where: { id: affiliateClickId }
  });
  if (!click || click.userId !== data.userId) {
    throw new Error("Invalid affiliate click");
  }
}
```

#### 3.3 Race Conditions

**Race Condition in `processApprovedCashback`**
- **Lines 188-203**: Bulk update without transaction isolation
- Concurrent executions could double-approve transactions

**Race Condition in `requestWithdrawal`**
- **Lines 221-240**: Check-then-act pattern
- Amount could be withdrawn between check and action

```typescript
const available = await getPendingWithdrawals(userId);
if (amount > available) { ... }
// Race condition: Another withdrawal could happen here
// In production, would create withdrawal request
```

**Impact**: Double-spending vulnerability.

**Recommendation**: Use database transactions and row-level locking.

#### 3.4 N+1 Query Issues

**N+1 in `getCashbackTransactions`**
- **Lines 102-118**: Fetches affiliate clicks separately after main query
- Should use nested includes

```typescript
const transactions = await prisma.cashbackTransaction.findMany({ ... });
const affiliateClickIds = transactions.map(t => t.affiliateClickId);
const affiliateClicks = await prisma.affiliateClick.findMany({
  where: { id: { in: affiliateClickIds } }
});
```

**Recommendation**: Include affiliate click in initial query.

### Medium Issues

#### 3.5 Missing Features

**No Withdrawal Request Tracking**
- **Lines 221-240**: `requestWithdrawal` just returns a message
- No audit trail or withdrawal records created

**No Transaction Validation**
- **Line 169**: Status can be changed from PAID back to PENDING
- No state machine validation

**No Amount Limits**
- Users could request tiny withdrawals (< $1) causing processing overhead
- No maximum withdrawal amount

#### 3.6 Data Integrity

**Potential Division by Zero**
- **Line 286**: No check if `purchaseAmount` is zero

```typescript
export function calculateCashback(
  purchaseAmount: number,
  affiliateRate: number
): number {
  const commission = purchaseAmount * (affiliateRate / 100); // Could be 0
  // ...
}
```

---

## 4. Affiliate Service (`D:\price-hunter\src\lib\services\affiliate.ts`)

### Critical Issues

#### 4.1 Security Vulnerabilities

**Critical: IP Salt from Environment Variable**
- **Line 93**: Falls back to empty string if `IP_SALT` not set
- Hashing with empty salt = no security

```typescript
function hashIp(ip: string): string {
  return crypto.createHash("sha256")
    .update(ip + process.env.IP_SALT || "") // DANGEROUS FALLBACK
    .digest("hex")
    .substring(0, 16);
}
```

**Impact**: IP addresses could be reversed through rainbow table attacks.

**Recommendation**: Fail fast if salt is missing:
```typescript
const salt = process.env.IP_SALT;
if (!salt) throw new Error("IP_SALT environment variable required");
return crypto.createHash("sha256").update(ip + salt).digest("hex");
```

**URL Injection Vulnerability**
- **Lines 69-87**: `originalUrl` not validated
- User could inject malicious URLs

```typescript
export async function generateAffiliateUrl(
  storeSlug: string,
  originalUrl: string // UNVALIDATED - could be javascript:, data:, etc.
): Promise<string>
```

**Recommendation**: Validate URL protocol and domain:
```typescript
try {
  const urlObj = new URL(originalUrl);
  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    throw new Error("Invalid protocol");
  }
} catch {
  throw new Error("Invalid URL");
}
```

#### 4.2 Missing Input Validation

**No Validation in `trackAffiliateClick`**
- **Lines 99-121**: No validation for any parameters
- `storeId`, `productId`, `userId` could be invalid
- `url` could be malicious

**No Validation in `recordConversion`**
- **Lines 126-137**: `revenue` not validated (could be negative)
- No check if click exists or is already converted

```typescript
export async function recordConversion(
  clickId: string,
  revenue: number // UNVALIDATED
): Promise<void> {
  // No check if click exists
  // No check if already converted
  // No validation of revenue amount
  await prisma.affiliateClick.update({ ... });
}
```

**Impact**: Data corruption, fraud.

**Recommendation**:
```typescript
if (revenue < 0) throw new Error("Invalid revenue");
const click = await prisma.affiliateClick.findUnique({
  where: { id: clickId }
});
if (!click) throw new Error("Click not found");
if (click.converted) throw new Error("Already converted");
```

#### 4.3 Business Logic Issues

**Missing Store Validation**
- **Lines 73-76**: Fetches store but doesn't validate it exists
- Could return affiliate URL for inactive store

**Inefficient URL Generation**
- **Lines 69-87**: Database query for every URL generation
- Should cache store affiliate tags

**No Click Deduplication**
- **Lines 99-121**: No check for duplicate clicks
- User refreshing page creates multiple click records

### Medium Issues

#### 4.4 N+1 Query Problem

**Severe N+1 in `getAffiliateStats`**
- **Lines 157-165**: Loads ALL clicks with store relations
- No pagination, no date limit enforcement

```typescript
const clicks = await prisma.affiliateClick.findMany({
  where: { ... },
  include: { store: { select: { name: true, slug: true } } }
});
```

**Impact**: Could load millions of records, crash server.

**Recommendation**: Use aggregation queries with `groupBy`.

#### 4.5 Missing Error Handling

**No Error Handling for URL Parsing**
- **Lines 9-11, 17-19, etc.**: `new URL()` can throw errors
- No try-catch blocks

```typescript
format: (url, tag) => {
  const urlObj = new URL(url); // Can throw!
  urlObj.searchParams.set("tag", tag);
  return urlObj.toString();
}
```

**Recommendation**: Wrap in try-catch and handle invalid URLs.

#### 4.6 Privacy Concerns

**IP Hash Too Short**
- **Line 93**: Only keeps 16 characters of 64-character hash
- Reduces entropy, makes attacks easier

**User Agent Storage**
- **Line 115**: Stores full user agent string
- Privacy concern - should hash or truncate

---

## 5. Deals Service (`D:\price-hunter\src\lib\services\deals.ts`)

### Critical Issues

#### 5.1 SQL Injection Risk (Prisma ORM)

**Insecure String Matching**
- **Lines 47-53**: Uses `contains` with `insensitive` mode on user input
- While Prisma is generally safe, this could be vulnerable to ReDoS attacks

```typescript
product: category ? {
  category: {
    contains: category, // User-controlled input
    mode: "insensitive",
  }
} : undefined
```

**Recommendation**: Validate category against allowed list or sanitize input.

#### 5.2 Missing Input Validation

**No Validation on Parameters**
- **Lines 25-31**: No validation for `minDiscount`, `limit`
- **Line 31**: `limit` could be 1,000,000 causing DOS

```typescript
export async function getDeals(options: {
  country?: Country;
  limit?: number; // UNVALIDATED - could be huge
  minDiscount?: number; // UNVALIDATED - could be negative
  category?: string; // UNVALIDATED - could be malicious
}): Promise<Deal[]>
```

**Recommendation**:
```typescript
const limit = Math.min(options.limit || 20, 100); // Cap at 100
const minDiscount = Math.max(0, Math.min(options.minDiscount || 10, 100));
if (category && category.length > 100) throw new Error("Invalid category");
```

#### 5.3 Performance Issues

**Potential Performance Problem in `getPriceDrops`**
- **Lines 294-316**: Loads ALL store products with price history
- No `take` limit on initial query
- Could load hundreds of thousands of records

```typescript
const storeProducts = await prisma.storeProduct.findMany({
  where: { ... }, // NO LIMIT!
  include: {
    product: true,
    store: true,
    priceHistory: { orderBy: { recordedAt: "desc" }, take: 2 }
  }
});
```

**Impact**: Out of memory errors, server crashes.

**Recommendation**: Add `take` limit to initial query, filter in database not memory.

**Memory Intensive `getTrendingProducts` Fallback**
- **Lines 134-159**: Fallback loads products without search data
- Should limit query size

### Medium Issues

#### 5.4 Business Logic Issues

**Inconsistent Price Drop Logic**
- **Lines 322-324**: Compares prices from `priceHistory[0]` and `priceHistory[1]`
- But current price is in `storeProduct.price`, not necessarily in history

```typescript
if (sp.priceHistory.length < 2) return false;
const currentPrice = Number(sp.priceHistory[0].price); // Assumes this is current
const previousPrice = Number(sp.priceHistory[1].price);
```

**Risk**: Price drop detection might be incorrect.

**Missing Stock Validation in `getDeals`**
- **Line 38**: Filters `inStock: true`
- But no validation if stock data is recent (could be stale)

#### 5.5 Missing Error Handling

**No Error Handling**
- All functions lack try-catch blocks
- Errors propagate to caller without context

#### 5.6 Type Safety Issues

**Potential Null Reference**
- **Lines 69-84, 263-281**: Map results without null checks
- Assumes `product`, `store` always exist after query

**Unsafe Array Access**
- **Lines 167, 218**: `storeProducts[0]` accessed without length check
- TypeScript doesn't enforce this

---

## Summary of Critical Issues by File

### Priority 1 - Fix Immediately

| File | Issue | Severity | Lines |
|------|-------|----------|-------|
| cashback.ts | Missing admin authorization in `updateCashbackStatus` | CRITICAL | 165-168 |
| affiliate.ts | Weak IP salt (fallback to empty string) | CRITICAL | 93 |
| price-alerts.ts | Race condition in `createPriceAlert` | HIGH | 98-104 |
| wishlist.ts | Severe N+1 in `bulkAddToWishlist` | HIGH | 307-332 |
| deals.ts | Unbounded query in `getPriceDrops` | HIGH | 294-316 |

### Priority 2 - Fix Soon

| File | Issue | Severity | Lines |
|------|-------|----------|-------|
| price-alerts.ts | N+1 in `checkAndTriggerAlerts` | HIGH | 293-333 |
| cashback.ts | Missing amount validation | HIGH | 138-162 |
| affiliate.ts | URL injection vulnerability | HIGH | 69-87 |
| wishlist.ts | Race condition in `addToWishlist` | MEDIUM | 121-143 |
| deals.ts | Missing input validation | MEDIUM | 25-31 |

### Priority 3 - Technical Debt

| File | Issue | Severity |
|------|-------|----------|
| All files | Missing error handling | MEDIUM |
| All files | Missing input validation | MEDIUM |
| price-alerts.ts | Missing product existence check | MEDIUM |
| cashback.ts | No withdrawal request tracking | LOW |
| affiliate.ts | Missing click deduplication | LOW |

---

## Recommended Fixes

### 1. Immediate Actions (Do Today)

1. **Add admin check to `updateCashbackStatus`**
2. **Fix IP salt fallback in affiliate service**
3. **Add input validation to all public functions**
4. **Add try-catch error handling to all functions**

### 2. This Week

1. **Replace check-then-act patterns with upsert or transactions**
2. **Optimize N+1 queries using batch operations**
3. **Add rate limiting and abuse prevention**
4. **Implement proper URL validation**

### 3. This Month

1. **Add database transactions for critical operations**
2. **Implement background job queue for notifications**
3. **Add comprehensive logging and monitoring**
4. **Create unit tests for all security-critical functions**

---

## Testing Recommendations

### Security Testing

1. **Test cashback status updates without admin role**
2. **Test negative and extreme values for prices/amounts**
3. **Test URL injection in affiliate service**
4. **Test concurrent alert creation for race conditions**

### Performance Testing

1. **Test `bulkAddToWishlist` with 1000+ products**
2. **Test `checkAndTriggerAlerts` with 10,000+ alerts**
3. **Test `getWishlistStats` with large wishlists**
4. **Test `getPriceDrops` with full product catalog**

### Integration Testing

1. **Test notification failure scenarios**
2. **Test database transaction rollbacks**
3. **Test concurrent user operations**

---

## Code Quality Metrics

| Metric | Score | Notes |
|--------|-------|-------|
| Security | 3/10 | Critical auth bypass, weak validation |
| Performance | 4/10 | Multiple N+1 queries, unbounded queries |
| Error Handling | 2/10 | Almost no try-catch blocks |
| Input Validation | 2/10 | Minimal validation on user inputs |
| Race Condition Safety | 3/10 | Multiple check-then-act patterns |
| Code Reusability | 7/10 | Good function separation |
| Type Safety | 8/10 | Good TypeScript usage |

**Overall Score: 4.1/10** - Needs significant improvements before production deployment.

---

## Conclusion

The service files contain several critical security vulnerabilities and performance issues that must be addressed before production deployment:

1. **Critical Security Flaw**: Missing authorization in cashback approval
2. **Critical Performance**: N+1 queries and unbounded queries
3. **Critical Reliability**: Missing error handling throughout
4. **High Priority**: Race conditions in concurrent operations

**Recommendation**: Do not deploy to production until Priority 1 and Priority 2 issues are resolved.
