import type { Metadata } from 'next';
import './globals.css';
import AppLayout from '@/components/AppLayout';


export const metadata: Metadata = {
  title: 'IHN TOPUP',
  description: 'Instant top-ups and digital cards.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppLayout>{children}</AppLayout>;
}
