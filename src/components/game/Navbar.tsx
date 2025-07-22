import Link from 'next/link';
import { motion } from 'framer-motion';
import { Book, Trophy, HelpCircle, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-white">BU CSSA 活动抽奖</span>
          </Link>

          {/* Login Button */}
          <Button variant="default" size="default">
            登录
          </Button>
        </div>
      </div>
    </motion.nav>
  );
};

const NavLink = ({ href, icon, text }: { href: string; icon: React.ReactNode; text: string }) => {
  return (
    <Link
      href={href}
      className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors duration-200"
    >
      {icon}
      <span>{text}</span>
    </Link>
  );
};

export default Navbar; 