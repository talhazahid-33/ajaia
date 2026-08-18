import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
            Ajaia
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Use your email and password to continue.
          </p>
        </div>
        <LoginForm />
      </main>
    </div>
  );
}
