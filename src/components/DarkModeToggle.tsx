'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';

export function DarkModeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-white shadow-md"
            >
                <Sun className="h-5 w-5" />
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9 rounded-full bg-white dark:bg-gray-800 shadow-md transition-all duration-300 hover:scale-110"
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-yellow-500 transition-all duration-300" />
            ) : (
                <Moon className="h-5 w-5 text-gray-700 transition-all duration-300" />
            )}
        </Button>
    );
}
