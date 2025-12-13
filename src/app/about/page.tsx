'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AboutPage() {
  const router = useRouter();
  return (
    <div className="container mx-auto px-4 py-8 fade-in">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold font-headline">About Us</h1>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Welcome to IHN TOPUP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            IHN TOPUP is a leading digital gaming top-up platform dedicated to providing gamers with a seamless and secure way to purchase in-game currency, vouchers, and gift cards. Our mission is to make digital purchases faster, easier, and more reliable for everyone.
          </p>
          <p>
            We believe that gaming should be an uninterrupted and enjoyable experience. That’s why we offer instant delivery on a wide range of products, ensuring you get back to your game without delay. From popular mobile games to essential digital services, our catalog is constantly expanding to meet your needs.
          </p>
          <p>
            Security is at the heart of everything we do. We use Google Sign-In to provide a secure and convenient login experience, allowing users to access their accounts without creating separate passwords. This helps keep your account and personal information safe.
          </p>
          <p>
            At IHN TOPUP, we are committed to protecting your data and handling it responsibly. Your privacy is important to us. For more details on how we protect your information, please visit our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
           <p>
            Our team is passionate about gaming and dedicated to providing exceptional customer support. If you have any questions or need assistance, our support team is available 24/7 to help you.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
