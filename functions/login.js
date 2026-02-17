export async function onRequest(context) {
    const client_id = context.env.SPOTIFY_CLIENT_ID;
    const redirect_uri = context.env.SPOTIFY_REDIRECT_URI; // https://tesla-lyrics-test.pages.dev/api/callback or similar

    // Cloudflare Pages specific: The redirect URI in Spotify Dashboard must match exactly.
    // We'll use /callback as the path.

    const state = generateRandomString(16);
    const scope = 'user-read-private user-read-email user-read-playback-state user-read-currently-playing';

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
    });

    return Response.redirect('https://accounts.spotify.com/authorize?' + params.toString());
}

function generateRandomString(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
