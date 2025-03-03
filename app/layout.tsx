import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import ContextProvider from "@/providers/context-provider";
import "./reown-config";
import { Analytics } from "@vercel/analytics/react"
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "sweeper.guru",
  description: "Sweep your solana wallet and dust tokens for extra SOL",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ContextProvider>
            {children}
          </ContextProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
