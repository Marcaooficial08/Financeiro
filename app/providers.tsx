'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from './_providers/theme-provider';

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SessionProvider>
  );
}
