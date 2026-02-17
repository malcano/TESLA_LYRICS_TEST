export async function onRequest(context) {
    const url = new URL(context.request.url);
    const refresh_token = url.searchParams.get('refresh_token');

    if (!refresh_token) {
        return new Response("Missing refresh_token", { status: 400 });
    }

    const client_id = context.env.SPOTIFY_CLIENT_ID;
    const client_secret = context.env.SPOTIFY_CLIENT_SECRET;

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refresh_token);

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + (btoa(client_id + ':' + client_secret)),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });

    if (!tokenResponse.ok) {
        return new Response("Failed to refresh token", { status: 400 });
    }

    const data = await tokenResponse.json();
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
    });
}
