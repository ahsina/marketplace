import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: "CryptoMarket - Anonymous Digital Marketplace",
  description: "The world's first completely anonymous digital marketplace powered by cryptocurrency. Buy and sell digital products with complete privacy.",
  keywords: "crypto marketplace, anonymous marketplace, digital products, cryptocurrency, privacy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
