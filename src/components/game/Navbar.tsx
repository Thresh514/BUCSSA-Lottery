import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function Navbar() {
  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-2xl font-bold text-white">少数派游戏</span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="rounded-2xl text-black"
          >
            <LogOut className="w-4 h-4 mr-2 text-black" />
            退出
          </Button>
        </div>
      </div>
    </nav>
  );
} 