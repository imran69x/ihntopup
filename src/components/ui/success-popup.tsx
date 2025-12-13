
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { Button } from "./button";

interface SuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export default function SuccessPopup({ isOpen, onClose, title, message }: SuccessPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="bg-background border-4 border-green-500 shadow-2xl rounded-2xl p-8 text-center sm:max-w-sm data-[state=open]:animate-drop-in"
        hideCloseButton={true}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-muted-foreground">{message}</p>
            <Button onClick={onClose} className="mt-4 w-full h-11">
                ঠিক আছে
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
