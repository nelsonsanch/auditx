import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { 
  FileText, Plus, Edit3, Trash2, Save, ChevronDown, ChevronUp
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TIPOS_DOCUMENTO = [
  { value: "politica", label: "Política" },
  { value: "reglamento", label: "Reglamento" },
  { value: "manual", label: "Manual" },
  { value: "instructivo", label: "Instructivo" },
  { value: "procedimiento", label: "Procedimiento" },
  { value: "formato", label: "Formato" },
  { value: "otro", label: "Otro" },
];

const NormasEspecificasManager = ({ companyId }) => {
  const [normas, setNormas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNorma, setEditingNorma] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedNorma, setExpandedNorma] = useState(null);

  const [formData, setFormData] = useState({
    company_id: companyId,
    nombre: "",
    tipo: "politica",
    descripcion: "",
    contenido: "",
    version: "1.0"
  });

  useEffect(() => {
    if (companyId) {
      fetchNormas();
    }
  }, [companyId]);

  const fetchNormas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/normas-especificas/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNormas(response.data);
    } catch (error) {
      console.error("Error fetching normas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.contenido) {
      toast.error("Nombre y contenido son requeridos");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const payload = { ...formData, company_id: companyId };

      if (editingNorma) {
        await axios.put(`${API}/normas-especificas/${editingNorma.id}`, payload, { headers });
        toast.success("Documento actualizado exitosamente");
      } else {
        await axios.post(`${API}/normas-especificas`, payload, { headers });
        toast.success("Documento creado exitosamente");
      }

      setDialogOpen(false);
      resetForm();
      fetchNormas();
    } catch (error) {
      toast.error("Error al guardar documento");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (norma) => {
    setEditingNorma(norma);
    setFormData({
      company_id: companyId,
      nombre: norma.nombre,
      tipo: norma.tipo,
      descripcion: norma.descripcion,
      contenido: norma.contenido,
      version: norma.version || "1.0"
    });
    setDialogOpen(true);
  };

  const handleDelete = async (normaId) => {
    if (!window.confirm("¿Está seguro de eliminar este documento?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/normas-especificas/${normaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Documento eliminado");
      fetchNormas();
    } catch (error) {
      toast.error("Error al eliminar documento");
    }
  };

  const resetForm = () => {
    setEditingNorma(null);
    setFormData({
      company_id: companyId,
      nombre: "",
      tipo: "politica",
      descripcion: "",
      contenido: "",
      version: "1.0"
    });
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const getTipoLabel = (tipo) => {
    const found = TIPOS_DOCUMENTO.find(t => t.value === tipo);
    return found ? found.label : tipo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Documentos Internos
          </h3>
          <p className="text-sm text-gray-600">
            Políticas, reglamentos y manuales propios de su organización
          </p>
        </div>
        <Button onClick={openNewDialog} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Documento
        </Button>
      </div>

      {normas.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-3">No hay documentos internos registrados</p>
            <Button onClick={openNewDialog} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Agregar primer documento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {normas.map(norma => (
            <Card key={norma.id}>
              <CardHeader className="py-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <CardTitle className="text-base">{norma.nombre}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">{getTipoLabel(norma.tipo)}</Badge>
                        <Badge variant="outline">v{norma.version}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(norma)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(norma.id)} className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {norma.descripcion && (
                  <p className="text-sm text-gray-600 mb-2">{norma.descripcion}</p>
                )}
                <button
                  onClick={() => setExpandedNorma(expandedNorma === norma.id ? null : norma.id)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  {expandedNorma === norma.id ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Ocultar contenido
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Ver contenido
                    </>
                  )}
                </button>
                {expandedNorma === norma.id && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                      {norma.contenido}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNorma ? "Editar Documento" : "Nuevo Documento Interno"}
            </DialogTitle>
            <DialogDescription>
              Los documentos internos serán considerados por la IA al generar recomendaciones
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nombre">Nombre del Documento *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Política de SST"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="tipo">Tipo de Documento</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="version">Versión</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.0"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Breve descripción del documento"
                  rows={2}
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="contenido">Contenido del Documento *</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Pegue el texto del documento. La IA usará este contenido para verificar cumplimiento.
                </p>
                <Textarea
                  id="contenido"
                  value={formData.contenido}
                  onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                  placeholder="Contenido del documento..."
                  rows={10}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.contenido.length.toLocaleString()} caracteres
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <span className="flex items-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    <span>Guardando...</span>
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Save className="h-4 w-4 mr-2" />
                    <span>{editingNorma ? "Actualizar" : "Crear"}</span>
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NormasEspecificasManager;
