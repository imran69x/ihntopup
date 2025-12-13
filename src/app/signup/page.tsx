'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "@/components/icons";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { useAuth as useFirebaseAuth, useFirestore, setDocumentNonBlocking } from "@/firebase";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile, User } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, collection, query, where, getDocs, writeBatch, serverTimestamp, limit } from "firebase/firestore";
import Image from 'next/image';
import type { ReferralSettings } from "@/lib/data";
import { getBengaliErrorMessage } from "@/lib/error-messages";

// Function to generate a unique 8-digit numeric ID
const generateUniqueId = () => Math.floor(10000000 + Math.random() * 90000000).toString();

const saveUserAndHandleReferral = async (firestore: any, user: User, referralCode?: string | null, name?: string) => {
    const userRef = doc(firestore, "users", user.uid);
    const userDoc = await getDoc(userRef);

    // If user document already exists, do nothing further.
    if (userDoc.exists()) {
        console.log("User already exists, skipping creation.");
        return;
    }

    const batch = writeBatch(firestore);

    // 1. Base new user document
    const newUserDocData: any = {
        id: user.uid,
        name: name || user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        walletBalance: 0,
        coinFund: 0,
        referralCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
        uniqueId: generateUniqueId(),
        isVerified: user.emailVerified,
        isAdmin: false,
        savedGameUids: [],
        points: 0,
        createdAt: serverTimestamp()
    };


    // 2. Handle referral if code is provided
    if (referralCode) {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('referralCode', '==', referralCode), limit(1));
        const referrerSnap = await getDocs(q);

        if (!referrerSnap.empty) {
            const referrerDoc = referrerSnap.docs[0];
            const referrerRef = doc(firestore, "users", referrerDoc.id);

            // Fetch referral settings
            const settingsRef = doc(firestore, 'settings', 'referral');
            const settingsDoc = await getDoc(settingsRef);

            if (settingsDoc.exists()) {
                const settings = settingsDoc.data() as ReferralSettings;
                // Add points to new user
                newUserDocData.points = (newUserDocData.points || 0) + (settings.signupBonus || 0);

                // Add points to referrer
                const referrerPoints = (referrerDoc.data().points || 0) + (settings.referrerBonus || 0);
                batch.update(referrerRef, { points: referrerPoints });

                // Create referral record
                const referralRef = doc(collection(firestore, 'referrals'));
                batch.set(referralRef, {
                    referrerId: referrerDoc.id,
                    refereeId: user.uid,
                    referralDate: serverTimestamp(),
                    isFirstOrderComplete: false
                });
            }
        }
    }

    // 3. Set the new user document in the batch
    batch.set(userRef, newUserDocData);

    // 4. Commit the batch
    await batch.commit();
};

function SignupFormComponent() {
    const auth = useFirebaseAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    useEffect(() => {
        const refCode = searchParams.get('ref');
        if (refCode) {
            setReferralCode(refCode);
        }
    }, [searchParams]);

    const handleEmailSignup = async () => {
        setIsLoading(true);
        if (!auth || !firestore) {
            toast({ variant: "destructive", title: "Signup Failed", description: "Authentication service not available." });
            setIsLoading(false);
            return;
        }
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (userCredential.user) {
                await updateProfile(userCredential.user, { displayName: name });
                // We are not blocking for verification email
                userCredential.user.sendEmailVerification();
                await saveUserAndHandleReferral(firestore, userCredential.user, referralCode, name);
            }
            toast({ title: "Verification Sent", description: "A verification email has been sent. Please verify your email and then log in." });
            router.push('/login');
        } catch (error: any) {
            const errorMessage = getBengaliErrorMessage(error.code);
            toast({ variant: "destructive", title: "Signup Failed", description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }

    const handleGoogleSignup = async () => {
        setIsGoogleLoading(true);
        if (!auth || !firestore) {
            toast({ variant: "destructive", title: "Google Signup Failed", description: "Authentication service not available." });
            setIsGoogleLoading(false);
            return;
        }
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            await saveUserAndHandleReferral(firestore, result.user, referralCode);
            toast({ title: "Signup Successful", description: "Welcome!" });
            router.push('/');
        } catch (error: any) {
            const errorMessage = getBengaliErrorMessage(error.code);
            toast({ variant: "destructive", title: "Google Signup Failed", description: errorMessage });
        } finally {
            setIsGoogleLoading(false);
        }
    };


    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-12 fade-in pt-20 pb-24">
            <div className="flex flex-col items-center text-center mb-8">
                <div className="p-3 bg-white rounded-2xl shadow-md mb-4 z-10">
                    <Image src="https://i.imgur.com/bJH9BH5.png" alt="IHN TOPUP Logo" width={48} height={48} />
                </div>
                <CardTitle className="text-2xl">Sign Up</CardTitle>
                <p className="text-muted-foreground mt-1">Join us and start topping up!</p>
            </div>

            <Card className="w-full max-w-sm shadow-xl rounded-2xl">
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <Button variant="outline" className="w-full" onClick={handleGoogleSignup} disabled={isLoading || isGoogleLoading}>
                            {isGoogleLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <GoogleIcon className="mr-2 h-5 w-5" />
                            )}
                            Sign up with Google
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="referral">Referral Code (Optional)</Label>
                            <Input id="referral" placeholder="Enter referral code" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
                        </div>

                        <Button onClick={handleEmailSignup} className="w-full" disabled={isLoading || isGoogleLoading}>
                            {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            Create an account
                        </Button>
                    </div>

                    <div className="mt-6 text-center text-sm">
                        Already have an account?{" "}
                        <Link href="/login" className="font-bold text-primary hover:underline">
                            Sign in
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SignupFormComponent />
        </Suspense>
    )
}
