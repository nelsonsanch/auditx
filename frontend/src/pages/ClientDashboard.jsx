import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, Plus, LogOut, FileText, Calendar, TrendingUp, Eye, Building2, MapPin, Users } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientDashboard = () => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/inspections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInspections(response.data);
    } catch (error) {
      toast.error("Error al cargar inspecciones");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const getScoreColor = (score) => {
    if (score >= 85) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score) => {
    if (score >= 85) return <Badge className="bg-green-100 text-green-800">Excelente</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Moderado</Badge>;
    return <Badge className="bg-red-100 text-red-800">Crítico</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0" data-testid="client-logo">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold truncate" style={{ fontFamily: 'Space Grotesk' }}>Panel Cliente</h1>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <Button 
                onClick={() => navigate("/client/inspection/create")} 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-xs sm:text-sm"
                size="sm"
                data-testid="create-inspection-button"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nueva Inspección</span>
              </Button>
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
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200" data-testid="total-inspections-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                Total Inspecciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900" data-testid="total-inspections">{inspections.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200" data-testid="average-score-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-800 flex items-center">
                <TrendingUp className="mr-2 h-4 w-4" />
                Promedio de Cumplimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900" data-testid="average-score">
                {inspections.length > 0
                  ? (inspections.reduce((acc, i) => acc + i.total_score, 0) / inspections.length).toFixed(1)
                  : 0}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200" data-testid="last-inspection-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-800 flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                Última Inspección
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-purple-900" data-testid="last-inspection-date">
                {inspections.length > 0
                  ? new Date(inspections[0].created_at).toLocaleDateString('es-ES')
                  : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-xl" data-testid="inspections-table-card">
          <CardHeader>
            <CardTitle className="text-2xl" style={{ fontFamily: 'Space Grotesk' }}>Mis Inspecciones</CardTitle>
            <CardDescription>Historial de inspecciones de seguridad y salud en el trabajo</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8" data-testid="loading-indicator">Cargando...</div>
            ) : inspections.length === 0 ? (
              <div className="text-center py-12" data-testid="no-inspections">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">Aún no has creado ninguna inspección</p>
                <Button 
                  onClick={() => navigate("/client/inspection/create")}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                  data-testid="create-first-inspection-button"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera Inspección
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Puntaje</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((inspection) => (
                    <TableRow key={inspection.id} data-testid={`inspection-row-${inspection.id}`}>
                      <TableCell className="font-medium">{inspection.company_name}</TableCell>
                      <TableCell>{new Date(inspection.created_at).toLocaleDateString('es-ES')}</TableCell>
                      <TableCell>
                        <span className={`text-2xl font-bold ${getScoreColor(inspection.total_score)}`} data-testid={`score-${inspection.id}`}>
                          {inspection.total_score.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>{getScoreBadge(inspection.total_score)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => navigate(`/client/inspection/${inspection.id}`)}
                          size="sm"
                          variant="outline"
                          data-testid={`view-button-${inspection.id}`}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Ver Detalle
                        </Button>
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

export default ClientDashboard;