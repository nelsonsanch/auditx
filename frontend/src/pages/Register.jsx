import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Loader2, Eye, EyeOff, Upload, X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Register = () => {
  const [formData, setFormData] = useState({
    email: "",
    confirm_email: "",
    password: "",
    confirm_password: "",
    company_name: "",
    admin_name: "",
    address: "",
    phone: "",
    logo_url: "",
    // Nuevos campos de caracterización
    nit: "",
    representante_legal: "",
    arl_afiliada: "",
    nivel_riesgo: "",
    codigo_ciiu: "",
    subdivision_ciiu: "",
    descripcion_actividad: "Según definición establecida en el CIIU",
    numero_trabajadores: "",
    numero_sedes: "1"
  });
  const [sedesAdicionales, setSedesAdicionales] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Solo se permiten archivos de imagen");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo no debe superar 5MB");
      return;
    }

    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload logo
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/upload-logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setFormData(prev => ({
        ...prev,
        logo_url: response.data.logo_url
      }));
      toast.success("Logo subido exitosamente");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al subir logo");
      setLogoFile(null);
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, logo_url: "" }));
  };

  const validateForm = () => {
    // Validate email confirmation
    if (formData.email !== formData.confirm_email) {
      toast.error("Los correos electrónicos no coinciden");
      return false;
    }

    // Validate password confirmation
    if (formData.password !== formData.confirm_password) {
      toast.error("Las contraseñas no coinciden");
      return false;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return false;
    }

    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Remove confirmation fields before sending
      const { confirm_email, confirm_password, ...dataToSend } = formData;
      
      const response = await axios.post(`${API}/auth/register`, dataToSend);
      toast.success(response.data.message);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card className="w-full max-w-3xl shadow-2xl" data-testid="register-card">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg" data-testid="register-logo">
              <Building2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>AuditX - Registro</CardTitle>
          <CardDescription className="text-base">Complete los datos para registrar su empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Logo de la Empresa (Opcional)</Label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="w-24 h-24 object-contain border-2 border-gray-300 rounded-lg"
                      data-testid="logo-preview"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      data-testid="remove-logo-button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label 
                    htmlFor="logo-upload" 
                    className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                    data-testid="logo-upload-label"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                      data-testid="logo-upload-input"
                    />
                  </label>
                )}
                <div className="text-sm text-gray-600">
                  <p>Sube el logo de tu empresa</p>
                  <p className="text-xs">JPG, PNG o WEBP (máx. 5MB)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nombre de la Empresa *</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  type="text"
                  placeholder="Empresa S.A.S"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                  data-testid="company-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_name">Nombre del Administrador *</Label>
                <Input
                  id="admin_name"
                  name="admin_name"
                  type="text"
                  placeholder="Juan Pérez"
                  value={formData.admin_name}
                  onChange={handleChange}
                  required
                  data-testid="admin-name-input"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@empresa.com"
                value={formData.email}
                onChange={handleChange}
                required
                data-testid="email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_email">Confirmar Correo Electrónico *</Label>
              <Input
                id="confirm_email"
                name="confirm_email"
                type="email"
                placeholder="admin@empresa.com"
                value={formData.confirm_email}
                onChange={handleChange}
                required
                data-testid="confirm-email-input"
                className={formData.confirm_email && formData.email !== formData.confirm_email ? "border-red-500" : ""}
              />
              {formData.confirm_email && formData.email !== formData.confirm_email && (
                <p className="text-xs text-red-500">Los correos no coinciden</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña Segura *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  data-testid="password-input"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  data-testid="toggle-password-button"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">Debe tener al menos 8 caracteres</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar Contraseña *</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repite tu contraseña"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  data-testid="confirm-password-input"
                  className={`pr-10 ${formData.confirm_password && formData.password !== formData.confirm_password ? "border-red-500" : ""}`}
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
              {formData.confirm_password && formData.password !== formData.confirm_password && (
                <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Dirección *</Label>
              <Input
                id="address"
                name="address"
                type="text"
                placeholder="Calle 123 #45-67, Bogotá"
                value={formData.address}
                onChange={handleChange}
                required
                data-testid="address-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+57 300 123 4567"
                value={formData.phone}
                onChange={handleChange}
                required
                data-testid="phone-input"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || uploadingLogo}
              data-testid="register-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Registrarse"
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium" data-testid="login-link">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;