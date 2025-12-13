'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function TermsAndConditionsPage() {
    const router = useRouter();
  return (
    <div className="container mx-auto px-4 py-8 fade-in">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold font-headline">Terms & Conditions</h1>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            Welcome to IHN TOPUP. Before using this website, please read the following terms and conditions carefully. By using our service, you are deemed to agree to these terms.
          </p>

          <h3 className="font-bold text-lg text-foreground pt-4">1. Accounts and Security</h3>
          <p>
            You may need to create an account to use our services. You are responsible for maintaining the confidentiality of your account information. You will be responsible for all activities that occur under your account.
          </p>

          <h3 className="font-bold text-lg text-foreground pt-4">2. Orders and Payments</h3>
          <p>
            All prices for top-ups and digital cards are listed on the website. We reserve the right to change prices at any time. Your order will be processed only after payment is completed. We are not responsible for incorrect game IDs or information provided by you.
          </p>

          <h3 className="font-bold text-lg text-foreground pt-4">3. Refund Policy</h3>
          <p>
            As our products are digital, there is generally no opportunity for a refund. If your order fails due to a fault in our system, we will provide a full refund.
          </p>

          <h3 className="font-bold text-lg text-foreground pt-4">4. Limitation of Service</h3>
          <p>
            We do not guarantee that our service will be uninterrupted or error-free at all times. We reserve the right to change or discontinue the service at any time without prior notice.
          </p>

          <p className="pt-4">
            These terms and conditions may be updated from time to time. You are requested to check this page regularly for any changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
