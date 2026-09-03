import type { Metadata } from "next";
import { Jost, Kaisei_HarunoUmi, Libre_Baskerville } from "next/font/google";
import { CustomTheme } from "@/components/CustomTheme";
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
  title: "Original Poetry",
  description: "A volume of original poetry.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jost.variable} ${baskerville.variable} ${kaisei.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <CustomTheme />
      </body>
    </html>
  );
}
