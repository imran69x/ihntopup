import ResellerHeader from '@/components/reseller/ResellerHeader';
import ResellerBottomNav from '@/components/reseller/ResellerBottomNav';
import '../reseller-panel-bg.css';

export const metadata = {
    title: 'Reseller Panel - IHN TOPUP',
    description: 'Exclusive Reseller Panel',
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
