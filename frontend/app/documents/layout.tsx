import { AuthGate } from '@/components/auth-gate';

export default function DocumentsLayout({
  children,
}: LayoutProps<'/documents'>) {
  return <AuthGate>{children}</AuthGate>;
}
