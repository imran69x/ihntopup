import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'টপ আপ - IHN TopUp',
    description: 'সব ধরনের গেমিং টপ আপ এক জায়গায়। Free Fire Diamond, PUBG UC, Mobile Legends Diamond। সেরা দাম এবং তাৎক্ষণিক ডেলিভারি।',
    alternates: {
        canonical: 'https://ihntopup.shop/topup',
    },
    openGraph: {
        title: 'টপ আপ - IHN TopUp',
        description: 'সব ধরনের গেমিং টপ আপ এক জায়গায়',
        url: 'https://ihntopup.shop/topup',
    },
};

export default function TopupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
