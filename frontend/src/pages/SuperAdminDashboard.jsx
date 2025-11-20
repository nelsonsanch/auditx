import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, CheckCircle2, XCircle, LogOut, Users, AlertCircle } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SuperAdminDashboard = () => {
  const [companies, setCompanies] = useState([]);
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center" data-testid="admin-logo">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>Panel de Administrador</h1>
            </div>
            <Button onClick={handleLogout} variant="outline" data-testid="logout-button">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
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