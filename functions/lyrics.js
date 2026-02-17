export async function onRequest(context) {
    const url = new URL(context.request.url);
    const artist = url.searchParams.get('artist');
    const track = url.searchParams.get('track');

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
        return new Response(JSON.stringify({ lines: lyrics }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Real Scraping via Search
    try {
        const geniusUrl = await searchGenius(artist, track);
        if (geniusUrl) {
            const lines = await fetchGeniusLyrics(geniusUrl);
            if (lines && lines.length > 0) {
                return new Response(JSON.stringify({ lines }), { headers: { 'Content-Type': 'application/json' } });
            }
        }
    } catch (e) {
        console.error("Scraping error:", e);
    }

    // Final Fallback
    return new Response(JSON.stringify({
        lines: ["Lyrics not found.", "Please check song title."]
    }), { headers: { 'Content-Type': 'application/json' } });
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

        // Simple regex to find the first Genius link
        // <a href="https://genius.com/..." class="result-link">
        const match = html.match(/class="result-link" href="(https:\/\/genius\.com\/[^"]+)"/);
        if (match && match[1]) {
            return match[1];
        }
        return null;
    } catch (e) {
        console.error("Search error:", e);
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

        // Extract lyrics containers
        // <div data-lyrics-container="true" ...>LYRICS HTML</div>
        // We might have multiple containers.
        const containerRegex = /<div[^>]*data-lyrics-container="true"[^>]*>(.*?)<\/div>/g;
        let match;
        let rawHtml = "";

        while ((match = containerRegex.exec(html)) !== null) {
            if (match[1]) {
                rawHtml += match[1] + "\n";
            }
        }

        if (!rawHtml) return null;

        // Convert to text
        let text = rawHtml
            .replace(/<br\s*\/?>/gi, '\n') // Handled line breaks
            .replace(/<\/?[^>]+(>|$)/g, "") // Strip tags
            .replace(/&#x([0-9A-F]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16))) // Decode hex entities
            .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec)) // Decode decimal entities
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

        // Split into lines and clean up
        return text.split('\n').map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith('[')); // Filter empty lines and section headers like [Chorus]
    } catch (e) {
        console.error("Fetch lyrics error:", e);
        return null;
    }
}
