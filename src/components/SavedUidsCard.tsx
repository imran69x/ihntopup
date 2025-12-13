'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SavedUid } from "@/lib/data";
import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Label } from "./ui/label";

interface SavedUidsCardProps {
    savedUids: SavedUid[];
    onUidsChange: (uids: SavedUid[]) => void;
}

export default function SavedUidsCard({ savedUids, onUidsChange }: SavedUidsCardProps) {
    const [uids, setUids] = useState<SavedUid[]>(savedUids);
    const [newGame, setNewGame] = useState('');
    const [newUid, setNewUid] = useState('');

    useEffect(() => {
        setUids(savedUids);
    }, [savedUids]);

    const handleAddUid = () => {
        if (newGame && newUid) {
            const newUids = [...uids, { game: newGame, uid: newUid }];
            setUids(newUids);
            onUidsChange(newUids);
            setNewGame('');
            setNewUid('');
        }
    };

    const handleRemoveUid = (index: number) => {
        const newUids = uids.filter((_, i) => i !== index);
        setUids(newUids);
        onUidsChange(newUids);
    };
    
    return (
        <div className="pt-2">
            <CardDescription className="mb-4 text-center">দ্রুত চেকআউটের জন্য আপনার প্রায়শই ব্যবহৃত গেম আইডিগুলো ম্যানেজ করুন।</CardDescription>
            <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                {uids.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-muted border">
                        <div className="flex-grow">
                            <p className="font-semibold">{item.game}</p>
                            <p className="text-sm text-muted-foreground font-mono">{item.uid}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveUid(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
                {uids.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-4">এখনো কোনো আইডি সেভ করা হয়নি।</p>
                )}
            </div>
             <div className="mt-4 pt-4 border-t space-y-4">
                <p className="font-medium text-center">নতুন আইডি যোগ করুন</p>
                <div className="space-y-2">
                    <Label htmlFor="new-game-name">গেমের নাম</Label>
                    <Input id="new-game-name" placeholder="যেমনঃ ফ্রি ফায়ার" value={newGame} onChange={(e) => setNewGame(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="new-game-uid">গেম আইডি</Label>
                    <Input id="new-game-uid" placeholder="গেম আইডি লিখুন" value={newUid} onChange={(e) => setNewUid(e.target.value)} />
                </div>
                <Button onClick={handleAddUid} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    আইডি যোগ করুন
                </Button>
            </div>
        </div>
    );
}
