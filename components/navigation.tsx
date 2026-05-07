'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Home' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/ingest', label: 'Ingest' },
  { href: '/settings', label: 'Settings' },
];

export function Navigation() {
  const pathname = usePathname();

  if (pathname.endsWith('/print')) {
    return null;
  }

  return (
    <>
      <nav className="hidden border-b bg-white sm:block">
        <div className="mx-auto flex w-full max-w-5xl gap-2 px-6 py-3 lg:px-8">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-brand text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white sm:hidden">
        <ul className="mx-auto grid w-full max-w-md grid-cols-4">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block px-2 py-3 text-center text-xs font-medium ${
                    isActive ? 'text-brand' : 'text-gray-600'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
