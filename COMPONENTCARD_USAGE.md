# ComponentCard Usage Guide

## Two Types of ComponentCard Available

### 1. ComponentCard (Server Component)
Use this for static content that doesn't need search functionality:

```tsx
import ComponentCard from "@/components/common/ComponentCard";

export default function BasicTables() {
  return (
    <ComponentCard title="Basic Table 1">
      <BasicTableOne />
    </ComponentCard>
  );
}
```

**Features:**
- ✅ Server-side rendered (faster)
- ✅ No JavaScript bundle overhead
- ✅ SEO-friendly
- ❌ No search functionality

### 2. SearchableComponentCard (Client Component)
Use this when you need search functionality:

```tsx
"use client";
import SearchableComponentCard from "@/components/common/SearchableComponentCard";
import { useState } from "react";

export default function SearchableTables() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // Implement your search logic here
  };

  return (
    <SearchableComponentCard 
      title="Searchable Table" 
      onSearchChange={handleSearch}
      searchPlaceholder="Search tables..."
    >
      <FilteredTableComponent searchTerm={searchTerm} />
    </SearchableComponentCard>
  );
}
```

**Features:**
- ✅ Interactive search input
- ✅ Custom search placeholder
- ✅ onChange callback
- ❌ Client-side rendered (larger bundle)

## When to Use Which

### Use ComponentCard when:
- Displaying static content
- No user interaction needed
- Want optimal performance
- SEO is important

### Use SearchableComponentCard when:
- Need search/filter functionality
- User needs to interact with content
- Real-time filtering is required
- Search is a core feature

## Migration from Old ComponentCard

If you were using the old ComponentCard with search functionality, update like this:

```tsx
// Before (will cause errors)
<ComponentCard 
  title="My Table" 
  onSearchChange={handleSearch}
  showSearch={true}
>
  <MyTable />
</ComponentCard>

// After (correct)
<SearchableComponentCard 
  title="My Table" 
  onSearchChange={handleSearch}
>
  <MyTable />
</SearchableComponentCard>
```