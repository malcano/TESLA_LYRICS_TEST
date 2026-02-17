export async function onRequest(context) {
    const url = new URL(context.request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (state === null || code === null) {
        return new Response("State mismatch or missing code", { status: 400 });
    }

    const client_id = context.env.spotify_client_id;
    const client_secret = context.env.spotify_client_secret;
    const redirect_uri = 'https://tesla-lyrics-test.pages.dev/api/callback';

    const params = new URLSearchParams();
    params.append('code', code);
    params.append('redirect_uri', redirect_uri);
    params.append('grant_type', 'authorization_code');

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + (btoa(client_id + ':' + client_secret)),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });

    if (!tokenResponse.ok) {
        const err = await tokenResponse.text();
        return new Response("Failed to fetch token: " + err, { status: 400 });
    }

    const data = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = data;

    // Redirect to the home page with tokens in query params (or handle securely)
    // Matching existing logic: redirect to /?access_token=...
    const dest = new URL(url.origin);
    dest.pathname = '/';
    dest.searchParams.set('access_token', access_token);
    dest.searchParams.set('refresh_token', refresh_token);
    dest.searchParams.set('expires_in', expires_in);

    return Response.redirect(dest.toString());
}
