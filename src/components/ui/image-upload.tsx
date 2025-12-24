'use client';

import * as React from 'react';
import { Upload, X, Loader2, Link as LinkIcon } from 'lucide-react';
import { IKUpload } from 'imagekitio-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { imagekitConfig } from '@/lib/imagekit';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    label?: string;
    placeholder?: string;
    required?: boolean;
}

export function ImageUpload({
    value = '',
    onChange,
    label = 'ছবি',
    placeholder = 'https://example.com/image.png',
    required = false,
}: ImageUploadProps) {
    const [uploadMode, setUploadMode] = React.useState<'upload' | 'url'>('upload');
    const [isUploading, setIsUploading] = React.useState(false);
    const [urlInput, setUrlInput] = React.useState(value);
    const uploadRef = React.useRef<any>(null);
    const { toast } = useToast();

    const onError = (err: any) => {
        console.error('Upload error:', err);
        console.error('Error details:', JSON.stringify(err, null, 2));
        console.error('ImageKit config:', {
            publicKey: imagekitConfig.publicKey?.substring(0, 20) + '...',
            urlEndpoint: imagekitConfig.urlEndpoint,
            hasAuthenticator: !!imagekitConfig.authenticator
        });

        setIsUploading(false);

        let errorMessage = 'ছবি আপলোড করা যায়নি। আবার চেষ্টা করুন।';

        if (err?.message) {
            errorMessage = err.message;
        } else if (typeof err === 'string') {
            errorMessage = err;
        } else if (err?.error) {
            errorMessage = err.error;
        }

        toast({
            variant: 'destructive',
            title: 'আপলোড ব্যর্থ',
            description: errorMessage,
        });
    };

    const onSuccess = (res: any) => {
        setIsUploading(false);
        if (res?.url) {
            onChange(res.url);
            toast({
                title: 'সফল',
                description: 'ছবি সফলভাবে আপলোড হয়েছে।',
            });
        }
    };

    const onUploadStart = () => {
        setIsUploading(true);
    };

    const handleRemove = () => {
        onChange('');
        setUrlInput('');
    };

    const handleUrlSubmit = () => {
        if (urlInput.trim()) {
            onChange(urlInput.trim());
            toast({
                title: 'সফল',
                description: 'ছবির URL যোগ করা হয়েছে।',
            });
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label>
                    {label} {required && <span className="text-red-500">*</span>}
                </Label>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant={uploadMode === 'upload' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUploadMode('upload')}
                    >
                        <Upload className="h-3 w-3 mr-1" />
                        আপলোড
                    </Button>
                    <Button
                        type="button"
                        variant={uploadMode === 'url' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUploadMode('url')}
                    >
                        <LinkIcon className="h-3 w-3 mr-1" />
                        URL
                    </Button>
                </div>
            </div>

            {uploadMode === 'upload' ? (
                <div className="space-y-2">
                    {!value ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                            <IKUpload
                                ref={uploadRef}
                                {...imagekitConfig}
                                onError={onError}
                                onSuccess={onSuccess}
                                onUploadStart={onUploadStart}
                                className="hidden"
                                accept="image/*"
                                fileName="upload.jpg"
                                useUniqueFileName={true}
                                folder="/admin-uploads"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => uploadRef.current?.click()}
                                disabled={isUploading}
                                className="w-full"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        আপলোড হচ্ছে...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        ছবি নির্বাচন করুন
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-gray-500 mt-2">
                                JPG, PNG, GIF, WebP (সর্বোচ্চ 10MB)
                            </p>
                        </div>
                    ) : (
                        <div className="relative border rounded-lg p-2">
                            <div className="relative h-32 w-full">
                                <Image
                                    src={value}
                                    alt="Preview"
                                    fill
                                    className="object-contain rounded"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleRemove}
                                className="absolute top-2 right-2"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <Input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder={placeholder}
                            className="flex-1"
                        />
                        <Button type="button" onClick={handleUrlSubmit} size="sm">
                            যোগ করুন
                        </Button>
                    </div>
                    {value && (
                        <div className="relative border rounded-lg p-2">
                            <div className="relative h-32 w-full">
                                <Image
                                    src={value}
                                    alt="Preview"
                                    fill
                                    className="object-contain rounded"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleRemove}
                                className="absolute top-2 right-2"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
