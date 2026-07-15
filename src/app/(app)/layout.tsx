import { redirect } from "next/navigation";
import { requireUser, getCurrentProfile } from "@/lib/auth";
import { DesktopSidebar } from "@/components/nav/DesktopSidebar";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { BottomNav } from "@/components/nav/BottomNav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  const me = await getCurrentProfile();

  // No household yet -> send through onboarding before showing the app.
  if (!me?.household_id) redirect("/welcome");

  return (
    <div className="flex min-h-dvh">
      <DesktopSidebar me={me} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar me={me} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-5 sm:px-8 sm:pb-10 sm:pt-8">
          {children}
        </main>
      </div>
      <BottomNav />
      <ServiceWorkerRegister />
    </div>
  );
}
