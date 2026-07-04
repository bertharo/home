import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default async function AuthCodeError({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const notAllowed = reason === "not-allowed";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <AlertCircle className="mb-3 h-10 w-10 text-amber-500" />
      <h1 className="text-xl font-semibold text-neutral-900">
        {notAllowed ? "Not on the list" : "Sign-in link expired"}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-neutral-500">
        {notAllowed
          ? "This email isn't one of the two Home members. If that's a mistake, check the allowlist."
          : "That magic link is no longer valid. Request a fresh one to sign in."}
      </p>
      <Link
        href="/login"
        className="mt-6 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white"
      >
        Back to sign in
      </Link>
    </main>
  );
}
