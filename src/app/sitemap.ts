import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://ihntopup.shop';

    // Static pages
    const routes = [
        '',
        '/login',
        '/signup',
        '/topup',
        '/reseller',
        '/wallet',
        '/orders',
        '/apply-reseller',
        '/profile',
        '/about',
        '/privacy',
        '/terms',
        '/support',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date().toISOString(),
        changeFrequency: route === '' ? 'daily' as const : 'weekly' as const,
        priority: route === '' ? 1.0 : route.match(/\/(login|signup|topup|reseller)/) ? 0.8 : 0.5,
    }));

    // Note: In production, you should fetch dynamic topup cards from database
    // and add them here. For now, adding common ones:
    const topupProducts = [
        '/topup/free-fire',
        '/topup/pubg-mobile',
        '/topup/mobile-legends',
        '/topup/call-of-duty',
        '/topup/efootball',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
    }));

    return [...routes, ...topupProducts];
}
