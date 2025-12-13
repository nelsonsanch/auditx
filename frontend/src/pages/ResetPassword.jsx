import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    if (!token) {
      toast.error("Token inválido");
      setVerifying(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/verify-reset-token/${token}`);
      setTokenValid(response.data.valid);
      setUserEmail(response.data.email);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Token inválido o expirado");
      setTokenValid(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: newPassword
      });

      toast.success("Contraseña restablecida exitosamente");
      setResetSuccess(true);
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al restablecer contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Card className="w-full max-w-md shadow-2xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Verificando enlace...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-red-600">Enlace Inválido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600">
              Este enlace de recuperación es inválido o ha expirado.
            </p>
            <Button 
              onClick={() => navigate("/login")} 
              className="w-full"
            >
              Volver al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">¡Contraseña Restablecida!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600">
              Su contraseña ha sido restablecida exitosamente. Redirigiendo al login...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card className="w-full max-w-md shadow-2xl" data-testid="reset-password-card">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>Restablecer Contraseña</CardTitle>
          <CardDescription className="text-base">
            Crear nueva contraseña para {userEmail}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4" data-testid="reset-password-form">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña *</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  data-testid="new-password-input"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  data-testid="toggle-new-password-button"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">Debe tener al menos 8 caracteres</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nueva Contraseña *</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  data-testid="confirm-password-input"
                  className={`pr-10 ${confirmPassword && newPassword !== confirmPassword ? "border-red-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  data-testid="toggle-confirm-password-button"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              data-testid="reset-password-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restableciendo...
                </>
              ) : (
                "Restablecer Contraseña"
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Volver al Login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;