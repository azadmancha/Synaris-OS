import type { Metadata } from 'next';
import './globals.css';
import SentryInit from '@/components/SentryInit';

export const metadata: Metadata = {
  title: 'Synaris — Learn Deeply. Think Independently. Build Fearlessly.',
  description:
    'An adaptive AI learning operating system that cultivates understanding, curiosity, and independent thinking.',
  keywords: ['learning', 'AI', 'education', 'tutor', 'adaptive learning'],
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 antialiased dark:bg-[#0F1117] dark:text-[#EDEDEE]">
        <SentryInit />
        {children}
      </body>
    </html>
  );
}
