import React, { useEffect, useRef, useState } from 'react';

const LyricsDisplay = ({ lyrics, track, artist, source }) => {
    const containerRef = useRef(null);
    const [activeLine, setActiveLine] = useState(0);

    // Reset active line when track changes
    useEffect(() => {
        setActiveLine(0);
        if (containerRef.current) {
            containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [track]);

    const scrollToActiveLine = (index) => {
        if (containerRef.current) {
            const lineElement = containerRef.current.children[1].children[index];
            if (lineElement) {
                lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    const handleNextLine = () => {
        if (lyrics && activeLine < lyrics.length - 1) {
            setActiveLine(prev => {
                const next = prev + 1;
                scrollToActiveLine(next);
                return next;
            });
        }
    };

    const handlePrevLine = () => {
        if (activeLine > 0) {
            setActiveLine(prev => {
                const next = prev - 1;
                scrollToActiveLine(next);
                return next;
            });
        }
    };

    const handleScroll = () => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const lyricsContainer = container.children[1]; // The div containing p tags
        if (!lyricsContainer) return;

        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + (containerRect.height / 2);

        let closestIndex = 0;
        let minDistance = Infinity;

        Array.from(lyricsContainer.children).forEach((child, index) => {
            const childRect = child.getBoundingClientRect();
            const childCenter = childRect.top + (childRect.height / 2);
            const distance = Math.abs(childCenter - containerCenter);

            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        if (closestIndex !== activeLine) {
            setActiveLine(closestIndex);
        }
    };

    return (
        <div
            className="flex flex-col h-full relative"
        >
            <div
                className="flex-1 overflow-y-auto no-scrollbar p-8 text-center scroll-smooth"
                ref={containerRef}
                onScroll={handleScroll}
            >
                <div className="sticky top-0 bg-transparent py-4 z-10 mb-8 w-full backdrop-blur-sm">
                    <h2 className="text-3xl font-extrabold text-white mb-1 drop-shadow-lg">{track}</h2>
                    <h3 className="text-xl text-gray-300 font-medium tracking-wide">{artist}</h3>
                </div>

                <div className="space-y-8 py-[45vh]">
                    {lyrics && lyrics.length > 0 ? (
                        lyrics.map((line, index) => (
                            <p
                                key={index}
                                onClick={() => {
                                    setActiveLine(index);
                                    scrollToActiveLine(index);
                                }}
                                className={`transition-all duration-300 cursor-pointer origin-center px-4
                                    ${index === activeLine
                                        ? 'text-3xl md:text-4xl text-white font-bold scale-105 opacity-100 py-4 shadow-text-glow'
                                        : 'text-xl md:text-2xl text-gray-500 font-medium scale-95 opacity-50 blur-[0.5px] hover:opacity-80 hover:blur-none hover:scale-100'
                                    }
                                `}
                            >
                                {line}
                            </p>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 space-y-3 opacity-60">
                            <p className="text-lg text-gray-400 italic">Searching for lyrics...</p>
                            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Controls */}
            {lyrics && lyrics.length > 0 && (
                <>
                    <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-12 z-20 pointer-events-none">
                        <button
                            onClick={handlePrevLine}
                            className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/30 transition-all duration-300 active:scale-95 group pointer-events-auto shadow-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={handleNextLine}
                            className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/30 transition-all duration-300 active:scale-95 group pointer-events-auto shadow-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                    {/* Source Indicator */}
                    <div className="absolute bottom-4 left-4 z-20 opacity-50 text-xs text-gray-400 font-mono">
                        Source: {source || "Unknown"}
                    </div>
                </>
            )}
        </div>
    );
};

export default LyricsDisplay;
