import type { Metadata } from 'next';
import './globals.css';
import AppLayout from '@/components/AppLayout';
import Script from 'next/script';

export const metadata: Metadata = {
  metadataBase: new URL('https://ihntopup.shop'),
  title: {
    default: 'IHN TopUp - দ্রুত এবং সহজ টপ আপ সেবা | বাংলাদেশ',
    template: '%s | IHN TopUp'
  },
  description: 'বাংলাদেশের সবচেয়ে বিশ্বস্ত টপ আপ সেবা। Free Fire, PUBG, Mobile Legends ডায়মন্ড - সব কিছু এক জায়গায়। দ্রুত ডেলিভারি, নিরাপদ পেমেন্ট।',
  keywords: ['topup', 'টপ আপ', 'free fire diamond', 'pubg uc', 'mobile legends', 'bangladesh', 'bkash', 'nagad'],
  authors: [{ name: 'IHN TopUp' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  alternates: {
    canonical: 'https://ihntopup.shop',
    languages: {
      'bn-BD': 'https://ihntopup.shop',
    }
  },
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    url: 'https://ihntopup.shop',
    siteName: 'IHN TopUp',
    title: 'IHN TopUp - দ্রুত এবং সহজ টপ আপ সেবা',
    description: 'বাংলাদেশের সবচেয়ে বিশ্বস্ত টপ আপ সেবা। Free Fire, PUBG, Mobile Legends ডায়মন্ড - সব কিছু এক জায়গায়।',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'IHN TopUp',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IHN TopUp - দ্রুত এবং সহজ টপ আপ সেবা',
    description: 'বাংলাদেশের সবচেয়ে বিশ্বস্ত টপ আপ সেবা। Free Fire, PUBG, Mobile Legends ডায়মন্ড।',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // JSON-LD Schema for Organization
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'IHN TopUp',
    alternateName: 'IHN TOPUP',
    url: 'https://ihntopup.shop',
    logo: 'https://ihntopup.shop/logo.png',
    description: 'Digital top-up and gaming service in Bangladesh providing instant delivery for Free Fire, PUBG, Mobile Legends and more.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'BD',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Bengali', 'English'],
    },
    sameAs: [
      'https://facebook.com/ihntopup',
      'https://t.me/ihntopup',
    ],
  };

  // JSON-LD Schema for WebSite with SearchAction
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'IHN TopUp',
    url: 'https://ihntopup.shop',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://ihntopup.shop/topup?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'bn-BD',
  };

  return (
    <html lang="bn" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Righteous&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4CAF50" />
        {/* Google Search Console Verification - Add your code here after getting it */}
        {/* <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" /> */}
      </head>
      <body className="font-body antialiased min-h-screen bg-background">
        {/* JSON-LD Schema Markup */}
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <Script
          id="website-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
