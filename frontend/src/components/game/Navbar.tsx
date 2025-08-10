
export default function Navbar() {
  const RainbowText = ({ children }: { children: React.ReactNode }) => (
    <span
      className="text-3xl font-semibold"
      style={{
        color: 'transparent',
        background: 'linear-gradient(90deg, #ffd700, #ffed4e, #fff200, #ffd700, #ffb347, #ff8c00, #ff6b35, #ff4500, #ff1493, #ff69b4, #ff1493, #ff4500, #ff6b35, #ff8c00, #ffb347, #ffd700, #ffed4e, #fff200, #ffd700, #ffb347, #ff8c00, #ff6b35, #ff4500, #ff1493, #ff69b4, #ff1493, #ff4500, #ff6b35, #ff8c00, #ffb347, #ffd700)',
        backgroundSize: '200% auto',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'rainbow-move 3s ease-in-out infinite',
      }}
    >
      {children}
      <style jsx>{`
        @keyframes rainbow-move {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }
      `}</style>
    </span>
  );
  
  return (
    <nav className="bg-transparent backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RainbowText>国庆晚会抽奖</RainbowText>
          </div>
        </div>
      </div>
    </nav>
  );
}
