import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'লগইন করুন - IHN TopUp',
    description: 'আপনার IHN TopUp অ্যাকাউন্টে লগইন করুন। তাৎক্ষণিক টপ আপ এবং ডিজিটাল কার্ড সেবা পান।',
    alternates: {
        canonical: 'https://ihntopup.shop/login',
    },
    openGraph: {
        title: 'লগইন করুন - IHN TopUp',
        description: 'আপনার IHN TopUp অ্যাকাউন্টে লগইন করুন',
        url: 'https://ihntopup.shop/login',
    },
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
