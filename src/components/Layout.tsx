import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </div>
    </div>
  );
}
