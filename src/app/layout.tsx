import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vault3 - Secure Password Manager for Teams",
  description: "The most advanced password manager with bank-level security, team collaboration, and intelligent threat detection. Protect your digital life with Vault3.",
  keywords: "password manager, security, team collaboration, encryption, vault3, saas",
  authors: [{ name: "Vault3 Team" }],
  openGraph: {
    title: "Vault3 - Secure Password Manager for Teams",
    description: "Bank-level security meets team collaboration. The password manager trusted by security professionals.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vault3 - Secure Password Manager",
    description: "Bank-level security meets team collaboration.",
  },
  robots: "index, follow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
        {children}
        </Providers>
      </body>
    </html>
  );
}
