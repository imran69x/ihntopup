import ResellerHeader from '@/components/reseller/ResellerHeader';
import ResellerBottomNav from '@/components/reseller/ResellerBottomNav';
import '../reseller-panel-bg.css';

export const metadata = {
    title: 'রিসেলার প্যানেল - IHN TopUp',
    description: 'IHN TopUp রিসেলার প্যানেল। পাইকারি দামে টপ আপ কিনুন এবং আয় করুন।',
    alternates: {
        canonical: 'https://ihntopup.shop/reseller',
    },
    openGraph: {
        title: 'রিসেলার প্যানেল - IHN TopUp',
        description: 'IHN TopUp রিসেলার প্যানেল',
        url: 'https://ihntopup.shop/reseller',
    },
};

export default function ResellerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* Living Animated Background */}
            <div className="reseller-panel-bg" />

            <div className="relative flex min-h-screen flex-col">
                <ResellerHeader />
                <main className="flex-1 pb-24 pt-16">
                    {children}
                </main>
                <ResellerBottomNav />
            </div>
        </>
    );
}
