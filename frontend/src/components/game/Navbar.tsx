import Image from 'next/image';

export default function Navbar() {
  return (
    <nav className="bg-transparent fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-start gap-2">
            <Image 
              src="/bucssalogo.png" 
              alt="logo" 
              width={60} 
              height={60} 
              className="grayscale contrast-200"
            />
            <div className="text-3xl hidden md:block tracking-wider text-gray-200">BUCSSA</div>
          </div>
      </div>
    </nav>
  );
}
