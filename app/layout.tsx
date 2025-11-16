import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Remotion Captioning Platform",
  description: "Automatically generate and render captions on videos using Remotion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Load Noto Sans fonts for Hinglish support */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}

