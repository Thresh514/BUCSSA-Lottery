import Image from 'next/image';
import { useState } from 'react';
import { QrCode } from 'lucide-react';

export default function Navbar() {
  const [showQRCode, setShowQRCode] = useState(false);

  return (
    <>
      <nav className="bg-transparent fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Image 
                  src="/bucssalogo.png" 
                  alt="logo" 
                  width={60} 
                  height={60} 
                  className="hidden md:block"
                />
                <div className="text-3xl hidden md:block tracking-wider text-gray-200">BUCSSA</div>
              </div>
              
              {/* QR码按钮 */}
              <button
                onClick={() => setShowQRCode(true)}
                className="hidden md:block p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 border border-white/20 hover:border-white/30"
                title="显示二维码"
              >
                <QrCode className="w-6 h-6" />
              </button>
            </div>
        </div>
      </nav>

      {/* QR码弹窗 */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-lg mx-4 border border-white/20">
            <div className="text-center space-y-4">
              <div className="w-96 h-96 bg-white rounded-lg flex items-center justify-center mx-auto">
                <div className="text-white text-center p-4">
                  <Image src="/qrcode.png" alt="qrcode" width={400} height={400} />
                </div>
              </div>
              <p className="text-white text-center text-2xl font-bold">lottery.bucssa.org</p>
              
              <button
                onClick={() => setShowQRCode(false)}
                className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
