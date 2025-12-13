'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
  const router = useRouter();
  return (
    <div className="container mx-auto px-4 py-8 fade-in">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold font-headline">Privacy Policy</h1>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            IHN TOPUP is committed to protecting your personal information. This policy explains how we collect, use, and safeguard your data.
          </p>

          <h3 className="font-bold text-lg text-foreground pt-4">Information We Collect</h3>
          <p>
            We may collect the following information:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Personal identification information, such as your name, email address, and phone number.</li>
            <li>Details of your orders, such as product names, game IDs, and payment history.</li>
            <li>Technical data during website usage, such as your IP address and browser information.</li>
          </ul>

          <h3 className="font-bold text-lg text-foreground pt-4">How We Use Your Information</h3>
          <p>
            Your information is used for the following purposes:
          </p>
           <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>To process and complete your orders.</li>
              <li>To provide customer service and support.</li>
              <li>To improve our services and personalize the user experience.</li>
              <li>To prevent fraud and ensure security.</li>
          </ul>

          <h3 className="font-bold text-lg text-foreground pt-4">Information Sharing</h3>
          <p>
            We do not sell or rent your personal information to any third parties. However, information may be shared with trusted partners who assist us in providing our services or for legal requirements.
          </p>

           <h3 className="font-bold text-lg text-foreground pt-4">Your Rights</h3>
          <p>
            You have the right to access, correct, or delete your personal information. To exercise this right, please contact us.
          </p>

          <p className="pt-4">
            Our Privacy Policy may be updated from time to time. You are requested to check this page regularly for any changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
