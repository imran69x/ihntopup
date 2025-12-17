import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'নিবন্ধন করুন - IHN TopUp',
    description: 'IHN TopUp এ নতুন অ্যাকাউন্ট তৈরি করুন। Free Fire, PUBG, Mobile Legends - সব কিছু এক জায়গায়।',
    alternates: {
        canonical: 'https://ihntopup.shop/signup',
    },
    openGraph: {
        title: 'নিবন্ধন করুন - IHN TopUp',
        description: 'IHN TopUp এ নতুন অ্যাকাউন্ট তৈরি করুন',
        url: 'https://ihntopup.shop/signup',
    },
};

export default function SignupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
