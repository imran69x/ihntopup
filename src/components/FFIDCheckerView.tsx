'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, RotateCcw, Diamond, Download, CodeXml } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface FFIDCheckerViewProps {
    initialUid?: string;
}

export default function FFIDCheckerView({ initialUid = '' }: FFIDCheckerViewProps) {
    const [uid, setUid] = useState(initialUid);
    const [isChecking, setIsChecking] = useState(false);
    const [playerData, setPlayerData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    const handleCheck = async () => {
        if (!uid || uid.trim() === '') {
            toast({
                variant: 'destructive',
                title: 'প্লেয়ার আইডি প্রয়োজন',
                description: 'অনুগ্রহ করে প্রথমে আপনার ফ্রি ফায়ার আইডি দিন।'
            });
            return;
        }

        setIsChecking(true);
        setError(null);
        setPlayerData(null);

        try {
            const response = await fetch('/api/ff-id-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ playerid: uid.trim() }),
            });

            const result = await response.json();

            if (result.success && result.data) {
                setPlayerData(result.data);
                toast({
                    title: 'সফল!',
                    description: 'প্লেয়ার ইনফো সফলভাবে পাওয়া গেছে।',
                    className: "bg-green-500 text-white border-none",
                });
            } else {
                setError(result.error || 'আইডি খুঁজে পাওয়া যায়নি।');
            }
        } catch (err: any) {
            setError(err.message || 'সার্ভার সমস্যা, পরে আবার চেষ্টা করুন।');
        } finally {
            setIsChecking(false);
        }
    };

    const handleDownloadPdf = () => {
        window.print();
    };

    if (!playerData) {
        return (
            <div className="max-w-xl mx-auto mt-8">
                <Card className="border-t-4 border-t-[#ff5722] shadow-lg">
                    <CardContent className="pt-6 pb-8 px-6 sm:px-10">
                        <div className="flex items-center gap-2 text-[#ff5722] mb-6 font-semibold">
                            <CodeXml size={20} />
                            <span>Free Fire UID Check</span>
                        </div>
                        
                        <div className="space-y-4">
                            <Input
                                placeholder="Enter Free Fire UID"
                                value={uid}
                                onChange={(e) => setUid(e.target.value)}
                                className="h-12 text-lg border-gray-300 focus-visible:ring-[#ff5722]"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCheck();
                                }}
                            />
                            
                            <Button 
                                onClick={handleCheck} 
                                disabled={isChecking || !uid}
                                className="w-full h-12 text-lg font-bold bg-[#ff5722] hover:bg-[#e64a19] text-white"
                            >
                                {isChecking ? (
                                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking...</>
                                ) : (
                                    'CHECK PLAYER INFO'
                                )}
                            </Button>
                            
                            <Button 
                                onClick={() => router.push('/')}
                                variant="outline"
                                className="w-full h-12 text-lg font-bold text-[#ff5722] border-[#ff5722] hover:bg-[#ff5722]/10"
                            >
                                <Diamond className="mr-2 h-5 w-5" />
                                DIAMOND TOP UP
                            </Button>
                        </div>
                        
                        {error && (
                            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md flex items-center gap-2 border border-red-200">
                                <AlertCircle size={18} />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Safely extract data
    const accountInfo = playerData?.AccountInfo || {};
    const activity = playerData?.AccountActivity || {};
    const overview = playerData?.AccountProfileInfo || playerData?.AccountOverview || {};
    const pet = playerData?.petInfo || playerData?.PetDetails || {};
    const guild = playerData?.GuildInfo || {};
    const captain = playerData?.captainInfo || guild?.CaptainInfo || {};

    const DataRow = ({ label, value }: { label: string, value: any }) => (
        <div className="flex text-xs sm:text-sm py-1 border-b border-gray-100 last:border-0">
            <span className="font-semibold text-gray-700 w-32 flex-shrink-0">{label}:</span>
            <span className="text-gray-600 truncate">{value || 'N/A'}</span>
        </div>
    );

    const Section = ({ title, icon, children }: { title: string, icon?: React.ReactNode, children: React.ReactNode }) => (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full">
            <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                <span className="text-[#ff5722] font-semibold text-sm flex items-center gap-2 uppercase tracking-wide">
                    {icon} {title}
                </span>
            </div>
            <div className="p-4 space-y-1">
                {children}
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto mt-4 pb-12 print-container">
            {/* Header section identical to screenshot */}
            <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#ff5722] mb-1">
                    {accountInfo?.AccountName || 'Unknown'}
                </h1>
                <div className="flex justify-center items-center gap-4 text-sm font-semibold text-gray-700 mb-4">
                    <span>Level {accountInfo?.AccountLevel || 'N/A'}</span>
                    <span>Likes: {accountInfo?.AccountLikes || 'N/A'}</span>
                </div>
                
                {activity?.AccountCreateTime && (
                    <div className="bg-gray-500 text-white py-1 px-4 rounded-full inline-block text-xs font-medium shadow-sm">
                        Id open: {new Date(Number(activity.AccountCreateTime) * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
                
                {/* ACCOUNT INFO */}
                <Section title="Account Info">
                    <DataRow label="UID" value={uid} />
                    <DataRow label="Name" value={accountInfo?.AccountName} />
                    <DataRow label="Level" value={accountInfo?.AccountLevel} />
                    <DataRow label="Region" value={accountInfo?.AccountRegion} />
                    <DataRow label="Likes" value={accountInfo?.AccountLikes} />
                    <DataRow label="Season ID" value={playerData?.seasonId || 'N/A'} />
                    <DataRow label="Credit Score" value={accountInfo?.csRank || '100'} />
                    <DataRow label="Bio" value={playerData?.socialInfo?.AccountSignature || 'N/A'} />
                </Section>

                {/* ACCOUNT ACTIVITY */}
                <Section title="Account Activity">
                    <DataRow label="Release Version" value={activity?.AccountReleaseVersion} />
                    <DataRow label="BR Rank Points" value={activity?.BrMaxRankPoint} />
                    <DataRow label="CS Rank Points" value={activity?.CsMaxRankPoint} />
                    <DataRow label="Created At" value={activity?.AccountCreateTime ? new Date(Number(activity.AccountCreateTime) * 1000).toLocaleString() : 'N/A'} />
                    <DataRow label="Last Login" value={activity?.AccountLastLogin ? new Date(Number(activity.AccountLastLogin) * 1000).toLocaleString() : 'N/A'} />
                </Section>

                {/* ACCOUNT OVERVIEW */}
                <Section title="Account Overview">
                    <DataRow label="Avatar ID" value={overview?.AvatarId} />
                    <DataRow label="Banner ID" value={overview?.BannerId} />
                    <DataRow label="BP Badges" value={overview?.EquippedBpBadges} />
                    <DataRow label="Account Type" value={overview?.AccountType} />
                    <DataRow label="Show BR Rank" value={overview?.ShowBrRank ? 'Yes' : 'No'} />
                    <DataRow label="Show CS Rank" value={overview?.ShowCsRank ? 'Yes' : 'No'} />
                </Section>

                {/* PET DETAILS */}
                <Section title="Pet Details">
                    <DataRow label="Pet ID" value={pet?.id} />
                    <DataRow label="Pet Level" value={pet?.level} />
                    <DataRow label="Pet Exp" value={pet?.exp} />
                    <DataRow label="Pet Selected" value={pet?.isSelected ? 'Yes' : 'No'} />
                </Section>

                {/* GUILD INFO */}
                <div className="md:col-span-2 lg:col-span-2">
                    <Section title="Guild Info">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <DataRow label="Guild Name" value={guild?.GuildName} />
                                <DataRow label="Guild ID" value={guild?.GuildId} />
                                <DataRow label="Guild Level" value={guild?.GuildLevel} />
                                <DataRow label="Guild Members" value={guild?.GuildMember ? `${guild.GuildMember}/${guild.GuildCapacity}` : 'N/A'} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-xs text-gray-500 uppercase mb-2 mt-2 sm:mt-0">Leader Info:</h4>
                                <DataRow label="Name" value={captain?.AccountName} />
                                <DataRow label="UID" value={captain?.AccountId} />
                                <DataRow label="Level" value={captain?.AccountLevel} />
                            </div>
                        </div>
                    </Section>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3 mt-8 print:hidden">
                <Button onClick={handleDownloadPdf} className="bg-[#4caf50] hover:bg-[#43a047] text-white px-6">
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                <Button onClick={() => setPlayerData(null)} className="bg-[#ff5722] hover:bg-[#e64a19] text-white px-6">
                    <RotateCcw className="mr-2 h-4 w-4" /> Check Another
                </Button>
                <Button onClick={() => router.push('/')} className="bg-[#ffc107] hover:bg-[#ffb300] text-black px-6 font-semibold">
                    <Diamond className="mr-2 h-4 w-4" /> Diamond Top Up
                </Button>
            </div>

            {/* Print styles right in the component to hide non-printable areas */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    header, footer, nav, .print\\:hidden { display: none !important; }
                    body { background: white; }
                    .print-container { max-width: 100%; margin: 0; padding: 0; box-shadow: none; }
                }
            `}} />
        </div>
    );
}
