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
          // Fetch Lyrics via backend
          axios.get('http://localhost:3001/lyrics', {
            params: { track: demoTrack.name, artist: demoTrack.artist }
          }).then(res => {
            setLyrics(res.data.lines);
            setLyricsFound(true);
          }).catch(err => {
            console.error("Demo lyrics fetch failed", err);
            // Fallback lyrics if backend fails or is offline
            setLyrics([
              "I used to rule the world",
              "Seas would rise when I gave the word",
              "Now in the morning, I sleep alone",
              "Sweep the streets I used to own",
              "",
              "I used to roll the dice",
              "Feel the fear in my enemy's eyes",
              "Listen as the crowd would sing",
              "Now the old king is dead! Long live the king!",
              "(Demo Fallback Lyrics)"
            ]);
          });
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
            // Fetch Lyrics from our backend
            axios.get('http://localhost:3001/lyrics', {
              params: { track: trackName, artist: artist }
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

    // Poll every 5 seconds
    fetchPlaybackState();
    const interval = setInterval(fetchPlaybackState, 5000);
    return () => clearInterval(interval);
  }, [accessToken, playingTrack, isDemo]);

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
                href="http://localhost:3001/login"
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
          <PlayerLayout playingTrack={playingTrack} lyrics={lyrics} />
        )}
      </div>
    </div>
  );
}

export default App;
