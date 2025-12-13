'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, Trash2, PlusCircle, Gift } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase'
import type { ReferralSettings } from '@/lib/data'
import { doc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'

type ReferralSettingsFormValues = {
  signupBonus: number;
  referrerBonus: number;
  firstOrderBonus: number;
  purchaseBonusTiers: { threshold: number; bonus: number }[];
}

export default function ReferralSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'referral') : null, [firestore]);
  const { data: settings, isLoading } = useDoc<ReferralSettings>(settingsRef);
  
  const { register, handleSubmit, control, reset } = useForm<ReferralSettingsFormValues>({
    defaultValues: {
      signupBonus: 0,
      referrerBonus: 0,
      firstOrderBonus: 0,
      purchaseBonusTiers: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'purchaseBonusTiers',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const onSubmit = async (data: ReferralSettingsFormValues) => {
    if (!settingsRef) return;
    setIsSubmitting(true);
    try {
      updateDocumentNonBlocking(settingsRef, data);
      toast({
        title: "সেটিংস সংরক্ষিত হয়েছে",
        description: "রেফারেল সিস্টেমের সেটিংস সফলভাবে আপডেট করা হয়েছে।",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "সংরক্ষণ ব্যর্থ হয়েছে",
        description: error.message || "সেটিংস আপডেট করা যায়নি।",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Gift className='h-6 w-6 text-primary'/> রেফারেল সিস্টেম</h1>
          <p className="text-muted-foreground">রেফারেলের মাধ্যমে ব্যবহারকারীদের পুরস্কার দেওয়ার নিয়মাবলী সেট করুন।</p>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          সেটিংস সংরক্ষণ করুন
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>সাধারণ বোনাস</CardTitle>
            <CardDescription>নতুন ব্যবহারকারী এবং রেফারারদের জন্য বোনাস পয়েন্ট নির্ধারণ করুন।</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="referrerBonus">রেফারার বোনাস</Label>
              <Input id="referrerBonus" type="number" {...register('referrerBonus', { valueAsNumber: true, min: 0 })} placeholder="কত পয়েন্ট পাবে?" />
              <p className="text-xs text-muted-foreground">একজন ব্যবহারকারী যখন অন্য কাউকে রেফার করবে, তখন সে এই পয়েন্ট পাবে।</p>
            </div>
             <div className="space-y-2">
              <Label htmlFor="signupBonus">সাইনআপ বোনাস</Label>
              <Input id="signupBonus" type="number" {...register('signupBonus', { valueAsNumber: true, min: 0 })} placeholder="কত পয়েন্ট পাবে?"/>
              <p className="text-xs text-muted-foreground">রেফারেল কোড ব্যবহার করে সাইনআপ করলে নতুন ব্যবহারকারী এই পয়েন্ট পাবে।</p>
            </div>
             <div className="space-y-2">
              <Label htmlFor="firstOrderBonus">প্রথম অর্ডার বোনাস</Label>
              <Input id="firstOrderBonus" type="number" {...register('firstOrderBonus', { valueAsNumber: true, min: 0 })} placeholder="কত পয়েন্ট পাবে?"/>
               <p className="text-xs text-muted-foreground">রেফার করা ব্যবহারকারী প্রথমবার অর্ডার করলে রেফারার এই বোনাস পাবে।</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>ক্রয়ের উপর বোনাস টায়ার</CardTitle>
            <CardDescription>ব্যবহারকারীদের মোট ক্রয়ের পরিমাণের উপর ভিত্তি করে পুরস্কার দিন।</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className='space-y-3 max-h-64 overflow-y-auto pr-2'>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2 p-3 border rounded-lg bg-muted/50">
                <div className="grid grid-cols-2 gap-2 flex-grow">
                  <div className="space-y-1">
                      <Label htmlFor={`purchaseBonusTiers.${index}.threshold`} className="text-xs">প্রয়োজনীয় পরিমাণ (৳)</Label>
                      <Input
                          type="number"
                          {...register(`purchaseBonusTiers.${index}.threshold`, { valueAsNumber: true, min: 1 })}
                          placeholder="যেমন, ১০০০"
                      />
                  </div>
                  <div className="space-y-1">
                       <Label htmlFor={`purchaseBonusTiers.${index}.bonus`} className="text-xs">বোনাস পয়েন্ট</Label>
                      <Input
                          type="number"
                          {...register(`purchaseBonusTiers.${index}.bonus`, { valueAsNumber: true, min: 0 })}
                          placeholder="যেমন, ১০০"
                      />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => append({ threshold: 0, bonus: 0 })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              নতুন টায়ার যোগ করুন
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
