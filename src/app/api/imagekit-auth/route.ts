import ImagekitCore from 'imagekit';

const imagekit = new ImagekitCore({
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '',
});

export async function GET() {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    return Response.json(authenticationParameters);
}
