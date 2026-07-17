import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';

export default function MainLayout() {
  return (
    <div
      className="grid min-h-screen grid-cols-[var(--sidebar-w)_minmax(0,1fr)] bg-background max-[760px]:grid-cols-1"
      data-testid="app-shell"
    >
      <Sidebar />
      <main className="flex min-h-screen min-w-0 flex-col max-[760px]:pb-[calc(var(--bottombar-h)+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-[var(--container-max)] flex-1 px-[var(--container-gutter-tablet)] py-6 min-[1025px]:px-[var(--container-gutter-desktop)] max-[760px]:px-[var(--container-gutter-phone)]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
