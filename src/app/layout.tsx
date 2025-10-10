import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { validateProductionEnvironment, logValidationResults } from "@/lib/config/production-validation";

const inter = Inter({ subsets: ["latin"] });

// Run production validation on server startup
if (typeof window === 'undefined') {
  const validationResult = validateProductionEnvironment();
  logValidationResults(validationResult);
}

export const metadata: Metadata = {
  title: "Talk to Text Canada",
  description: "Professional transcription services for legal professionals, businesses, and individuals across Canada",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ClientWrapper>{children}</ClientWrapper>
        <SpeedInsights />
      </body>
    </html>
  );
}
