import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OmniDrop | 2.5 Gbps Multi-Path P2P Content-Defined Mesh File Fabric",
  description:
    "Zero-cloud, high-speed multi-path P2P file transport between Linux, macOS, Windows, iOS, and Android using FastCDC, BLAKE3 Merkle DAG, and Noise XX encryption.",
  keywords: [
    "OmniDrop",
    "P2P file transfer",
    "multi-path link aggregation",
    "FastCDC",
    "BLAKE3",
    "Noise Protocol",
    "AirDrop alternative",
    "LocalSend alternative",
    "Rust networking",
    "Shah Md. Mahi",
  ],
  authors: [{ name: "Shah Md. Mahi", url: "https://shahmdmahi.dpdns.org" }],
  creator: "Shah Md. Mahi",
  publisher: "Shah Md. Mahi",
  metadataBase: new URL("https://omnidrop.shahmdmahi.dpdns.org"),
  alternates: {
    canonical: "https://omnidrop.shahmdmahi.dpdns.org",
  },
  openGraph: {
    title: "OmniDrop | Ultra-High-Throughput Multi-Path P2P Mesh Fabric",
    description:
      "Cross-device file sharing exceeding 1.8 Gbps over local Wi-Fi with zero cloud dependence, zero accounts, and extreme speed.",
    url: "https://omnidrop.shahmdmahi.dpdns.org",
    siteName: "OmniDrop",
    images: [
      {
        url: "/og-banner.svg",
        width: 1200,
        height: 630,
        alt: "OmniDrop P2P Mesh Fabric Banner",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OmniDrop | 2.5 Gbps Multi-Path P2P File Fabric",
    description:
      "Zero-cloud, high-speed multi-path P2P file transport between PC, Mac, Linux, Android, and iOS.",
    images: ["/og-banner.svg"],
    creator: "@shahmdmahi",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "OmniDrop",
      "url": "https://omnidrop.shahmdmahi.dpdns.org",
      "applicationCategory": "NetworkingApplication",
      "operatingSystem": "Linux, macOS, Windows, iOS, Android",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "description":
        "Ultra-High-Throughput Multi-Path P2P Content-Defined Mesh File & Stream Fabric",
      "author": {
        "@type": "Person",
        "name": "Shah Md. Mahi",
        "url": "https://shahmdmahi.dpdns.org",
      },
    },
    {
      "@type": "Person",
      "name": "Shah Md. Mahi",
      "url": "https://shahmdmahi.dpdns.org",
      "jobTitle": "Lead Systems Architect & Distributed Networking Engineer",
      "email": "shahmdmahi15@gmail.com",
      "telephone": "+8801757290258",
      "sameAs": [
        "https://github.com/shahmdmahi15",
        "https://linkedin.com/in/shahmdmahi27",
        "https://facebook.com/shahmdmahi27",
        "https://instagram.com/shahmdmahi27",
        "https://t.me/shahmdmahi",
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#070b13] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
