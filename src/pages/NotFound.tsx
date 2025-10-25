import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Shield } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-2">Oops! Page non trouvée</p>
          <p className="text-gray-500 mb-8">
            La page que vous cherchez n'existe pas ou a été déplacée.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button 
            onClick={() => window.location.href = '/'}
            className="bg-green-500 hover:bg-green-600 mr-4"
          >
            <Home className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/admin-setup'}
            variant="outline"
          >
            <Shield className="mr-2 h-4 w-4" />
            Configuration Admin
          </Button>
        </div>
        
        <div className="mt-8 p-4 bg-gray-100 rounded-lg max-w-md mx-auto">
          <p className="text-sm text-gray-600">
            <strong>Première utilisation ?</strong> Accédez à <code>/admin-setup</code> pour créer votre compte administrateur.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;