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
    descripcion_actividad: "",
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

  const handleAddSede = () => {
    setSedesAdicionales([...sedesAdicionales, {
      direccion: "",
      numero_trabajadores: "",
      nivel_riesgo: "",
      codigo_ciiu: "",
      subdivision_ciiu: "",
      descripcion_actividad: ""
    }]);
  };

  const handleRemoveSede = (index) => {
    setSedesAdicionales(sedesAdicionales.filter((_, i) => i !== index));
  };

  const handleSedeChange = (index, field, value) => {
    const newSedes = [...sedesAdicionales];
    newSedes[index][field] = value;
    setSedesAdicionales(newSedes);
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
      
      // Convert numeric strings to numbers
      dataToSend.numero_trabajadores = parseInt(dataToSend.numero_trabajadores) || 0;
      dataToSend.numero_sedes = parseInt(dataToSend.numero_sedes) || 1;
      
      // Add sedes adicionales
      dataToSend.sedes_adicionales = sedesAdicionales.map(sede => ({
        ...sede,
        numero_trabajadores: parseInt(sede.numero_trabajadores) || 0
      }));
      
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

            {/* Sección de Caracterización Extendida */}
            <div className="border-t pt-4 mt-6">
              <h3 className="text-lg font-semibold mb-4">Caracterización de la Empresa</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nit">NIT *</Label>
                  <Input
                    id="nit"
                    name="nit"
                    type="text"
                    placeholder="900123456-7"
                    value={formData.nit}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="representante_legal">Representante Legal *</Label>
                  <Input
                    id="representante_legal"
                    name="representante_legal"
                    type="text"
                    placeholder="Nombre completo"
                    value={formData.representante_legal}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="arl_afiliada">ARL Afiliada *</Label>
                  <Input
                    id="arl_afiliada"
                    name="arl_afiliada"
                    type="text"
                    placeholder="Nombre de la ARL"
                    value={formData.arl_afiliada}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="numero_trabajadores">Número de Trabajadores (Sede Principal) *</Label>
                  <Input
                    id="numero_trabajadores"
                    name="numero_trabajadores"
                    type="number"
                    min="1"
                    placeholder="50"
                    value={formData.numero_trabajadores}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Código de Actividad Económica */}
              <div className="mt-4 space-y-2">
                <Label>Código de Actividad Económica (Decreto 768/2022) *</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="nivel_riesgo" className="text-xs text-gray-600">Nivel de Riesgo (1 dígito)</Label>
                    <Input
                      id="nivel_riesgo"
                      name="nivel_riesgo"
                      type="text"
                      maxLength="1"
                      pattern="[1-5]"
                      placeholder="1-5"
                      value={formData.nivel_riesgo}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="codigo_ciiu" className="text-xs text-gray-600">CIIU (4 dígitos)</Label>
                    <Input
                      id="codigo_ciiu"
                      name="codigo_ciiu"
                      type="text"
                      maxLength="4"
                      pattern="[0-9]{4}"
                      placeholder="0161"
                      value={formData.codigo_ciiu}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="subdivision_ciiu" className="text-xs text-gray-600">Subdivisión (2 dígitos)</Label>
                    <Input
                      id="subdivision_ciiu"
                      name="subdivision_ciiu"
                      type="text"
                      maxLength="2"
                      pattern="[0-9]{2}"
                      placeholder="01"
                      value={formData.subdivision_ciiu}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Ejemplo: Riesgo=2, CIIU=0161, Subdivisión=01</p>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="descripcion_actividad">Descripción de la Actividad Económica *</Label>
                <textarea
                  id="descripcion_actividad"
                  name="descripcion_actividad"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Según definición establecida en el CIIU. Ej: Cultivo de café, Servicios de salud especializados, Construcción de edificaciones, etc."
                  value={formData.descripcion_actividad}
                  onChange={handleChange}
                  required
                  rows="3"
                />
                <p className="text-xs text-gray-500">Esta información será usada por la IA para generar mejores informes personalizados</p>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="numero_sedes">Número Total de Sedes *</Label>
                <Input
                  id="numero_sedes"
                  name="numero_sedes"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formData.numero_sedes}
                  onChange={(e) => {
                    handleChange(e);
                    const numSedes = parseInt(e.target.value) || 1;
                    if (numSedes === 1) {
                      setSedesAdicionales([]);
                    }
                  }}
                  required
                />
              </div>

              {/* Sedes Adicionales */}
              {parseInt(formData.numero_sedes) > 1 && (
                <div className="mt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-base">Sedes Adicionales</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSede}
                    >
                      + Agregar Sede
                    </Button>
                  </div>
                  
                  {sedesAdicionales.map((sede, index) => (
                    <div key={index} className="border p-4 rounded-lg bg-gray-50 relative">
                      <button
                        type="button"
                        onClick={() => handleRemoveSede(index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      
                      <h4 className="font-medium mb-3">Sede {index + 2}</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Dirección *</Label>
                          <Input
                            type="text"
                            placeholder="Dirección de la sede"
                            value={sede.direccion}
                            onChange={(e) => handleSedeChange(index, 'direccion', e.target.value)}
                            required
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Número de Trabajadores *</Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="20"
                            value={sede.numero_trabajadores}
                            onChange={(e) => handleSedeChange(index, 'numero_trabajadores', e.target.value)}
                            required
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Código de Actividad Económica *</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              type="text"
                              maxLength="1"
                              pattern="[1-5]"
                              placeholder="Riesgo"
                              value={sede.nivel_riesgo}
                              onChange={(e) => handleSedeChange(index, 'nivel_riesgo', e.target.value)}
                              required
                            />
                            <Input
                              type="text"
                              maxLength="4"
                              pattern="[0-9]{4}"
                              placeholder="CIIU"
                              value={sede.codigo_ciiu}
                              onChange={(e) => handleSedeChange(index, 'codigo_ciiu', e.target.value)}
                              required
                            />
                            <Input
                              type="text"
                              maxLength="2"
                              pattern="[0-9]{2}"
                              placeholder="Subdiv"
                              value={sede.subdivision_ciiu}
                              onChange={(e) => handleSedeChange(index, 'subdivision_ciiu', e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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