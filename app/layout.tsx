import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ClerkProvider } from "@clerk/nextjs";



const IBMPlex=IBM_Plex_Sans({subsets:['latin'],
  weight: ['400', '500', '600', '700'],
  variable:'--font-ibm-plex',
});
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: "Ai Saas",
  description: "AI image generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ variables: {colorPrimary: '#384262'} }}>
      <html lang="en">
      <body className={cn("font-IMBPlex antialiased", IBMPlex.variable)}>{children}</body>
      </html>
    </ClerkProvider>
    
  );
}
