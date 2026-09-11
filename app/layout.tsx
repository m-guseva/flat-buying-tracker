import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { isReadOnly } from "@/lib/readOnly";
import { ThemeToggle } from "@/components/ThemeToggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flat Buying Tracker",
  description: "A personal workspace for tracking apartments through the buying process.",
};

// Sets data-theme before first paint so there's no flash of the wrong theme —
// must run synchronously in <head>, before ThemeToggle (or anything else) hydrates.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('flatTracker.theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={inter.className}>
        {isReadOnly() && (
          <div className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-sm text-center py-1.5">
            Read-only view — changes are disabled
          </div>
        )}
        <ThemeToggle />
        {children}
        {modal}
      </body>
    </html>
  );
}
