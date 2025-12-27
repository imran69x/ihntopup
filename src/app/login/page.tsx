'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleIcon } from "@/components/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth as useFirebaseAuth, useFirestore, updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup, User, AuthError } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, serverTimestamp } from "firebase/firestore";
import Image from 'next/image';
import { getBengaliErrorMessage } from "@/lib/error-messages";

// Function to generate a unique 8-digit numeric ID
const generateUniqueId = () => Math.floor(10000000 + Math.random() * 90000000).toString();

const saveUserToFirestore = async (firestore: any, user: User) => {
  const userRef = doc(firestore, "users", user.uid);
  try {
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
      // For a new user, create the full document using setDoc.
      await setDocumentNonBlocking(userRef, {
        id: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        walletBalance: 0,
        coinFund: 0,
        referralCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
        uniqueId: generateUniqueId(),
        isVerified: true, // Google users are considered verified
        isAdmin: false,
        savedGameUids: [],
        points: 0,
        createdAt: serverTimestamp(),
      });
    } else {
      // For an existing user, only update fields that might change on login.
      // Also, implement "lazy migration" for the uniqueId field.
      const userData = docSnap.data();
      const updates: any = {
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      };

      if (!userData.uniqueId) {
        updates.uniqueId = generateUniqueId();
      }

      await updateDocumentNonBlocking(userRef, updates);
    }
  } catch (error) {
    console.error("Error saving user to Firestore:", error);
    // We can throw the error to be caught by the calling function
    throw error;
  }
};


export default function LoginPage() {
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    if (!auth || !firestore) {
      toast({ variant: "destructive", title: "Google লগইন ব্যর্থ", description: "অনুমোদন পরিষেবা উপলব্ধ নেই।" });
      setIsGoogleLoading(false);
      return;
    }
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserToFirestore(firestore, result.user);
      toast({ title: "লগইন সফল", description: "স্বাগতম!" });
      router.push('/');
    } catch (error: any) {
      const errorMessage = getBengaliErrorMessage(error.code);
      toast({ variant: "destructive", title: "Google লগইন ব্যর্থ", description: errorMessage });
    } finally {
      setIsGoogleLoading(false);
    }
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-12 fade-in pt-20 pb-24">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="p-3 bg-white rounded-2xl shadow-md mb-4 z-10">
          <Image src="/logo.png" alt="IHN TOPUP Logo" width={80} height={80} className="rounded-lg" />
        </div>
        <CardTitle className="text-2xl">স্বাগতম!</CardTitle>
        <p className="text-muted-foreground mt-1">আপনার অ্যাকাউন্টে সাইন ইন করুন</p>
      </div>

      <Card className="w-full max-w-sm shadow-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Google দিয়ে লগইন করুন</CardTitle>
          <CardDescription>আপনার অ্যাকাউন্টে দ্রুত এবং নিরাপদ অ্যাক্সেস।</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button variant="outline" className="w-full h-12 text-base" onClick={handleGoogleLogin} disabled={isGoogleLoading}>
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon className="mr-2 h-5 w-5" />
              )}
              Google দিয়ে চালিয়ে যান
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  অথবা
                </span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">দ্রুত অ্যাক্সেসের জন্য আপনার গুগল অ্যাকাউন্ট দিয়ে সাইন ইন করুন।</p>
          </div>

          <div className="mt-6 text-center text-sm">
            <p>
              নতুন ব্যবহারকারী?{" "}
              <Link href="/signup" className="font-bold text-primary hover:underline">
                অ্যাকাউন্ট তৈরি করুন
              </Link>
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              সাইন ইন করার মাধ্যমে, আপনি আমাদের <Link href="/terms" className="underline">ব্যবহারের শর্তাবলী</Link> এবং <Link href="/privacy" className="underline">গোপনীয়তা নীতিতে</Link> সম্মত হচ্ছেন।
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
