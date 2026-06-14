# Offers API Integration

## API Endpoint
```bash
curl -X 'GET' \
  'http://localhost:8080/offer?search=y&limit=100&page=1' \
  -H 'accept: */*'
```

## Usage Examples

### 1. Using Direct API Client
```typescript
import { apiClient } from '@/lib/api';

// Get offers with search and pagination
const response = await apiClient.getOffers({
  search: 'y',
  limit: 100,
  page: 1
});

console.log(response.data); // Array of offers
console.log(response.pagination); // Pagination info
```

### 2. Using React Hook (Recommended)
```typescript
import { useApi } from '@/hooks/useApi';

function OfferComponent() {
  const { getOffers, loading, error } = useApi();
  
  const fetchOffers = async () => {
    try {
      const response = await getOffers({
        search: 'y',
        limit: 100,
        page: 1
      });
      
      console.log('Offers:', response.data);
      console.log('Pagination:', response.pagination);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    }
  };
  
  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      <button onClick={fetchOffers}>Fetch Offers</button>
    </div>
  );
}
```

## API Query Parameters

### OffersQuery Interface
```typescript
interface OffersQuery {
  search?: string;   // Search term for offer title/description
  limit?: number;    // Number of offers per page (default: 100)
  page?: number;     // Page number (default: 1)
  category?: string; // Filter by category
  status?: string;   // Filter by status (active, inactive, expired)
  type?: string;     // Filter by offer type
  country?: string;  // Filter by country name (mapped to ISO codes against Offer.countries)
}
```

### Example Queries
```typescript
// Your exact cURL: search=y&limit=100&page=1
await getOffers({ search: 'y', limit: 100, page: 1 });

// Search for specific offers
await getOffers({ search: 'discount' });

// Get active offers only
await getOffers({ status: 'active' });

// Filter by category
await getOffers({ category: 'electronics' });

// Filter by country (name is mapped to ISO codes server-side)
await getOffers({ country: 'Thailand' });

// Combine filters
await getOffers({ 
  search: 'sale', 
  category: 'clothing', 
  status: 'active', 
  limit: 50 
});
```

## Response Format

### OffersResponse
```typescript
interface OffersResponse {
  data: Offer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### Offer

See `src/types/api.ts` for the authoritative definition; key fields:

```typescript
interface Offer {
  _id: string;
  offer_id: number;
  __v: number;
  categories: string;
  commission_tracking: string;
  commissions: string[];
  countries: string;            // ISO codes, e.g. "TH" or "TH,US" (used by the country filter)
  currency: string;
  datetime_created: Date;
  datetime_updated: Date;
  description: string;
  is_require_approval: number;
  logo: string;                 // 1:1 logo used for both desktop and mobile
  merchant_id: number;
  offer_name: string;
  offer_name_display: string;
  tracking_link: string;
  tracking_type: string;
  logo_desktop: string;
  logo_mobile: string;
  banner: string;               // brand cover
  logo_circle: string;
  banner_mobile: string;
  disabled: boolean;
  commission_store: number | null;
  max_cap: number | null;       // admin-configured cap (editable in FormOffer)
  partner_max_cap?: number | string | null;
  extra_store: boolean;         // top-brand placement
  active_policy?: string | null;
  policy_category_id?: string | null; // Terms template source (category whose T&Cs apply)
  custom_terms?: string | null;       // editable T&C copy for this offer/merchant
  note_to_user?: string | null;       // optional message shown to end users
  product_types?: OfferProductTypeEntry[];
  all_product_types?: boolean;
  admin_commission_info?: string[];
  affiliate_partner?: string | null;
  deeplink_store_id?: string | null;
  offer_display_tags?: OfferDisplayTags;
  is_global?: boolean;
  default_country?: string | null;
}
```

## Available Offer Operations

### 1. Get All Offers (No Authentication Required)
```typescript
const { getOffers } = useApi();
const response = await getOffers({ search: 'y', limit: 100, page: 1 });
```

### 2. Get Single Offer
```typescript
const { getOffer } = useApi();
const offer = await getOffer('offer_id');
```

### 3. Create Offer (Authentication Required)
```typescript
const { createOffer } = useApi();
const newOffer = await createOffer({
  title: 'Special Discount',
  description: 'Get 50% off on all items',
  price: 100,
  discountPrice: 50,
  category: 'electronics',
  status: 'active',
  validFrom: '2025-01-01',
  validTo: '2025-12-31'
});
```

### 4. Update Offer (Authentication Required)
```typescript
const { updateOffer } = useApi();
const updatedOffer = await updateOffer('offer_id', {
  title: 'Updated Offer',
  status: 'inactive'
});
```

### 5. Delete Offer (Authentication Required)
```typescript
const { deleteOffer } = useApi();
const result = await deleteOffer('offer_id');
```

## Authentication

**Note:** The GET `/offer` endpoint does **NOT** require authentication (no Bearer token needed), but CREATE, UPDATE, and DELETE operations do require authentication:

```typescript
// GET offers - No token required
const response = await getOffers(); // Works without authentication

