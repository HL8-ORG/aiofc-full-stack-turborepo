import { TailwindIndicator } from "@/components/layouts/tailwind-indicator";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import type React from "react";
import "@/styles/globals.css";
import "@/styles/loading.css";
import { Toaster } from "@repo/design-system/components/shadcn-ui/sonner";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";

export const viewport: Viewport = {
  themeColor: siteConfig.themeColors,
};

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  authors: [
    {
      name: siteConfig.name,
      url: siteConfig.url,
    },
  ],
  creator: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [`${siteConfig.url}/og.png`],
    creator: "@your-twitter-handle",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: `${siteConfig.url}/site.webmanifest`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background flex flex-col font-sans antialiased",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme={siteConfig.defaultNextTheme}
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            <main className="flex-1 flex flex-col w-full">{children}</main>
          </NextIntlClientProvider>
        </ThemeProvider>
        <TailwindIndicator />
        <Toaster />
      </body>
    </html>
  );
}
