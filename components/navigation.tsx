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
      <nav className="hidden border-b border-stone-200/80 bg-white/90 backdrop-blur sm:block">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <Link href="/" className="flex items-center gap-3 text-stone-950">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-brand text-sm font-bold text-white">C</span>
            <span className="text-base font-semibold tracking-tight">Cookagent</span>
          </Link>
          <div className="flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 p-1">
            {links.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(`${link.href}/`));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-white text-emerald-950 shadow-sm' : 'text-stone-600 hover:text-stone-950'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <Link
            href="/recipes/new"
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Add recipe
          </Link>
        </div>
      </nav>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur sm:hidden">
        <ul className="mx-auto grid w-full max-w-md grid-cols-4">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(`${link.href}/`));
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block px-2 py-3 text-center text-xs font-semibold ${
                    isActive ? 'text-emerald-900' : 'text-stone-500'
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
