import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Suspense } from "react";

import { Spinner } from "@/components/ui/spinner";

// Dynamic import for client component
const InvoicePreviewClient = dynamic(() => import("./invoice-preview-client"), {
    loading: () => (
        <div className="flex min-h-screen items-center justify-center">
            <Spinner size="lg" />
        </div>
    ),
});

// Client component for Urdu fonts (to use styled-jsx)
const UrduFontsScript = dynamic(() => import("./urdu-fonts"), { ssr: true });

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function InvoicePreviewPage({ params }: PageProps) {
    // Access the id directly since we're in a Server Component
    const { id } = await params;

    if (!id) {
        notFound();
    }

    return (
        <>
            <UrduFontsScript />
            <Script
                id="pdf-auto-download"
                strategy="lazyOnload"
                dangerouslySetInnerHTML={{
                    __html: `
            (function() {
              try {
                function triggerPdfDownload() {
                  console.log("Attempting to trigger PDF download...");
                  setTimeout(() => {
                    try {
                      const downloadLink = document.querySelector('.pdf-download-link');
                      if (downloadLink) {
                        console.log("Found download link, clicking it...");
                        downloadLink.click();
                      } else {
                        console.log("Download link not found, trying again...");
                        setTimeout(triggerPdfDownload, 1000);
                      }
                    } catch (e) {
                      console.error("Error in PDF download function:", e);
                    }
                  }, 2000);
                }
                
                // Start the download process after the page loads
                if (typeof window !== 'undefined') {
                  window.addEventListener('load', triggerPdfDownload);
                }
              } catch (e) {
                console.error("Error setting up PDF download:", e);
              }
            })();
          `,
                }}
            />
            <Suspense
                fallback={
                    <div className="flex min-h-screen items-center justify-center">
                        <Spinner size="lg" />
                    </div>
                }
            >
                <InvoicePreviewClient id={id} />
            </Suspense>
        </>
    );
}
