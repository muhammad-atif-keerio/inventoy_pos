import { SalesOrderItem } from "./columns";

export async function downloadInvoice(sale: SalesOrderItem): Promise<void> {
    try {
        // Create a popup window for the invoice
        const invoiceWindow = window.open("", "_blank");

        if (!invoiceWindow) {
            throw new Error(
                "Unable to open a new window. Please check your popup blocker settings.",
            );
        }

        // Display modern loading indicator with Raheel Fabrics branding
        invoiceWindow.document.write(`
      <html>
        <head>
          <title>Generating Invoice #${sale.orderNumber} - Raheel Fabrics</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Inter', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f9fafb;
              color: #1f2937;
            }
            .container {
              text-align: center;
              background-color: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              padding: 32px;
              width: 90%;
              max-width: 400px;
            }
            .logo {
              font-size: 24px;
              font-weight: 700;
              color: #1f2937;
              margin-bottom: 8px;
            }
            .logo-highlight {
              color: #4f46e5;
            }
            .subtitle {
              color: #6b7280;
              font-size: 14px;
              margin-bottom: 24px;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid #e5e7eb;
              border-top: 3px solid #4f46e5;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            .invoice-number {
              font-weight: 600;
              margin-bottom: 8px;
              font-size: 16px;
            }
            .message {
              color: #6b7280;
              font-size: 14px;
              line-height: 1.5;
            }
            .status {
              margin-top: 16px;
              font-size: 14px;
              color: #4f46e5;
              font-weight: 500;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .progress-bar-container {
              width: 100%;
              height: 4px;
              background-color: #e5e7eb;
              border-radius: 2px;
              margin-top: 24px;
              overflow: hidden;
            }
            .progress-bar {
              height: 100%;
              width: 0%;
              background-color: #4f46e5;
              animation: progress 2s ease-in-out forwards;
            }
            @keyframes progress {
              0% { width: 0%; }
              50% { width: 70%; }
              100% { width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Raheel <span class="logo-highlight">Fabrics</span></div>
            <div class="subtitle">Invoice Generation System</div>
            <div class="spinner"></div>
            <div class="invoice-number">Invoice #${sale.orderNumber}</div>
            <p class="message">
              Your PDF invoice is being prepared. Please wait a moment while we generate it.
            </p>
            <div class="progress-bar-container">
              <div class="progress-bar"></div>
            </div>
            <div class="status" id="status">Processing...</div>
          </div>
          <script>
            // Update status messages
            const statusEl = document.getElementById('status');
            setTimeout(() => {
              statusEl.textContent = "Retrieving invoice data...";
            }, 500);
            setTimeout(() => {
              statusEl.textContent = "Formatting invoice...";
            }, 1200);
            setTimeout(() => {
              statusEl.textContent = "Generating PDF...";
            }, 1800);
          </script>
        </body>
      </html>
    `);

        // Navigate to the PDF download endpoint
        setTimeout(() => {
            if (invoiceWindow) {
                invoiceWindow.location.href = `/api/invoice/download/${sale.id}`;
            }
        }, 2000);

        return Promise.resolve();
    } catch (error) {
        console.error("Error preparing invoice download:", error);
        return Promise.reject(error);
    }
}
