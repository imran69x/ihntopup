import ImagekitCore from 'imagekit';
import { NextResponse } from 'next/server';

export async function GET() {
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

    if (!publicKey || !privateKey || !urlEndpoint) {
        return NextResponse.json({ error: 'ImageKit credentials are missing' }, { status: 500 });
    }

    const imagekit = new ImagekitCore({ publicKey, privateKey, urlEndpoint });
    const authenticationParameters = imagekit.getAuthenticationParameters();
    return NextResponse.json(authenticationParameters);
}
