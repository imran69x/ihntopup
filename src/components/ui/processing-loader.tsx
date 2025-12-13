
'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ProcessingLoaderProps {
  isLoading: boolean;
  message?: string;
}

export const ProcessingLoader = ({ isLoading, message = "আপনার অনুরোধটি প্রক্রিয়া করা হচ্ছে..." }: ProcessingLoaderProps) => {
  return (
    <Dialog open={isLoading}>
      <DialogContent 
        className="bg-transparent border-none shadow-none flex items-center justify-center p-0"
        hideCloseButton={true}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center p-8 bg-card rounded-2xl shadow-2xl max-w-sm w-full">
            <DialogHeader>
              <DialogTitle>অনুগ্রহ করে অপেক্ষা করুন...</DialogTitle>
              <DialogDescription>{message}</DialogDescription>
            </DialogHeader>
            <div className="relative h-16 w-16">
                 <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-foreground sr-only">অনুগ্রহ করে অপেক্ষা করুন...</h3>
            <p className="text-muted-foreground sr-only">{message}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
