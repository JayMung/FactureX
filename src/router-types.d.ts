declare module 'react-router-dom' {
  import * as React from 'react';

  export const BrowserRouter: React.ComponentType<any>;
  export const Routes: React.ComponentType<any>;
  export const Route: React.ComponentType<any>;
  export const Navigate: React.ComponentType<any>;
  export const Outlet: React.ComponentType<any>;
  export const Link: React.ComponentType<any>;
  export const NavLink: React.ComponentType<any>;
  
  export function useNavigate(): any;
  export function useParams<T = any>(): T;
  export function useLocation(): any;
  export function useSearchParams(defaultInit?: any): [URLSearchParams, (obj: any, options?: any) => void];
}