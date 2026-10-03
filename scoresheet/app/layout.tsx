import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { InstallPrompt } from '@/components/InstallPrompt';

export const metadata: Metadata = {
  title: 'RinkStop Scoresheet',
  description: 'Score hockey games. Real-time stats, official timing, share with anyone.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RinkStop Scoresheet',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#041E42',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <ServiceWorkerRegister />
          {children}
          <InstallPrompt />
        </body>
      </html>
    </ClerkProvider>
  );
}
