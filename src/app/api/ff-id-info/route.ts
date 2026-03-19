import { NextResponse } from 'next/server';
import { getNextApiKey } from '@/lib/ff-api-key-manager';

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

        // External API URL
        const externalApiUrl = `https://api.gameskinbo.com/ff-info/get?uid=${playerid.trim()}&region=BD`;

        console.log('🔍 Calling FF Info API:', externalApiUrl);

        // Get next available API key from the rotation manager
        const apiKey = await getNextApiKey();

        const response = await fetch(externalApiUrl, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey,
                'Accept': 'application/json',
            },
        });

        console.log('📡 FF Info API response status:', response.status, response.statusText);

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
            console.log('📦 FF Info API response data:', JSON.stringify(data));
        } catch (e) {
            console.error('❌ FF Info API returned non-JSON response:', responseText.substring(0, 200));
            return NextResponse.json(
                {
                    success: false,
                    error: `External API Error: Received invalid response format (Status ${response.status})`,
                },
                { status: 502 }
            );
        }

        // Success
        if (response.ok && data?.AccountInfo) {
            return NextResponse.json({
                success: true,
                data: data,
            });
        }

        // Error
        console.error('❌ FF Info API error:', data);
        return NextResponse.json(
            {
                success: false,
                error: data?.error || 'অবৈধ প্লেয়ার আইডি',
            },
            { status: response.status === 200 ? 404 : response.status }
        );

    } catch (error) {
        console.error('FF ID info API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
            },
            { status: 500 }
        );
    }
}
