import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Jost, Kaisei_HarunoUmi, Libre_Baskerville } from "next/font/google";
import { AdminAuthErrorOverlay } from "@/components/_shared/AdminAuthErrorOverlay";
import { CustomTheme } from "@/components/_shared/CustomTheme";
import { GuestbookSettingsProvider } from "@/lib/guestbookSettings";
import { loadGuestbookSettings } from "@/lib/loadGuestbookSettings";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const baskerville = Libre_Baskerville({
  variable: "--font-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const kaisei = Kaisei_HarunoUmi({
  variable: "--font-kaisei",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Poetry by Beck",
  description: "A volume of original poetry.",
};

export const viewport: Viewport = {
  colorScheme: "light",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await loadGuestbookSettings();

  return (
    <html
      lang="en"
      className={`${jost.variable} ${baskerville.variable} ${kaisei.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="preload"
          href="/fonts/Peony-Regular.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full">
        <GuestbookSettingsProvider initialSettings={settings}>
          {children}
          <Suspense fallback={null}>
            <AdminAuthErrorOverlay />
          </Suspense>
          <CustomTheme />
        </GuestbookSettingsProvider>
      </body>
    </html>
  );
}
