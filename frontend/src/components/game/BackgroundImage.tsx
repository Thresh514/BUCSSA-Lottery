import { motion } from 'framer-motion';

interface BackgroundImageProps {
  imageUrl: string;
  overlayOpacity?: number;
}

const BackgroundImage = ({ imageUrl, overlayOpacity = 0.3 }: BackgroundImageProps) => {
  return (
    <div className="fixed inset-0 z-0">
      {/* 背景图片 */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${imageUrl})`,
        }}
      />
      
      {/* 遮罩层 */}
      <div 
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity }}
      />
    </div>
  );
};

export default BackgroundImage;
