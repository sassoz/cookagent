import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cookagent',
    short_name: 'Cookagent',
    description: 'Mobile-first personal recipe manager.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#14532d',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
