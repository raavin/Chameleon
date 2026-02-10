import { useCallback, useEffect, useState } from 'react';

export function useSimpleRouter() {
  const [path, setPath] = useState(() => window.location.pathname || '/');

  useEffect(() => {
    const handler = () => setPath(window.location.pathname || '/');
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const navigate = useCallback((to: string) => {
    const target = to.startsWith('/') ? to : `/${to}`;
    if (window.location.pathname === target) return;
    window.history.pushState({}, '', target);
    setPath(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { path, navigate };
}
