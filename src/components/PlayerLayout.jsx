import React, { useRef } from 'react';
import LyricsDisplay from './LyricsDisplay';

const PlayerLayout = ({ playingTrack, lyrics, source, onRefresh }) => {
    const lyricsRef = useRef(null);

    return (
        <div className="flex justify-center items-center h-[85vh] w-full max-w-5xl mx-auto relative">
            {/* Control Buttons Container */}
            <div className="absolute top-0 left-0 mt-4 ml-4 z-50 flex flex-col space-y-4">
                {/* Refresh Button */}
                <button
                    onClick={onRefresh}
                    className="bg-white/10 hover:bg-white/20 text-white/80 hover:text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm transition-all"
                >
                    ↻ Sync
                </button>

                {/* Next Lyric Button (Large) */}
                <button
                    onClick={() => lyricsRef.current?.handleNextLine()}
                    className="bg-white/20 hover:bg-white/30 text-white w-32 h-32 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-lg border border-white/10"
                    title="Next Lyric"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </button>
            </div>

            <div className="w-full h-full max-h-[80vh]">
                {playingTrack ? (
                    <LyricsDisplay
                        ref={lyricsRef}
                        lyrics={lyrics}
                        track={playingTrack.name}
                        artist={playingTrack.artist}
                        source={source}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-4 opacity-50">
                            <div className="inline-block p-4 rounded-full bg-white/5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                            </div>
                            <p className="text-gray-500">Lyrics will appear here</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerLayout;
