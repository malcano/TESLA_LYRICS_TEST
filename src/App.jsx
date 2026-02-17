import { useState, useEffect } from 'react';
import useAuth from './hooks/useAuth';
import PlayerLayout from './components/PlayerLayout';
import axios from 'axios';
import './App.css';

function App() {
  const accessToken = useAuth();
  const [playingTrack, setPlayingTrack] = useState(null);
  const [lyrics, setLyrics] = useState([]);
  const [lyricsFound, setLyricsFound] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const handleDemoStart = () => {
    setIsDemo(true);
  };

  useEffect(() => {
    if (!accessToken && !isDemo) return;

    const fetchPlaybackState = () => {
      if (isDemo) {
        const demoTrack = {
          id: "demo-iu",
          artist: "IU",
          name: "You & I",
          // Official Album Art for Last Fantasy
          albumArt: "https://i.scdn.co/image/ab67616d0000b2730cf19d7501a4e58b429d592b"
        };

        if (!playingTrack || playingTrack.id !== demoTrack.id) {
          setPlayingTrack(demoTrack);
          // Client-side lyrics for Demo Mode (Serverless support)
          // Hardcoded lyrics for "IU - You & I" to ensure it works on Cloudflare Pages
          setLyrics([
            "시곌 보며 속삭이는 비밀들",
            "간절한 내 맘속 이야기",
            "지금 내 모습을 해쳐도 좋아",
            "나를 재촉하면 할수록 좋아",
            "내 이름 불러줘",
            "손 틈새로 비치는 내 맘 들킬까 두려워",
            "가슴이 막 벅차 서러워",
            "조금만 꼭 참고 날 기다려줘",
            "너랑 나랑은 지금 안되지",
            "시계를 더 보채고 싶지만",
            "네가 있던 미래에서 내 이름을 불러줘",
            "내가 먼저 엿보고 온 시간들",
            "너와 내가 함께였었지",
            "나랑 놀아주는 그대가 좋아",
            "내가 물어보면 그대도 좋아",
            "내 이름이 뭐야",
            "손 틈새로 비치는 내 맘 들킬까 두려워",
            "가슴이 막 벅차 서러워",
            "조금만 꼭 참고 날 기다려줘",
            "너랑 나랑은 지금 안되지",
            "시계를 더 보채고 싶지만",
            "네가 있던 미래에서 내 이름을 불러줘",
            "눈 깜박하면 어른이 될 거에요",
            "날 알아보겠죠 그댄 기억하겠죠",
            "그래 기묘했던 아이",
            "손 틈새로 비치는 네 모습 참 좋다",
            "손끝으로 돌리며 시곗바늘아 달려봐",
            "조금만 더 빨리 날아봐",
            "두 눈을 꼭 감고 마법을 건다",
            "너랑 나랑은 조금 남았지",
            "몇 날 몇실진 모르겠지만",
            "네가 있을 미래에서 혹시 내가 헤맨다면",
            "너를 알아볼 수 있게 내 이름을 불러줘"
          ]);
          setLyricsFound(true);
        }
        return;
      }

      axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }).then(res => {
        // Spotify returns 204 No Content if nothing is playing
        if (res.status === 204 || !res.data) {
          return;
        }

        const data = res.data;
        if (data && data.item) {
          const track = data.item;
          const artist = track.artists[0].name;
          const trackName = track.name;
          // Get the largest image
          const albumArt = track.album.images[0].url;

          // Only update and fetch lyrics if track changed
          if (!playingTrack || playingTrack.id !== track.id) {
            setPlayingTrack({
              id: track.id,
              artist,
              name: trackName,
              albumArt
            });

            // Clear previous lyrics immediately
            setLyrics(["Lyrics loading..."]);
            setLyricsFound(false);

            // Fetch Lyrics from our backend (Cloudflare Function)
            axios.get('/lyrics', {
              params: {
                track: trackName,
                artist: artist,
                duration: track.duration_ms / 1000
              }
            }).then(res => {
              setLyrics(res.data.lines);
              setLyricsFound(true);
            }).catch(err => {
              console.error(err);
              setLyrics(["Error fetching lyrics"]);
              setLyricsFound(false);
            });
          }
        }
      }).catch(err => console.error("Error fetching playback state", err));

    };

    fetchPlaybackState();
    const interval = setInterval(fetchPlaybackState, 5000);

    return () => clearInterval(interval);
  }, [accessToken, playingTrack, isDemo]);

  // Manual Refresh Handler
  const handleManualRefresh = () => {
    if (isDemo) return;
    if (!accessToken) return;

    axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }).then(res => {
      if (res.status === 204 || !res.data) return;
      const data = res.data;
      if (data && data.item) {
        const track = data.item;
        const artist = track.artists[0].name;
        const trackName = track.name;
        const albumArt = track.album.images[0].url;

        setPlayingTrack({ id: track.id, artist, name: trackName, albumArt });

        // Clear previous lyrics immediately
        setLyrics(["Lyrics loading..."]);
        setLyricsFound(false);

        axios.get('/lyrics', {
          params: {
            track: trackName,
            artist: artist,
            duration: track.duration_ms / 1000
          }
        }).then(res => {
          setLyrics(res.data.lines);
          setLyricsFound(true);
        }).catch(err => {
          console.error(err);
          setLyrics(["Error fetching lyrics"]);
          setLyricsFound(false);
        });
      }
    }).catch(err => {
      console.error("Error fetching playback:", err);
      if (err.response && err.response.status === 401) {
        // Token expired and not refreshed? Logout.
        console.log("Access token expired/invalid. Logging out.");
        localStorage.clear();
        window.location = "/";
      }
    });
  };

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 overflow-hidden font-sans">

      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black to-green-900/40 animate-pulse-slow"></div>
        {playingTrack && (
          <img
            src={playingTrack.albumArt}
            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-125 transition-all duration-1000"
            alt="Background"
          />
        )}
      </div>

      <div className="z-10 w-full max-w-7xl">
        {!accessToken && !isDemo ? (
          <div className="flex flex-col items-center justify-center h-[80vh] space-y-8">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 tracking-tighter">
              MusixMatch
            </h1>
            <p className="text-xl text-gray-400 max-w-md text-center">
              Sync your Spotify playback with real-time lyrics in a beautiful interface.
            </p>
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6">
              <a
                className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-4 px-10 rounded-full text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_rgba(29,185,84,0.5)] text-center"
                href="/login"
              >
                Login with Spotify
              </a>
              <button
                onClick={handleDemoStart}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 font-bold py-4 px-10 rounded-full text-xl transition-all duration-300 transform hover:scale-105 text-center"
              >
                Try Demo
              </button>
            </div>
          </div>
        ) : (
          <PlayerLayout
            playingTrack={playingTrack}
            lyrics={lyrics}
            source={lyricsSource}
            onRefresh={handleManualRefresh}
          />
        )}
      </div>
    </div>
  );
}

export default App;
