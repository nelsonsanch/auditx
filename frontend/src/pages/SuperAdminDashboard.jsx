import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, CheckCircle2, XCircle, LogOut, Users, AlertCircle, Key, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SuperAdminDashboard = () => {
  const [companies, setCompanies] = useState([]);
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [pendingRes, allRes] = await Promise.all([
        axios.get(`${API}/admin/pending-companies`, { headers }),
        axios.get(`${API}/admin/companies`, { headers })
      ]);

      setPendingCompanies(pendingRes.data);
      setCompanies(allRes.data);
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (companyId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/admin/activate-company/${companyId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Empresa activada exitosamente");
      fetchData();
    } catch (error) {
      toast.error("Error al activar empresa");
    }
  };

  const handleDeactivate = async (companyId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/admin/deactivate-company/${companyId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Empresa desactivada");
      fetchData();
    } catch (error) {
      toast.error("Error al desactivar empresa");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (passwordData.new_password.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }

    setChangingPassword(true);

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/auth/change-password`,
        {
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Contraseña actualizada exitosamente");
      setChangePasswordOpen(false);
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: ""
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al cambiar contraseña");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0" data-testid="admin-logo">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold truncate" style={{ fontFamily: 'Space Grotesk' }}>Panel Admin</h1>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="change-password-button" className="text-xs sm:text-sm">
                    <Key className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Cambiar Contraseña</span>
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="change-password-modal">
                  <DialogHeader>
                    <DialogTitle>Cambiar Contraseña</DialogTitle>
                    <DialogDescription>
                      Ingresa tu contraseña actual y la nueva contraseña
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Contraseña Actual *</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordData.current_password}
                          onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                          required
                          data-testid="current-password-input"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nueva Contraseña *</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.new_password}
                          onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                          required
                          minLength={8}
                          data-testid="new-password-input"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">Mínimo 8 caracteres</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-new-password">Confirmar Nueva Contraseña *</Label>
                      <div className="relative">
                        <Input
                          id="confirm-new-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordData.confirm_password}
                          onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                          required
                          minLength={8}
                          data-testid="confirm-new-password-input"
                          className={`pr-10 ${passwordData.confirm_password && passwordData.new_password !== passwordData.confirm_password ? "border-red-500" : ""}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {passwordData.confirm_password && passwordData.new_password !== passwordData.confirm_password && (
                        <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={changingPassword}
                      data-testid="submit-change-password"
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cambiando...
                        </>
                      ) : (
                        "Cambiar Contraseña"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Button onClick={handleLogout} variant="outline" size="sm" data-testid="logout-button" className="text-xs sm:text-sm">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200" data-testid="pending-count-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-800 flex items-center">
                <AlertCircle className="mr-2 h-4 w-4" />
                Pendientes de Activación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900" data-testid="pending-count">{pendingCompanies.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200" data-testid="active-count-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-800 flex items-center">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Empresas Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900" data-testid="active-count">{companies.filter(c => c.is_active).length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200" data-testid="total-count-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Total de Empresas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900" data-testid="total-count">{companies.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-xl" data-testid="companies-table-card">
          <CardHeader>
            <div className="flex space-x-4 border-b">
              <button
                onClick={() => setActiveTab("pending")}
                className={`pb-2 px-4 font-medium transition-colors ${
                  activeTab === "pending"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-blue-600"
                }`}
                data-testid="pending-tab"
              >
                Pendientes ({pendingCompanies.length})
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={`pb-2 px-4 font-medium transition-colors ${
                  activeTab === "all"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-blue-600"
                }`}
                data-testid="all-tab"
              >
                Todas ({companies.length})
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8" data-testid="loading-indicator">Cargando...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Administrador</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(activeTab === "pending" ? pendingCompanies : companies).map((company) => (
                    <TableRow key={company.id} data-testid={`company-row-${company.id}`}>
                      <TableCell className="font-medium">{company.company_name}</TableCell>
                      <TableCell>{company.admin_name}</TableCell>
                      <TableCell>{company.user_email}</TableCell>
                      <TableCell>{company.phone}</TableCell>
                      <TableCell>
                        {company.is_active ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200" data-testid={`status-active-${company.id}`}>
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200" data-testid={`status-pending-${company.id}`}>
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {company.is_active ? (
                          <Button
                            onClick={() => handleDeactivate(company.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            data-testid={`deactivate-button-${company.id}`}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Desactivar
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleActivate(company.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`activate-button-${company.id}`}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Activar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;