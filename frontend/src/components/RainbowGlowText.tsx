'use client';

export default function RainbowGlowText({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="text-3xl font-bold tracking-wider"
            style={{
                background: 'linear-gradient(90deg, #ff0000, #ff9900, #ffff00, #33ff00, #00ffff, #0066ff, #cc00ff, #ff0000)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'rainbow-glow 2s linear infinite',
                textShadow: '0 0 4px #fff, 0 0 8px #ff00de, 0 0 12px #00e1ff'
                }}
            >
                {children}
                <style jsx>{`
                @keyframes rainbow-glow {
                    0% {
                    background-position: 0% 50%;
                    }
                    100% {
                    background-position: 200% 50%;
                    }
                }
                `}</style>
        </div>
    );
}