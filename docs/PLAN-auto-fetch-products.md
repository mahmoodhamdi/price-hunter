# Auto-Fetch Products Feature Plan

## Overview
When a user searches for a product that doesn't exist in the database, the system will automatically scrape data from all supported stores, save it to the database, and return the results.

## Current Flow
1. User searches for a product
2. API queries database for matching products
3. Returns only existing database results (empty if product not found)

## New Flow
1. User searches for a product
2. API queries database for matching products
3. **If no results or fewer than minimum threshold:**
   - Trigger scrapers for all active stores in parallel
   - Parse and normalize scraped data
   - Save new products and store prices to database
   - Return combined results (existing + newly scraped)
4. If results exist, return them directly

## Implementation Steps

### Step 1: Create Product Auto-Fetch Service
**File:** `src/lib/services/product-fetch.ts`

- `fetchAndSaveProducts(query: string)` - Main function that:
  - Gets all active stores from DB
  - Runs scrapers in parallel for each store
  - Normalizes product data
  - Creates/updates products in DB
  - Creates store product entries with prices

### Step 2: Create Product Matching/Deduplication Logic
**File:** `src/lib/services/product-matcher.ts`

- Match scraped products to existing DB products by:
  - Barcode (if available)
  - Normalized name similarity
  - Brand + category match
- Prevent duplicate product entries

### Step 3: Update Search API
**File:** `src/app/api/search/route.ts`

- Add threshold check (e.g., < 3 results)
- Call `fetchAndSaveProducts` when needed
- Add `fresh=true` query param to force re-scrape
- Add loading/scraping status response

### Step 4: Create Background Scrape Job
**File:** `src/lib/services/scrape-job.ts`

- Record scrape jobs in DB for tracking
- Update job status (pending, running, completed, failed)
- Store error messages for debugging

### Step 5: Add Price History Recording
- When saving new prices, also create price history entries
- This enables price tracking over time

## Database Changes
None required - existing schema supports this:
- `Product` - stores product info
- `StoreProduct` - stores per-store prices
- `PriceHistory` - tracks price changes
- `ScrapeJob` - tracks scraping operations

## API Response Changes

### Search with auto-fetch:
```json
{
  "products": [...],
  "meta": {
    "fromDatabase": 2,
    "newlyScraped": 5,
    "scrapedStores": ["amazon-sa", "noon-sa", "jarir"],
    "failedStores": ["extra"],
    "duration": 3500
  }
}
```

## Usage After Implementation

1. **Normal search:** `GET /api/search?q=iphone`
   - Returns DB results, auto-scrapes if < 3 results

2. **Force fresh scrape:** `GET /api/search?q=iphone&fresh=true`
   - Always scrapes all stores regardless of DB results

3. **Specific store:** `GET /api/search?q=iphone&store=amazon-sa`
   - Only scrapes specified store

## Error Handling
- Individual store failures don't block other stores
- Timeout per store (30 seconds)
- Retry failed stores once
- Log all errors for debugging

## Performance Considerations
- Parallel scraping (all stores at once)
- Cache recent searches (5-minute TTL)
- Rate limiting per store to avoid blocks
- Background job for large result sets
