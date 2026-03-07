import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const hasValidClerkKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_');

export const metadata: Metadata = {
  title: 'SignalWave - Email Campaign Platform',
  description:
    'AI-powered enterprise email campaign platform for SMBs. Send branded campaigns from your own domain.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );

  if (hasValidClerkKey) {
    return <ClerkProvider>{content}</ClerkProvider>;
  }

  return content;
}
