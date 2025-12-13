

'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface RedirectLoaderProps {
  isLoading: boolean;
  title?: string;
  message?: string;
}

export const RedirectLoader = ({ isLoading, title = "Redirecting to Payment...", message = "Please wait while we redirect you to the payment gateway" }: RedirectLoaderProps) => {
  return (
    <Dialog open={isLoading}>
      <DialogContent 
        className="bg-transparent border-none shadow-none flex items-center justify-center p-0"
        hideCloseButton={true}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center p-8 bg-card rounded-2xl shadow-2xl max-w-sm w-full">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{message}</DialogDescription>
            </DialogHeader>
            <div className="relative h-16 w-16">
                 <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-foreground sr-only">{title}</h3>
            <p className="text-muted-foreground sr-only">{message}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
