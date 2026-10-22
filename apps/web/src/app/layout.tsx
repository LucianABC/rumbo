import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { fontVariables } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'rumbo',
  description: 'Job search, end to end',
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
