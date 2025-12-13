'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Plus, Edit, Trash2, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { TopUpCardData, TopUpCardOption } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';

export default function AdminResellerCardsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const resellerCardsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'top_up_cards'), where('isResellerProduct', '==', true));
    }, [firestore]);

    const { data: resellerCards, isLoading } = useCollection<TopUpCardData>(resellerCardsQuery);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<TopUpCardData | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageHint, setImageHint] = useState('');
    const [categoryId, setCategoryId] = useState('reseller');
    const [serviceType, setServiceType] = useState<'Game' | 'Others' | 'eFootball'>('Others');
    const [gameUidFormat, setGameUidFormat] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [sortOrder, setSortOrder] = useState('0');
    const [cardType, setCardType] = useState<'normal' | 'unipin_only'>('normal');

    // Options state
    const [options, setOptions] = useState<TopUpCardOption[]>([]);
    const [newOptionName, setNewOptionName] = useState('');
    const [newOptionPrice, setNewOptionPrice] = useState('');
    const [newOptionStock, setNewOptionStock] = useState('');
    const [newOptionCodes, setNewOptionCodes] = useState(''); // Textarea for Unipin codes
    const [additionalCodesPerOption, setAdditionalCodesPerOption] = useState<Record<number, string>>({}); // For adding more codes to existing options

    const handleAddNew = () => {
        setEditingCard(null);
        resetForm();
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setName('');
        setDescription('');
        setPrice('');
        setImageUrl('');
        setImageHint('');
        setCategoryId('reseller');
        setServiceType('Others');
        setGameUidFormat('');
        setIsActive(true);
        setSortOrder('0');
        setCardType('normal');
        setOptions([]);
        setNewOptionCodes('');
    };

    const handleEdit = (card: TopUpCardData) => {
        setEditingCard(card);
        setName(card.name);
        setDescription(card.description);
        setPrice(card.price.toString());
        setImageUrl(card.image.src);
        setImageHint(card.image.hint || '');
        setCategoryId(card.categoryId);
        setServiceType(card.serviceType || 'Others');
        setGameUidFormat(card.gameUidFormat || '');
        setIsActive(card.isActive);
        setSortOrder(card.sortOrder?.toString() || '0');
        setCardType(card.cardType || 'normal');
        setOptions(card.options || []);
        setIsDialogOpen(true);
    };

    const handleAddOption = () => {
        if (!newOptionName || !newOptionPrice) {
            toast({ variant: 'destructive', title: 'Error', description: 'Option name and price are required' });
            return;
        }

        const newOption: TopUpCardOption = {
            name: newOptionName,
            price: parseFloat(newOptionPrice),
            stockLimit: newOptionStock ? parseInt(newOptionStock) : undefined
        };

        // If card type is unipin_only, process the codes
        if (cardType === 'unipin_only') {
            if (!newOptionCodes || newOptionCodes.trim() === '') {
                toast({ variant: 'destructive', title: 'Error', description: 'Unipin codes are required for Unipin Only cards' });
                return;
            }

            // Parse codes from textarea (one code per line)
            const codesArray = newOptionCodes.split('\n')
                .map(code => code.trim())
                .filter(code => code.length > 0)
                .map(code => ({
                    code,
                    isUsed: false
                }));

            if (codesArray.length === 0) {
                toast({ variant: 'destructive', title: 'Error', description: 'Please enter at least one valid Unipin code' });
                return;
            }

            newOption.unipinCodes = codesArray;
            newOption.availableCodeCount = codesArray.length;
            newOption.stockLimit = codesArray.length; // Stock limit = number of codes
        }

        setOptions([...options, newOption]);
        setNewOptionName('');
        setNewOptionPrice('');
        setNewOptionStock('');
        setNewOptionCodes('');
    };

    const handleRemoveOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleAddMoreCodesToOption = (index: number) => {
        const additionalCodesText = additionalCodesPerOption[index];

        if (!additionalCodesText || additionalCodesText.trim() === '') {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter codes to add' });
            return;
        }

        // Parse new codes
        const newCodes = additionalCodesText.split('\n')
            .map(code => code.trim())
            .filter(code => code.length > 0)
            .map(code => ({
                code,
                isUsed: false
            }));

        if (newCodes.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'No valid codes found' });
            return;
        }

        // Update the option by appending new codes
        const updatedOptions = [...options];
        const targetOption = updatedOptions[index];

        if (targetOption.unipinCodes) {
            targetOption.unipinCodes = [...targetOption.unipinCodes, ...newCodes];
            targetOption.availableCodeCount = (targetOption.availableCodeCount || 0) + newCodes.length;
            targetOption.stockLimit = (targetOption.stockLimit || 0) + newCodes.length;
        }

        setOptions(updatedOptions);

        // Clear the input for this option
        setAdditionalCodesPerOption(prev => {
            const updated = { ...prev };
            delete updated[index];
            return updated;
        });

        toast({
            title: 'Success!',
            description: `Added ${newCodes.length} new codes to ${targetOption.name}`
        });
    };

    const handleSave = async () => {
        if (!firestore || !name || !price) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all required fields' });
            return;
        }

        setIsSaving(true);

        const cardData: any = {
            name,
            description,
            price: parseFloat(price),
            image: {
                src: imageUrl || 'https://via.placeholder.com/150',
                hint: imageHint || name
            },
            categoryId,
            isActive,
            isResellerProduct: true,
            cardType, // Add card type
            serviceType,
            sortOrder: parseInt(sortOrder) || 0
        };

        if (gameUidFormat) {
            cardData.gameUidFormat = gameUidFormat;
        }

        if (options.length > 0) {
            // Deep clean options to remove undefined values
            cardData.options = options.map(option => {
                const cleanOption: any = {
                    name: option.name,
                    price: option.price
                };

                // Only add optional fields if they have values
                if (option.inStock !== undefined) cleanOption.inStock = option.inStock;
                if (option.stockLimit !== undefined) cleanOption.stockLimit = option.stockLimit;
                if (option.stockSoldCount !== undefined) cleanOption.stockSoldCount = option.stockSoldCount;
                if (option.unipinCodes && option.unipinCodes.length > 0) {
                    cleanOption.unipinCodes = option.unipinCodes;
                }
                if (option.availableCodeCount !== undefined) cleanOption.availableCodeCount = option.availableCodeCount;

                return cleanOption;
            });
        }

        // Filter out undefined values to prevent Firestore error
        const cleanedData = Object.fromEntries(
            Object.entries(cardData).filter(([_, value]) => value !== undefined)
        );

        try {
            if (editingCard) {
                await updateDoc(doc(firestore, 'top_up_cards', editingCard.id), cleanedData);
                toast({ title: 'Success', description: 'Reseller product updated successfully' });
            } else {
                await addDoc(collection(firestore, 'top_up_cards'), cleanedData);
                toast({ title: 'Success', description: 'Reseller product added successfully' });
            }
            setIsDialogOpen(false);
            resetForm();
        } catch (error) {
            console.error('Error saving card:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save product' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (cardId: string) => {
        if (!firestore || !confirm('Are you sure you want to delete this product?')) return;

        try {
            await deleteDoc(doc(firestore, 'top_up_cards', cardId));
            toast({ title: 'Success', description: 'Product deleted successfully' });
        } catch (error) {
            console.error('Error deleting card:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete product' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Package className="h-8 w-8" />
                        Reseller Products
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage products exclusively for resellers</p>
                </div>
                <Button onClick={handleAddNew} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Reseller Product
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resellerCards?.map((card) => (
                    <Card key={card.id} className="relative">
                        <CardHeader>
                            <div className="aspect-square relative bg-gradient-to-br from-primary/5 to-primary/10 rounded-md mb-3">
                                <Image
                                    src={card.image.src}
                                    alt={card.image.hint || card.name}
                                    fill
                                    className="object-contain p-3"
                                    unoptimized
                                />
                            </div>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-lg">{card.name}</CardTitle>
                                    <CardDescription className="mt-1 line-clamp-2">{card.description}</CardDescription>
                                </div>
                                <Badge variant={card.isActive ? 'default' : 'secondary'}>
                                    {card.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Price:</span>
                                    <span className="font-bold text-lg text-primary">৳{card.price}</span>
                                </div>
                                {card.options && card.options.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                        {card.options.length} option(s) available
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(card)} className="flex-1">
                                        <Edit className="h-4 w-4 mr-1" />
                                        Edit
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(card.id)} className="flex-1">
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {(!resellerCards || resellerCards.length === 0) && (
                    <div className="col-span-full text-center py-12">
                        <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No reseller products yet. Add one to get started!</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingCard ? 'Edit' : 'Add'} Reseller Product</DialogTitle>
                        <DialogDescription>
                            Products added here will only be visible to resellers
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name">Product Name *</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Premium Package"
                                />
                            </div>
                            <div>
                                <Label htmlFor="price">Base Price (৳) *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Product description"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="imageUrl">Image URL</Label>
                                <Input
                                    id="imageUrl"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <Label htmlFor="imageHint">Image Alt Text</Label>
                                <Input
                                    id="imageHint"
                                    value={imageHint}
                                    onChange={(e) => setImageHint(e.target.value)}
                                    placeholder="Alt text for image"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <Label htmlFor="serviceType">Service Type</Label>
                                <Select value={serviceType} onValueChange={(v: any) => setServiceType(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Game">Game</SelectItem>
                                        <SelectItem value="eFootball">eFootball</SelectItem>
                                        <SelectItem value="Others">Others</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="sortOrder">Sort Order</Label>
                                <Input
                                    id="sortOrder"
                                    type="number"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <Label htmlFor="status">Status</Label>
                                <Select value={isActive ? 'active' : 'inactive'} onValueChange={(v) => setIsActive(v === 'active')}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="cardType">Card Type</Label>
                                <Select value={cardType} onValueChange={(v: any) => setCardType(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normal">Normal Card</SelectItem>
                                        <SelectItem value="unipin_only">Unipin Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {serviceType === 'Game' && (
                            <div>
                                <Label htmlFor="gameUidFormat">Game UID Format</Label>
                                <Input
                                    id="gameUidFormat"
                                    value={gameUidFormat}
                                    onChange={(e) => setGameUidFormat(e.target.value)}
                                    placeholder="e.g., Player ID, User ID"
                                />
                            </div>
                        )}

                        {/* Options Section */}
                        <div className="border-t pt-4">
                            <Label className="text-base font-semibold mb-2 block">
                                Product Options {cardType === 'unipin_only' && '(Unipin Codes Required)'}
                            </Label>

                            {options.length > 0 && (
                                <div className="space-y-3 mb-4">
                                    {options.map((option, index) => (
                                        <div key={index} className="border border-muted rounded-lg overflow-hidden">
                                            <div className="flex items-center justify-between p-3 bg-muted">
                                                <div>
                                                    <p className="font-medium">{option.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        ৳{option.price}
                                                        {cardType === 'unipin_only' && option.availableCodeCount !== undefined &&
                                                            ` • ${option.availableCodeCount} codes available`}
                                                        {cardType === 'normal' && option.stockLimit && ` • Stock: ${option.stockLimit}`}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveOption(index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {/* Add More Codes section for Unipin Only cards */}
                                            {cardType === 'unipin_only' && option.unipinCodes && (
                                                <div className="p-3 bg-green-50 border-t border-green-200">
                                                    <Label className="text-xs font-semibold text-green-700 mb-1 block">
                                                        Add More Codes to this package
                                                    </Label>
                                                    <Textarea
                                                        placeholder="Enter additional codes (one per line)"
                                                        value={additionalCodesPerOption[index] || ''}
                                                        onChange={(e) => setAdditionalCodesPerOption(prev => ({
                                                            ...prev,
                                                            [index]: e.target.value
                                                        }))}
                                                        rows={3}
                                                        className="font-mono text-xs mb-2"
                                                    />
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs text-muted-foreground">
                                                            {(additionalCodesPerOption[index] || '').split('\n').filter(c => c.trim()).length} new codes
                                                        </p>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => handleAddMoreCodesToOption(index)}
                                                            className="h-8"
                                                        >
                                                            <Plus className="h-3 w-3 mr-1" />
                                                            Add Codes
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="Option name"
                                        value={newOptionName}
                                        onChange={(e) => setNewOptionName(e.target.value)}
                                    />
                                    <Input
                                        placeholder="Price"
                                        type="number"
                                        value={newOptionPrice}
                                        onChange={(e) => setNewOptionPrice(e.target.value)}
                                    />
                                </div>

                                {cardType === 'normal' && (
                                    <Input
                                        placeholder="Stock (optional)"
                                        type="number"
                                        value={newOptionStock}
                                        onChange={(e) => setNewOptionStock(e.target.value)}
                                    />
                                )}

                                {cardType === 'unipin_only' && (
                                    <div>
                                        <Label htmlFor="unipinCodes" className="text-sm mb-1">
                                            Unipin Codes (One code per line)
                                        </Label>
                                        <Textarea
                                            id="unipinCodes"
                                            placeholder="Enter Unipin codes, one per line&#10;Example:&#10;XXXX-XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY-YYYY"
                                            value={newOptionCodes}
                                            onChange={(e) => setNewOptionCodes(e.target.value)}
                                            rows={5}
                                            className="font-mono text-sm"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {newOptionCodes.split('\n').filter(c => c.trim()).length} codes entered
                                        </p>
                                    </div>
                                )}
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddOption}
                                className="mt-2 w-full"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Option
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {editingCard ? 'Update' : 'Add'} Product
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