// CREATE/UPDATE/DELETE - Token required automatically
const newOffer = await createOffer(offerData); // Token added automatically from session
```

## Example cURL Request
```bash
# Exact command from your specification
curl -X 'GET' \
  'http://localhost:8080/offer?search=y&limit=100&page=1' \
  -H 'accept: */*'

# With additional filters
curl -X 'GET' \
  'http://localhost:8080/offer?search=discount&category=electronics&status=active&limit=50&page=1' \
  -H 'accept: */*'
```

## Demo Component

A complete demo component is available at:
- Component: `src/components/offer/OffersTable.tsx`
- Page: `src/app/(admin)/(others-pages)/brands/page.tsx`

Access it at: `/brands`

## Error Handling

All API calls return proper error objects:
```typescript
try {
  const response = await getOffers({ search: 'y' });
} catch (error) {
  console.error('Error:', error.message);
  console.error('Status:', error.status);
  if (error.errors) {
    console.error('Field errors:', error.errors);
  }
}
```

## Configuration

Ensure your environment variables are set:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXTAUTH_SECRET=your-jwt-secret
NEXTAUTH_URL=http://localhost:3000
```

## Features

- 🔍 **Search by title/description** - Matches your cURL search parameter
- 📄 **Pagination with limit/page** - Exactly as in your API (limit=100, page=1)
- 🏷️ **Category filtering** - Filter offers by category
- 📊 **Status filtering** - Active, inactive, expired offers
- 🖼️ **Image display** with Next.js optimization
- 💰 **Price formatting** with currency display
- 🎯 **Discount prices** - Shows original price crossed out
- 📅 **Validity dates** - Display valid until dates
- 🏢 **Company info** - Display offer company/location
- 🔗 **Tags support** - Display offer tags
- 📱 **Responsive design** with dark mode support
- ⚡ **No authentication required** for viewing offers
- 🗑️ **Delete functionality** with confirmation (requires auth)
- ✏️ **Edit button** ready for implementation (requires auth)

## API Comparison

| Feature | Offers API (`/offer`) | Users API (`/user`) | Admin API (`/admin`) |
|---------|---------------------|-------------------|---------------------|
| **Endpoint** | `http://localhost:8080/offer` | `http://localhost:8080/user` | `http://localhost:8080/admin` |
| **Authentication** | ❌ Not required for GET | ✅ Required | ✅ Required |
| **Default Limit** | 100 | 12 | 12 |
| **Search Parameter** | `search` | `search` | `search` |
| **Response Format** | `{ data: [], page, limit, total, totalPages }` | `{ data: [], pagination: {} }` | `{ users: [], pagination: {} }` |

## Sample Response
```json
{
  "data": [
    {
      "_id": "offer123",
      "offer_id": 1001,
      "__v": 0,
      "categories": "Shopping",
      "commission_tracking": "CPS",
      "commissions": ["7%"],
      "countries": "TH",
      "currency": "THB",
      "datetime_created": "2025-01-15T10:00:00Z",
      "datetime_updated": "2025-01-15T10:00:00Z",
      "description": "Created from affiliate feed. Network: Involve Asia.",
      "is_require_approval": 0,
      "logo": "/images/merchant-logos/gadgethub-th.png",
      "merchant_id": 5001,
      "offer_name": "GadgetHub - CPS",
      "offer_name_display": "GadgetHub",
      "tracking_link": "https://example.com/track",
      "tracking_type": "CPS",
      "banner": "/images/merchant-logos/gadgethub-th.png",
      "disabled": false,
      "commission_store": 7,
      "max_cap": null,
      "extra_store": false,
      "policy_category_id": null,
      "custom_terms": null,
      "note_to_user": null,
      "is_global": false
    }
  ],
  "page": 1,
  "limit": 100,
  "total": 1,
  "totalPages": 1
}
```