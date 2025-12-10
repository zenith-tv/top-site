'use client';

import { useLanguage } from '@/context/language-context';
import { ReactNode } from 'react';

interface LanguageClientProps {
  children: (lang: { t: (key: string) => string }) => ReactNode;
}

export function LanguageClient({ children }: LanguageClientProps) {
  const { t } = useLanguage();
  return <>{children({ t })}</>;
}
