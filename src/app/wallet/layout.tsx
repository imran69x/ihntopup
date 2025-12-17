import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ওয়ালেট - IHN TopUp',
    description: 'আপনার IHN TopUp ওয়ালেট ম্যানেজ করুন। টাকা যোগ করুন এবং দ্রুত টপ আপ কিনুন।',
    alternates: {
        canonical: 'https://ihntopup.shop/wallet',
    },
};

export default function WalletLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
