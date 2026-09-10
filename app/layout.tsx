import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { isReadOnly } from "@/lib/readOnly";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flat Buying Tracker",
  description: "A personal workspace for tracking apartments through the buying process.",
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {isReadOnly() && (
          <div className="bg-amber-100 text-amber-800 text-sm text-center py-1.5">
            Read-only view — changes are disabled
          </div>
        )}
        {children}
        {modal}
      </body>
    </html>
  );
}
