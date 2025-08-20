import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Talk to Text Canada - AI Transcription Services",
  description: "Secure voice-to-text transcription services built for Canadians. AI-powered transcription with legal document production capabilities.",
  keywords: ["transcription", "voice to text", "AI", "legal documents", "Canada", "speech to text"],
  authors: [{ name: "Talk to Text Canada" }],
  creator: "Talk to Text Canada",
  publisher: "Talk to Text Canada",
  metadataBase: new URL("https://talktotextcanada.com"),
  openGraph: {
    title: "Talk to Text Canada - AI Transcription Services",
    description: "Secure voice-to-text transcription services built for Canadians",
    url: "https://talktotextcanada.com",
    siteName: "Talk to Text Canada",
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Talk to Text Canada - AI Transcription Services",
    description: "Secure voice-to-text transcription services built for Canadians",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-CA" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="theme-color" content="#003366" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: 'var(--ttt-lavender-light)' }}
        suppressHydrationWarning
      >
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
