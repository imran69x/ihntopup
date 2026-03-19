import { NextResponse } from 'next/server';
import { getNextApiKey } from '@/lib/ff-api-key-manager';

export const runtime = 'edge';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { playerid } = body;

        // Validate playerid
        if (!playerid || typeof playerid !== 'string' || playerid.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'প্লেয়ার আইডি প্রয়োজন' },
                { status: 400 }
            );
        }

        // Get next available API key
        let apiKey: string;
        try {
            apiKey = await getNextApiKey();
            console.log('✅ Got API key:', apiKey ? 'present' : 'MISSING');
        } catch (keyError: any) {
            console.error('❌ API key error:', keyError.message);
            return NextResponse.json(
                { success: false, error: `API Key Error: ${keyError.message}` },
                { status: 500 }
            );
        }

        // External API URL
        const externalApiUrl = `https://api.gameskinbo.com/ff-info/get?uid=${playerid.trim()}&region=BD`;
        console.log('🔍 Calling external API:', externalApiUrl);

        const response = await fetch(externalApiUrl, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey,
                'Accept': 'application/json, text/plain, */*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://ihntopup.shop/',
                'Origin': 'https://ihntopup.shop',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });

        console.log('📡 External API response status:', response.status, response.statusText);

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
            console.log('📦 External API response data:', JSON.stringify(data));
        } catch (e) {
            console.error('❌ External API returned non-JSON response:', responseText.substring(0, 200));
            return NextResponse.json(
                {
                    success: false,
                    error: `External API Error: Received invalid response format (Status ${response.status})`,
                },
                { status: 502 }
            );
        }

        // Success
        if (response.ok && data?.AccountInfo?.AccountName) {
            return NextResponse.json({
                success: true,
                username: data.AccountInfo.AccountName,
            });
        }

        // Error from external API
        console.error('❌ External API error:', data);
        return NextResponse.json(
            {
                success: false,
                error: data?.error || data?.message || `External API error (status: ${response.status})`,
            },
            { status: response.status === 200 ? 404 : response.status }
        );

    } catch (error: any) {
        console.error('Game ID checker API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Server error: ${error.message}`,
            },
            { status: 500 }
        );
    }
}