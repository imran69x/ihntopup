'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, RotateCcw, Diamond, Download, CodeXml, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

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
    const { appUser, firebaseUser } = useAuthContext();
    const firestore = useFirestore();

    // Limit logic
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usageData = appUser?.ffIdCheckerData;
    const currentUsage = usageData?.lastCheckMonth === currentMonth ? (usageData?.monthlyChecks || 0) : 0;

    let limit = 2; // Default
    if (appUser?.isAdmin) limit = Infinity;
    else if (appUser?.hasVerifiedBadge) limit = 5;

    const remaining = limit - currentUsage;
    const isLimitReached = !appUser?.isAdmin && remaining <= 0;

    const handleCheck = async () => {
        if (!uid || uid.trim() === '') {
            toast({
                variant: 'destructive',
                title: 'প্লেয়ার আইডি প্রয়োজন',
                description: 'অনুগ্রহ করে প্রথমে আপনার ফ্রি ফায়ার আইডি দিন।'
            });
            return;
        }

        if (isLimitReached) {
            toast({
                variant: 'destructive',
                title: 'লিমিট শেষ!',
                description: 'আপনার এই মাসের ফ্রি ফায়ার আইডি চেক করার লিমিট শেষ হয়ে গেছে।'
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
                
                // Increment monthly check count for non-admins
                if (!appUser?.isAdmin && firebaseUser && firestore) {
                    try {
                        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
                        await updateDoc(userDocRef, {
                            'ffIdCheckerData.lastCheckMonth': currentMonth,
                            'ffIdCheckerData.monthlyChecks': currentUsage + 1
                        });
                    } catch (err) {
                        console.error("Error updating usage limit:", err);
                    }
                }

                toast({
                    title: 'সফল!',
                    description: 'প্লেয়ার ইনফো সফলভাবে পাওয়া গেছে।',
                    className: "bg-green-600 text-white border-none",
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
            <div className="max-w-xl mx-auto mt-8 print:hidden">
                <Card className="border-t-4 border-t-green-600 shadow-lg">
                    <CardContent className="pt-6 pb-8 px-6 sm:px-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-green-600 font-semibold">
                                <CodeXml size={20} />
                                <span>Free Fire UID Check</span>
                            </div>
                            
                            {/* Usage Limit Display */}
                            {!appUser?.isAdmin && appUser && (
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5",
                                    isLimitReached 
                                        ? "bg-red-50 text-red-600 border-red-200" 
                                        : "bg-green-50 text-green-600 border-green-200"
                                )}>
                                    {appUser.hasVerifiedBadge && <ShieldCheck size={12} className="text-blue-500" />}
                                    <span>সীমা: {remaining}/{limit}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-4">
                            <Input
                                placeholder="Enter Free Fire UID"
                                value={uid}
                                onChange={(e) => setUid(e.target.value)}
                                className="h-12 text-lg border-gray-300 focus-visible:ring-green-600"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCheck();
                                }}
                            />
                            
                            <Button 
                                onClick={handleCheck} 
                                disabled={isChecking || !uid}
                                className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 text-white"
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
                                className="w-full h-12 text-lg font-bold text-green-600 border-green-600 hover:bg-green-50"
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
    const profileInfo = playerData?.AccountProfileInfo || {};
    const equippedInfo = playerData?.EquippedItemsInfo || {};
    const socialInfo = playerData?.SocialInfo || {};
    const petInfo = playerData?.PetInfo || {};
    const guildInfo = playerData?.GuildInfo || {};
    const captainInfo = playerData?.GuildOwnerInfo || {};
    const creditScoreInfo = playerData?.CreditScoreInfo || {};

    const DataRow = ({ label, value }: { label: string, value: any }) => (
        <div className="flex text-xs sm:text-sm py-1.5 border-b border-gray-100 last:border-0 hover:bg-green-50/50 px-1 rounded transition-colors">
            <span className="font-semibold text-gray-700 w-32 flex-shrink-0">{label}:</span>
            <span className="text-gray-600 truncate">{value || 'N/A'}</span>
        </div>
    );

    const Section = ({ title, icon, children }: { title: string, icon?: React.ReactNode, children: React.ReactNode }) => (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full">
            <div className="bg-green-50/80 px-4 py-3 border-b border-green-100 flex items-center gap-2">
                <span className="text-green-700 font-bold text-sm flex items-center gap-2 uppercase tracking-wide">
                    {icon} {title}
                </span>
            </div>
            <div className="p-4 space-y-1">
                {children}
            </div>
        </div>
    );

    return (
        <div className="print-wrapper w-full relative">
            {/* ------------------------------------------------------------------------- */}
            {/* Normal Web Result View */}
            <div className="max-w-4xl mx-auto mt-4 pb-12 print:hidden relative">
                
                {/* Status Badge in Results View */}
                {!appUser?.isAdmin && appUser && (
                    <div className="absolute top-0 right-0 p-2">
                        <div className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm",
                            isLimitReached 
                                ? "bg-red-50 text-red-600 border-red-200" 
                                : "bg-green-50 text-green-600 border-green-200"
                        )}>
                            {appUser.hasVerifiedBadge && <ShieldCheck size={12} className="text-blue-500" />}
                            <span>অবশিষ্ট সীমা: {remaining}/{limit}</span>
                        </div>
                    </div>
                )}

                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
                        {accountInfo?.AccountName || 'Unknown'}
                    </h1>
                    <div className="flex justify-center items-center gap-4 text-sm font-semibold text-gray-700 mb-4">
                        <span>Level {accountInfo?.AccountLevel || 'N/A'}</span>
                        <span>Likes: {accountInfo?.AccountLikes || 'N/A'}</span>
                    </div>
                    
                    {accountInfo?.AccountCreateTime && (
                        <div className="bg-gray-500 text-white py-1 px-4 rounded-full inline-block text-xs font-medium shadow-sm">
                            Id open: {new Date(Number(accountInfo.AccountCreateTime) * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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
                        <DataRow label="Season ID" value={accountInfo?.AccountSeasonId || 'N/A'} />
                        <DataRow label="Credit Score" value={creditScoreInfo?.creditScore || '100'} />
                        <DataRow label="Bio" value={socialInfo?.signature || 'N/A'} />
                    </Section>

                    {/* ACCOUNT ACTIVITY */}
                    <Section title="Account Activity">
                        <DataRow label="Release Version" value={playerData?.ReleaseVersion || 'N/A'} />
                        <DataRow label="BR Rank Points" value={profileInfo?.BrRankPoint} />
                        <DataRow label="CS Rank Points" value={profileInfo?.CsRankPoint} />
                        <DataRow label="Created At" value={accountInfo?.AccountCreateTime ? new Date(Number(accountInfo.AccountCreateTime) * 1000).toLocaleString() : 'N/A'} />
                        <DataRow label="Last Login" value={accountInfo?.AccountLastLogin ? new Date(Number(accountInfo.AccountLastLogin) * 1000).toLocaleString() : 'N/A'} />
                    </Section>

                    {/* ACCOUNT OVERVIEW */}
                    <Section title="Account Overview">
                        <DataRow label="Avatar ID" value={equippedInfo?.EquippedAvatarId} />
                        <DataRow label="Banner ID" value={equippedInfo?.EquippedBannerId} />
                        <DataRow label="BP Badges" value={equippedInfo?.EquippedBPBadges} />
                        <DataRow label="Account Type" value={playerData?.AccountType} />
                        <DataRow label="Show BR Rank" value={profileInfo?.ShowBrRank ? 'Yes' : 'No'} />
                        <DataRow label="Show CS Rank" value={profileInfo?.ShowCsRank ? 'Yes' : 'No'} />
                    </Section>

                    {/* PET DETAILS */}
                    <Section title="Pet Details">
                        <DataRow label="Pet ID" value={petInfo?.id} />
                        <DataRow label="Pet Level" value={petInfo?.level} />
                        <DataRow label="Pet Exp" value={petInfo?.exp} />
                        <DataRow label="Pet Selected" value={petInfo?.isSelected ? 'Yes' : 'No'} />
                    </Section>

                    {/* GUILD INFO */}
                    <div className="md:col-span-2 lg:col-span-2">
                        <Section title="Guild Info">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <DataRow label="Guild Name" value={guildInfo?.GuildName === 'None' ? 'N/A' : (guildInfo?.GuildName || 'N/A')} />
                                    <DataRow label="Guild ID" value={guildInfo?.GuildID === 'None' ? 'N/A' : (guildInfo?.GuildID || 'N/A')} />
                                    <DataRow label="Guild Level" value={guildInfo?.GuildLevel || 'N/A'} />
                                    <DataRow label="Guild Members" value={guildInfo?.GuildMember ? `${guildInfo.GuildMember}/${guildInfo.GuildCapacity}` : 'N/A'} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-xs text-green-700 uppercase mb-2 mt-2 sm:mt-0">Leader Info:</h4>
                                    <DataRow label="Name" value={captainInfo?.AccountName || 'N/A'} />
                                    <DataRow label="UID" value={guildInfo?.GuildOwner === 'None' ? 'N/A' : (guildInfo?.GuildOwner || 'N/A')} />
                                    <DataRow label="Level" value={captainInfo?.AccountLevel || 'N/A'} />
                                </div>
                            </div>
                        </Section>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-3 mt-8">
                    <Button onClick={handleDownloadPdf} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6">
                        <Download className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                    <Button onClick={() => setPlayerData(null)} className="bg-green-600 hover:bg-green-700 text-white px-6">
                        <RotateCcw className="mr-2 h-4 w-4" /> Check Another
                    </Button>
                    <Button onClick={() => router.push('/')} className="bg-[#ffc107] hover:bg-[#ffb300] text-black px-6 font-semibold">
                        <Diamond className="mr-2 h-4 w-4" /> Diamond Top Up
                    </Button>
                </div>
            </div>

            {/* ------------------------------------------------------------------------- */}
            {/* PRINT ONLY LAYOUT (Matches EXACTLY the gameskinbo layout requested) */}
            {/* ------------------------------------------------------------------------- */}
            <div className="hidden print:block w-[794px] h-[1123px] bg-white relative mx-auto font-sans overflow-hidden">
                {/* Watermark Logo */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none z-0">
                    <span className="text-[12rem] font-black uppercase text-green-900 -rotate-45 tracking-wider">IHNTOPUP</span>
                </div>

                {/* Top Right Diagonal Ribbon */}
                <div className="absolute top-12 -right-16 w-80 z-10 pointer-events-none">
                    <div className="bg-green-600 text-white text-center font-bold text-2xl py-3 shadow-md transform rotate-45 tracking-widest uppercase">
                        Player Info
                    </div>
                </div>

                {/* Document Content */}
                <div className="relative z-10 px-12 py-16">
                    
                    {/* Header Branding */}
                    <div className="mb-14 pt-4">
                        <h1 className="text-5xl font-black text-green-600 italic tracking-tight mb-2 uppercase">IHNTOPUP</h1>
                        <p className="text-gray-800 text-sm font-semibold italic pl-1 tracking-wide">free fire diamond top up service in BD</p>
                    </div>

                    {/* Grid Content directly cloned from screenshot's structure */}
                    <div className="grid grid-cols-2 gap-x-12 gap-y-10">
                        
                        {/* Left Column */}
                        <div className="space-y-12">
                            {/* ACCOUNT INFO */}
                            <div>
                                <h2 className="text-green-600 font-black text-xl mb-4 uppercase tracking-tighter"># ACCOUNT INFO</h2>
                                <div className="space-y-2 text-[13px] text-gray-900 leading-snug">
                                    <div className="flex"><span className="w-32 font-bold select-none">UID:</span><span className="font-semibold">{uid}</span></div>
                                    <div className="flex"><span className="w-32 font-bold select-none">Name:</span><span className="font-semibold">{accountInfo?.AccountName}</span></div>
                                    <div className="flex"><span className="w-32 font-bold select-none">Level:</span><span className="font-semibold">{accountInfo?.AccountLevel}</span></div>
                                    <div className="flex"><span className="w-32 font-bold select-none">Region:</span><span className="font-semibold">{accountInfo?.AccountRegion}</span></div>
                                    <div className="flex"><span className="w-32 font-bold select-none">Likes:</span><span className="font-semibold">{accountInfo?.AccountLikes}</span></div>
                                    <div className="flex"><span className="w-32 font-bold select-none">Season ID:</span><span className="font-semibold">{accountInfo?.AccountSeasonId}</span></div>
                                    <div className="flex"><span className="w-32 font-bold select-none">Credit Score:</span><span className="font-semibold">{creditScoreInfo?.creditScore || '100'}</span></div>
                                    <div className="flex"><span className="w-32 font-bold select-none">Bio:</span><span className="font-semibold whitespace-pre-wrap">{socialInfo?.signature}</span></div>
                                </div>
                            </div>

                            {/* PET DETAILS */}
                            <div>
                                <h2 className="text-green-600 font-black text-xl mb-4 uppercase tracking-tighter"># PET DETAILS</h2>
                                <div className="space-y-2 text-[13px] text-gray-900 leading-snug">
                                    <div className="flex"><span className="w-32 font-bold select-none">Pet ID:</span><span className="font-semibold">{petInfo?.id}</span></div>
                                    <div className="flex"><span className="w-32 font-bold select-none">Pet Level:</span><span className="font-semibold">{petInfo?.level}</span></div>
                                    <div className="flex"><span className="w-32 font-bold select-none">Pet Exp:</span><span className="font-semibold">{petInfo?.exp}</span></div>
                                    <div className="flex"><span className="w-32 font-bold select-none">Pet Selected:</span><span className="font-semibold">{petInfo?.isSelected ? 'Yes' : 'No'}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-12">
                            {/* ACCOUNT ACTIVITY */}
                            <div>
                                <h2 className="text-green-600 font-black text-xl mb-4 uppercase tracking-tighter"># ACCOUNT ACTIVITY</h2>
                                <div className="space-y-2 text-[13px] text-gray-900 leading-snug">
                                    <div className="flex"><span className="w-40 font-bold select-none">Release Version:</span><span className="font-semibold">{playerData?.ReleaseVersion}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">BR Rank Points:</span><span className="font-semibold">{profileInfo?.BrRankPoint}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">CS Rank Points:</span><span className="font-semibold">{profileInfo?.CsRankPoint}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">Created At:</span><span className="font-semibold">{accountInfo?.AccountCreateTime ? new Date(Number(accountInfo.AccountCreateTime) * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">Last Login:</span><span className="font-semibold">{accountInfo?.AccountLastLogin ? new Date(Number(accountInfo.AccountLastLogin) * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span></div>
                                </div>
                            </div>

                            {/* ACCOUNT OVERVIEW */}
                            <div>
                                <h2 className="text-green-600 font-black text-xl mb-4 uppercase tracking-tighter"># ACCOUNT OVERVIEW</h2>
                                <div className="space-y-2 text-[13px] text-gray-900 leading-snug">
                                    <div className="flex"><span className="w-40 font-bold select-none">Avatar ID:</span><span className="font-semibold">{equippedInfo?.EquippedAvatarId}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">Banner ID:</span><span className="font-semibold">{equippedInfo?.EquippedBannerId}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">BP Badges:</span><span className="font-semibold">{equippedInfo?.EquippedBPBadges}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">Account Type:</span><span className="font-semibold">{playerData?.AccountType}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">Show BR Rank:</span><span className="font-semibold">{profileInfo?.ShowBrRank ? 'Yes' : 'No'}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">Show CS Rank:</span><span className="font-semibold">{profileInfo?.ShowCsRank ? 'Yes' : 'No'}</span></div>
                                </div>
                            </div>

                            {/* GUILD INFO */}
                            <div>
                                <h2 className="text-green-600 font-black text-xl mb-4 uppercase tracking-tighter"># GUILD INFO</h2>
                                <div className="space-y-2 text-[13px] text-gray-900 leading-snug">
                                    <div className="flex"><span className="w-40 font-bold select-none">Guild Name:</span><span className="font-semibold">{guildInfo?.GuildName === 'None' ? 'N/A' : (guildInfo?.GuildName || 'N/A')}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">Guild ID:</span><span className="font-semibold">{guildInfo?.GuildID === 'None' ? 'N/A' : (guildInfo?.GuildID || 'N/A')}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">Guild Level:</span><span className="font-semibold">{guildInfo?.GuildLevel || 'N/A'}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">Guild Members:</span><span className="font-semibold">{guildInfo?.GuildMember ? `${guildInfo.GuildMember}/${guildInfo.GuildCapacity}` : 'N/A'}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">Leader Name:</span><span className="font-semibold">{captainInfo?.AccountName || 'N/A'}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">Leader UID:</span><span className="font-semibold">{guildInfo?.GuildOwner === 'None' ? 'N/A' : (guildInfo?.GuildOwner || 'N/A')}</span></div>
                                    <div className="flex"><span className="w-40 font-bold select-none">Leader Level:</span><span className="font-semibold">{captainInfo?.AccountLevel || 'N/A'}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    /* Strict reset for standard Web styling in print */
                    html, body {
                        width: 100%;
                        height: 100%;
                        margin: 0 !important;
                        padding: 0 !important;
                        background-color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    /* Ensures no navigation or regular layouts interfere */
                    header, footer, nav, .print\\:hidden, aside { display: none !important; }

                    /* Target A4 explicitly and remove page margins */
                    @page { 
                        size: A4 portrait; 
                        margin: 0;
                    }

                    /* Unhide our specialized print block */
                    .print\\:block { 
                        display: block !important; 
                        visibility: visible !important;
                    }

                    /* Allow the wrapper to fill whole A4 perfectly */
                    .print-wrapper {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100vw;
                        height: 100vh;
                    }
                }
            `}} />
        </div>
    );
}

