import type { AppProps } from "next/app";
import { Inter, JetBrains_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import "@/app/globals.css";

// Using more widely available Google fonts
const inter = Inter({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export default function App({ Component, pageProps }: AppProps) {
    return (
        <main
            className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
        >
            <Component {...pageProps} />
            <Toaster />
        </main>
    );
}
