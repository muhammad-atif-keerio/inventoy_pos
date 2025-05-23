import type { Metadata } from "next";
import { Inter } from "next/font/google";
import React from "react";

import { ClerkProvider } from "@clerk/nextjs";

import { ThemeProvider } from "@/components/theme/theme-provider";

import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
});

export const metadata: Metadata = {
    title: "Raheel Fabrics - Inventory Management",
    description: "Inventory Management System",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ClerkProvider>
            <html lang="en" suppressHydrationWarning>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <body
                        className={`${inter.variable} font-sans antialiased`}
                        suppressHydrationWarning
                    >
                        {children}
                    </body>
                </ThemeProvider>
            </html>
        </ClerkProvider>
    );
}
