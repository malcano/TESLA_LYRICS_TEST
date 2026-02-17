export async function onRequest(context) {
    const url = new URL(context.request.url);
    const artist = url.searchParams.get('artist');
    const track = url.searchParams.get('track');
    const durationParam = url.searchParams.get('duration');
    const duration = durationParam ? parseFloat(durationParam) : null;

    if (!artist || !track) {
        return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
    }

    // Normalize
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nArtist = normalize(artist);
    const nTrack = normalize(track);

    // Hardcoded Fallbacks (Fast & Reliable)
    if (nArtist.includes('iu') && (nTrack.includes('youi') || nTrack.includes('youandi') || decodeURIComponent(track).includes('너랑 나'))) {
        const lyrics = [
            "시곌 보며 속삭이는 비밀들", "간절한 내 맘속 이야기", "지금 내 모습을 해쳐도 좋아", "나를 재촉하면 할수록 좋아", "내 이름 불러줘",
            "손 틈새로 비치는 내 맘 들킬까 두려워", "가슴이 막 벅차 서러워", "조금만 꼭 참고 날 기다려줘", "너랑 나랑은 지금 안되지",
            "시계를 더 보채고 싶지만", "네가 있던 미래에서 내 이름을 불러줘", "내가 먼저 엿보고 온 시간들", "너와 내가 함께였었지",
            "나랑 놀아주는 그대가 좋아", "내가 물어보면 그대도 좋아", "내 이름이 뭐야", "손 틈새로 비치는 내 맘 들킬까 두려워",
            "가슴이 막 벅차 서러워", "조금만 꼭 참고 날 기다려줘", "너랑 나랑은 지금 안되지", "시계를 더 보채고 싶지만",
            "네가 있던 미래에서 내 이름을 불러줘", "눈 깜박하면 어른이 될 거에요", "날 알아보겠죠 그댄 기억하겠죠", "그래 기묘했던 아이",
            "손 틈새로 비치는 네 모습 참 좋다", "손끝으로 돌리며 시곗바늘아 달려봐", "조금만 더 빨리 날아봐", "두 눈을 꼭 감고 마법을 건다",
            "너랑 나랑은 조금 남았지", "몇 날 몇실진 모르겠지만", "네가 있을 미래에서 혹시 내가 헤맨다면", "너를 알아볼 수 있게 내 이름을 불러줘"
        ];
        return jsonResponse({ lines: lyrics, source: "Manual Override (IU)" });
    }

    // Unified Strategy: Race "Exact Match" against "Duration-based Searches"
    // This ensures we get the fastest possible result without waiting for sequential failures.
    const searchPromises = [];

    // Helper to wrap trySearchAndMatch so it rejects on null (required for Promise.any)
    const search = (q, d, src) => trySearchAndMatch(q, d, src).then(res => res ? res : Promise.reject('No match'));

    // Strategy 1: Strict Match (Artist + Track)
    // Wrapped in a promise to be compatible with Promise.any
    searchPromises.push(new Promise(async (resolve, reject) => {
        try {
            const lrclibUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
            const lrcResponse = await fetch(lrclibUrl);
            if (lrcResponse.ok) {
                const data = await lrcResponse.json();
                const lines = parseLrclibData(data);
                if (lines) resolve(jsonResponse({ lines, source: "Lrclib (Exact Match)" }));
            }
            reject('No exact match');
        } catch (e) { reject(e); }
    }));

    if (duration) {
        // Strategy 2: Search by Artist -> Duration Match
        searchPromises.push(search(artist, duration, "Lrclib (Artist Search)"));

        // Strategy 3: Search by Track Name -> Duration Match
        searchPromises.push(search(track, duration, "Lrclib (Track Search)"));

        // Strategy 4: Split Title Search -> Duration Match
        const parts = track.split(/ - | \(|\[/).filter(p => p.trim().length > 1);
        if (parts.length > 1) {
            for (const part of parts) {
                const cleanPart = part.replace(/[)\]]/g, '').trim();
                searchPromises.push(search(cleanPart, duration, `Lrclib (Split: "${cleanPart}")`));
            }
        }
    }

    // Execute ALL strategies in parallel and take the first success
    try {
        const result = await Promise.any(searchPromises);
        return result;
    } catch (e) {
        // All Lrclib strategies failed, proceed to Genius fallback
    }

    // Strategy 5: Fallback Scraping (Genius)
    try {
        const geniusUrl = await searchGenius(artist, track);
        if (geniusUrl) {
            const lines = await fetchGeniusLyrics(geniusUrl);
            if (lines && lines.length > 0) {
                return jsonResponse({ lines, source: "Genius (Scraper)" });
            }
        }
    } catch (e) {
        console.error("Scraping error:", e);
    }

    // Final Fallback
    return jsonResponse({
        lines: ["Lyrics not found.", "Please check song title."],
        source: "None"
    });
}

function jsonResponse(data) {
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}

function parseLrclibData(data) {
    const lyricsText = data.plainLyrics || data.syncedLyrics;
    if (!lyricsText) return null;
    const lines = lyricsText.split('\n')
        .map(line => line.replace(/^\[.*?\]/, '').trim())
        .filter(line => line.length > 0);
    return lines.length > 0 ? lines : null;
}

// Helper: Search Lrclib and find duration match
async function trySearchAndMatch(query, targetDuration, sourceName) {
    try {
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
        const searchRes = await fetch(searchUrl);
        if (searchRes.ok) {
            const results = await searchRes.json();
            if (Array.isArray(results)) {
                // Find a track with matching duration (+/- 3 seconds tolerance)
                // Increased tolerance slightly for reliability
                const match = results.find(item => Math.abs(item.duration - targetDuration) < 3);
                if (match) {
                    const lines = parseLrclibData(match);
                    if (lines) return jsonResponse({ lines, source: sourceName });
                }
            }
        }
    } catch (e) { /* Ignore */ }
    return null;
}

async function searchGenius(artist, track) {
    try {
        const query = `site:genius.com ${artist} ${track} lyrics`;
        const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;

        const response = await fetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
        });

        if (!response.ok) return null;
        const html = await response.text();
        const match = html.match(/class="result-link" href="(https:\/\/genius\.com\/[^"]+)"/);
        if (match && match[1]) return match[1];
        return null;
    } catch (e) {
        return null;
    }
}

async function fetchGeniusLyrics(url) {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
        });
        if (!response.ok) return null;
        const html = await response.text();
        const containerRegex = /<div[^>]*data-lyrics-container="true"[^>]*>(.*?)<\/div>/g;
        let match;
        let rawHtml = "";
        while ((match = containerRegex.exec(html)) !== null) {
            if (match[1]) rawHtml += match[1] + "\n";
        }
        if (!rawHtml) return null;

        let text = rawHtml
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?[^>]+(>|$)/g, "")
            .replace(/&#x([0-9A-F]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

        return text.split('\n').map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith('['));
    } catch (e) {
        return null;
    }
}
