"use client";

import React, { useEffect, useState } from "react";

/**
 * FontCheck component to verify proper rendering of Urdu text
 * This helps diagnose any encoding or font issues
 */
export function FontCheck() {
    const [fontLoaded, setFontLoaded] = useState(false);
    const [isBrowser, setIsBrowser] = useState(false);

    useEffect(() => {
        // Mark that we're in the browser
        setIsBrowser(true);

        // Check if font is loaded - only run in browser
        if (typeof window !== "undefined" && "fonts" in document) {
            document.fonts.ready.then(() => {
                try {
                    const fontAvailable = document.fonts.check(
                        '1em "Noto Nastaliq Urdu"',
                    );
                    setFontLoaded(fontAvailable);
                } catch (e) {
                    console.error("Error checking font:", e);
                    setFontLoaded(false);
                }
            });
        }
    }, []);

    const testUrduText = [
        { id: 1, text: "انوائس", desc: "Basic Urdu text (Invoice)" },
        {
            id: 2,
            text: "راحیل فیبرکس",
            desc: "Company name with connecting characters",
        },
        { id: 3, text: "مجموعی کل: ١٢٣٤٥.٦٧", desc: "Numbers and punctuation" },
        { id: 4, text: "آپ کا شکریہ!", desc: "Special characters" },
        {
            id: 5,
            text: "فیصل آباد، پاکستان",
            desc: "Comma and connecting letters",
        },
    ];

    // Color test backgrounds with appropriate text colors
    const colorTests = [
        {
            id: 1,
            bg: "bg-white",
            text: "text-gray-900",
            label: "White background",
        },
        {
            id: 2,
            bg: "bg-gray-100",
            text: "text-gray-800",
            label: "Light gray background",
        },
        {
            id: 3,
            bg: "bg-blue-600",
            text: "text-white",
            label: "Blue background",
        },
        {
            id: 4,
            bg: "bg-green-600",
            text: "text-white",
            label: "Green background",
        },
        {
            id: 5,
            bg: "bg-primary",
            text: "text-white",
            label: "Primary color background",
        },
    ];

    // Only show font loaded status if we're in the browser
    const fontStatusDisplay = isBrowser ? (
        <span className="mr-2 rounded bg-gray-200 px-2 py-1 text-xs">
            Font Loaded: {fontLoaded ? "✅" : "❌"}
        </span>
    ) : (
        <span className="mr-2 rounded bg-gray-200 px-2 py-1 text-xs">
            Font Status: Loading...
        </span>
    );

    return (
        <div className="mb-4 rounded-lg border bg-gray-50 p-4">
            <h3 className="mb-2 text-lg font-medium">Urdu Font Check</h3>
            <div className="mb-2">
                {fontStatusDisplay}
                <span className="text-xs text-gray-500">
                    Using: Noto Nastaliq Urdu
                </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Sample Text</div>
                <div className="text-sm font-medium">Description</div>

                {testUrduText.map((item) => (
                    <React.Fragment key={item.id}>
                        <div className="urdu-text border bg-white p-2">
                            {item.text}
                        </div>
                        <div className="p-2 text-sm text-gray-700">
                            {item.desc}
                        </div>
                    </React.Fragment>
                ))}
            </div>

            <h4 className="mt-6 mb-2 font-medium">Color Contrast Check</h4>
            <div className="grid grid-cols-1 gap-2">
                {colorTests.map((test) => (
                    <div key={test.id} className={`p-2 ${test.bg} rounded`}>
                        <span className={`urdu-text ${test.text}`}>
                            راحیل فیبرکس - انوائس
                        </span>
                        <span className="ml-2 text-xs opacity-70">
                            {test.label}
                        </span>
                    </div>
                ))}
            </div>

            <div className="mt-4 text-xs text-gray-500">
                If all text displays correctly, fonts are working properly. If
                characters appear disjointed or as boxes, there&apos;s a font or
                encoding issue. All color samples should show clearly visible
                text.
            </div>
        </div>
    );
}
