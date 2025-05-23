"use client";

import React from "react";

// Urdu font styles for global use
const urduFontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;700&display=swap');
  
  .urdu-text {
    font-family: 'Noto Nastaliq Urdu', serif;
    direction: rtl;
  }
`;

export default function UrduFonts() {
    return (
        <style jsx global>
            {urduFontStyles}
        </style>
    );
}
