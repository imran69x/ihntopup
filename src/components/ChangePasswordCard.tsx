'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAuth as useFirebaseAuth } from "@/firebase";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

export default function ChangePasswordCard() {
    const { firebaseUser } = useAuthContext();
    const { toast } = useToast();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handlePasswordUpdate = async () => {
        if (!firebaseUser || !firebaseUser.email) {
            toast({ variant: "destructive", title: "ত্রুটি", description: "পাসওয়ার্ড পরিবর্তন করতে আপনাকে অবশ্যই লগইন করতে হবে।" });
            return;
        }

        if (newPassword !== confirmPassword) {
            toast({ variant: "destructive", title: "ত্রুটি", description: "নতুন পাসওয়ার্ড মেলেনি।" });
            return;
        }

        if (newPassword.length < 6) {
            toast({ variant: "destructive", title: "ত্রুটি", description: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" });
            return;
        }

        setIsLoading(true);

        try {
            const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
            await reauthenticateWithCredential(firebaseUser, credential);
            await updatePassword(firebaseUser, newPassword);
            
            toast({
                title: "পাসওয়ার্ড আপডেট হয়েছে",
                description: "আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।",
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "আপডেট ব্যর্থ হয়েছে",
                description: error.message || "পাসওয়ার্ড আপডেট করা যায়নি। আপনার বর্তমান পাসওয়ার্ড পরীক্ষা করুন।",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="pt-2">
            <CardDescription className="mb-4 text-center">উন্নত নিরাপত্তার জন্য আপনার পাসওয়ার্ড আপডেট করুন।</CardDescription>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="current-password">বর্তমান পাসওয়ার্ড</Label>
                    <Input id="current-password" type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="new-password">নতুন পাসওয়ার্ড</Label>
                    <Input id="new-password" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password">নতুন পাসওয়ার্ড নিশ্চিত করুন</Label>
                    <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handlePasswordUpdate} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    পাসওয়ার্ড আপডেট করুন
                </Button>
            </div>
        </div>
    );
}
