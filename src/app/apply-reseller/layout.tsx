import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'রিসেলার আবেদন - IHN TopUp',
    description: 'IHN TopUp রিসেলার হয়ে আয় করুন। পাইকারি দামে টপ আপ কিনে বিক্রয় করুন।',
    alternates: {
        canonical: 'https://ihntopup.shop/apply-reseller',
    },
};

export default function ApplyResellerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
