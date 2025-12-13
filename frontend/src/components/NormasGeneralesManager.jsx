import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { 
  BookOpen, Plus, Edit3, Trash2, Save, X, Search,
  Scale, Building2, Leaf, Users, FileText, ChevronDown, ChevronUp
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIAS = [
  { value: "SST", label: "Seguridad y Salud en el Trabajo", icon: Scale },
  { value: "Laboral", label: "Derecho Laboral", icon: Users },
  { value: "Calidad", label: "Gestión de Calidad", icon: FileText },
  { value: "Medio_Ambiente", label: "Medio Ambiente", icon: Leaf },
  { value: "General", label: "Normativa General", icon: Building2 },
];

const NormasGeneralesManager = () => {
  const [normas, setNormas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNorma, setEditingNorma] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [expandedNorma, setExpandedNorma] = useState(null);

  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "SST",
    descripcion: "",
    contenido: "",
    fecha_expedicion: "",
    entidad_emisora: ""
  });

  useEffect(() => {
    fetchNormas();
  }, []);

  const fetchNormas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/normas-generales/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNormas(response.data);
    } catch (error) {
      toast.error("Error al cargar normas");
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

      if (editingNorma) {
        await axios.put(`${API}/normas-generales/${editingNorma.id}`, formData, { headers });
        toast.success("Norma actualizada exitosamente");
      } else {
        await axios.post(`${API}/normas-generales`, formData, { headers });
        toast.success("Norma creada exitosamente");
      }

      setDialogOpen(false);
      resetForm();
      fetchNormas();
    } catch (error) {
      toast.error("Error al guardar norma");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (norma) => {
    setEditingNorma(norma);
    setFormData({
      nombre: norma.nombre,
      categoria: norma.categoria,
      descripcion: norma.descripcion,
      contenido: norma.contenido,
      fecha_expedicion: norma.fecha_expedicion || "",
      entidad_emisora: norma.entidad_emisora || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (normaId) => {
    if (!window.confirm("¿Está seguro de desactivar esta norma?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/normas-generales/${normaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Norma desactivada");
      fetchNormas();
    } catch (error) {
      toast.error("Error al desactivar norma");
    }
  };

  const resetForm = () => {
    setEditingNorma(null);
    setFormData({
      nombre: "",
      categoria: "SST",
      descripcion: "",
      contenido: "",
      fecha_expedicion: "",
      entidad_emisora: ""
    });
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const filteredNormas = normas.filter(norma => {
    const matchesSearch = norma.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         norma.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = filterCategoria === "all" || norma.categoria === filterCategoria;
    return matchesSearch && matchesCategoria;
  });

  const getCategoriaIcon = (categoria) => {
    const cat = CATEGORIAS.find(c => c.value === categoria);
    return cat ? cat.icon : BookOpen;
  };

  const getCategoriaLabel = (categoria) => {
    const cat = CATEGORIAS.find(c => c.value === categoria);
    return cat ? cat.label : categoria;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-purple-600" />
            Repositorio Normativo General
          </h2>
          <p className="text-gray-600 mt-1">
            Normas que aplican a todas las empresas - Entrenan el cerebro central de la IA
          </p>
        </div>
        <Button onClick={openNewDialog} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Norma
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar normas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORIAS.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Normas */}
      <div className="space-y-4">
        {filteredNormas.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay normas registradas</p>
              <Button onClick={openNewDialog} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Agregar primera norma
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredNormas.map(norma => {
            const Icon = getCategoriaIcon(norma.categoria);
            return (
              <Card key={norma.id} className={`transition-all ${!norma.vigente ? 'opacity-60 bg-gray-50' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${norma.vigente ? 'bg-purple-100' : 'bg-gray-200'}`}>
                        <Icon className={`h-5 w-5 ${norma.vigente ? 'text-purple-600' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{norma.nombre}</CardTitle>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="secondary">{getCategoriaLabel(norma.categoria)}</Badge>
                          {norma.entidad_emisora && (
                            <Badge variant="outline">{norma.entidad_emisora}</Badge>
                          )}
                          {!norma.vigente && (
                            <Badge variant="destructive">Desactivada</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(norma)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {norma.vigente && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(norma.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-3">{norma.descripcion}</p>
                  
                  <button
                    onClick={() => setExpandedNorma(expandedNorma === norma.id ? null : norma.id)}
                    className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                  >
                    {expandedNorma === norma.id ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Ocultar contenido
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Ver contenido completo ({norma.contenido.length.toLocaleString()} caracteres)
                      </>
                    )}
                  </button>
                  
                  {expandedNorma === norma.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                        {norma.contenido}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog para crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNorma ? "Editar Norma General" : "Nueva Norma General"}
            </DialogTitle>
            <DialogDescription>
              Las normas generales entrenan el cerebro central de la IA y aplican a todas las empresas
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nombre">Nombre de la Norma *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Resolución 0312 de 2019"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="categoria">Categoría *</Label>
                <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="entidad">Entidad Emisora</Label>
                <Input
                  id="entidad"
                  value={formData.entidad_emisora}
                  onChange={(e) => setFormData({ ...formData, entidad_emisora: e.target.value })}
                  placeholder="Ej: Ministerio del Trabajo"
                />
              </div>
              
              <div>
                <Label htmlFor="fecha">Fecha de Expedición</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha_expedicion}
                  onChange={(e) => setFormData({ ...formData, fecha_expedicion: e.target.value })}
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="descripcion">Descripción Breve</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción resumida de la norma"
                  rows={2}
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="contenido">Contenido de la Norma *</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Pegue aquí el texto completo o resumen de la norma. Este contenido será usado por la IA para generar recomendaciones.
                </p>
                <Textarea
                  id="contenido"
                  value={formData.contenido}
                  onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                  placeholder="Artículo 1. ...&#10;Artículo 2. ...&#10;..."
                  rows={15}
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
              <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingNorma ? "Actualizar" : "Crear"} Norma
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NormasGeneralesManager;
