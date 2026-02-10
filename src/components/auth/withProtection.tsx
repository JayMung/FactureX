import React from 'react';
import Layout from '../layout/Layout';
import { usePageSetup } from '../../hooks/use-page-setup';
import ProtectedRouteEnhanced from './ProtectedRouteEnhanced';

interface WithProtectionOptions {
  title: string;
  subtitle?: string;
  requiredModule?: string;
  requiredPermission?: 'read' | 'create' | 'update' | 'delete';
  adminOnly?: boolean;
}

export function withProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithProtectionOptions
) {
  const ProtectedPage: React.FC<P> = (props) => {
    usePageSetup({
      title: options.title,
      subtitle: options.subtitle,
    });

    return (
      <ProtectedRouteEnhanced
        requiredModule={options.requiredModule}
        requiredPermission={options.requiredPermission}
        adminOnly={options.adminOnly}
      >
        <Layout>
          <WrappedComponent {...props} />
        </Layout>
      </ProtectedRouteEnhanced>
    );
  };

  ProtectedPage.displayName = `withProtection(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return ProtectedPage;
}

export default withProtection;
