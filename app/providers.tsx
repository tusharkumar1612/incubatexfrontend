'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';

function StoreHydration() {
  useEffect(() => {
    useAuthStore.persist.rehydrate();
    // After rehydrate, sync token to cookie so middleware can read it
    const token = useAuthStore.getState().token;
    if (token) {
      document.cookie = `incubatex_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    }
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <StoreHydration />
      {children}
    </QueryClientProvider>
  );
}
