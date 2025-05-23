# PDF Invoice Generator

This component provides PDF invoice generation for the sales system using react-pdf.

## Installation

1. Install the required dependency:

```bash
npm install @react-pdf/renderer
```

2. The `SalesInvoicePDF.tsx` component is already created in this directory.

3. Import and use the component in your sales details component:

```tsx
import { SalesInvoiceDownloadButton } from "@/components/sales/SalesInvoicePDF";

// Then in your component:
<SalesInvoiceDownloadButton
    salesOrder={saleData}
    fileName={`Invoice-${saleData.orderNumber}.pdf`}
>
    <Download className="mr-1.5 h-3.5 w-3.5" /> Download Invoice
</SalesInvoiceDownloadButton>;
```

## Features

- Professionally styled invoice with company logo and details
- Customer information display
- Product details with pricing
- Payment information and status
- Total calculations including tax and discounts
- Download functionality with custom file naming

## Customization

You can customize the invoice appearance by modifying the styles in the `SalesInvoicePDF.tsx` file.

## Usage with Server Components

Since react-pdf uses browser-specific APIs, this component is marked with "use client" and should only be used in client components.
