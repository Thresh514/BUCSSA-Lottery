interface BackgroundImageProps {
  imageUrl: string;
  overlayOpacity?: number;
  centerMask?: boolean;
  maskWidth?: number; // 蒙版宽度百分比，默认60%
}

const BackgroundImage = ({ 
  imageUrl, 
  overlayOpacity = 0.05, 
  centerMask = true,
  maskWidth = 60 
}: BackgroundImageProps) => {
  return (
    <div className="fixed inset-0 z-0">
      {/* 背景图片 */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${imageUrl})`,
        }}
      />
      
      {/* 整体遮罩层 */}
      <div 
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity }}
      />
      
      {/* 中间聚焦蒙版 - 使用径向渐变 */}
      {centerMask && (
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse ${maskWidth}% 100% at center, transparent 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.4) 90%)`,
            backdropFilter: 'blur(1px)',
          }}
        />
      )}
    </div>
  );
};

export default BackgroundImage;
