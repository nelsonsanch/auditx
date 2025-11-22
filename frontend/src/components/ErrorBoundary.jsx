import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
                <CardTitle className="text-2xl">Algo salió mal</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                La aplicación encontró un error inesperado. Por favor, intenta recargar la página.
              </p>
              {this.state.error && (
                <details className="text-xs text-gray-500 bg-gray-100 p-3 rounded">
                  <summary className="cursor-pointer font-medium">Detalles técnicos</summary>
                  <pre className="mt-2 overflow-auto">{this.state.error.toString()}</pre>
                </details>
              )}
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Recargar Página
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
