import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

const InspectionCharts = ({ inspection, standards, historicalData = [] }) => {
  // Calculate phase statistics
  const calculatePhaseStats = () => {
    const phases = {};
    
    inspection.responses.forEach(resp => {
      const standard = standards.find(s => s.id === resp.standard_id);
      if (standard) {
        const phase = standard.category.split(' - ')[0];
        if (!phases[phase]) {
          phases[phase] = { total: 0, obtained: 0, name: phase };
        }
        phases[phase].total += standard.weight;
        phases[phase].obtained += resp.score;
      }
    });

    return Object.values(phases).map(phase => ({
      name: phase.name.replace('I. ', '').replace('II. ', '').replace('III. ', '').replace('IV. ', ''),
      percentage: ((phase.obtained / phase.total) * 100).toFixed(1),
      value: parseFloat(((phase.obtained / phase.total) * 100).toFixed(1))
    }));
  };

  // Calculate response distribution
  const calculateResponseDistribution = () => {
    const distribution = {
      cumple: 0,
      cumple_parcial: 0,
      no_cumple: 0
    };

    inspection.responses.forEach(resp => {
      distribution[resp.response]++;
    });

    return [
      { name: 'Cumple', value: distribution.cumple, fill: '#22c55e' },
      { name: 'Cumple Parcial', value: distribution.cumple_parcial, fill: '#eab308' },
      { name: 'No Cumple', value: distribution.no_cumple, fill: '#ef4444' }
    ];
  };

  // Calculate category breakdown
  const calculateCategoryBreakdown = () => {
    const categories = {};
    
    inspection.responses.forEach(resp => {
      const standard = standards.find(s => s.id === resp.standard_id);
      if (standard) {
        const category = standard.category;
        if (!categories[category]) {
          categories[category] = { total: 0, obtained: 0, count: 0 };
        }
        categories[category].total += standard.weight;
        categories[category].obtained += resp.score;
        categories[category].count++;
      }
    });

    return Object.entries(categories)
      .map(([name, data]) => ({
        name: name.split(' - ')[1] || name,
        percentage: ((data.obtained / data.total) * 100).toFixed(1),
        value: parseFloat(((data.obtained / data.total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 categories
  };

  // Prepare historical comparison data
  const prepareHistoricalData = () => {
    if (!historicalData || historicalData.length === 0) return [];
    
    return historicalData.map((insp, index) => ({
      name: `Insp. ${index + 1}`,
      fecha: new Date(insp.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      puntaje: parseFloat(insp.total_score.toFixed(1))
    }));
  };

  const phaseData = calculatePhaseStats();
  const responseData = calculateResponseDistribution();
  const categoryData = calculateCategoryBreakdown();
  const historicalChartData = prepareHistoricalData();

  const getScoreColor = (score) => {
    if (score >= 85) return '#22c55e';
    if (score >= 60) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="space-y-6" data-testid="inspection-charts">
      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Puntaje Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: getScoreColor(inspection.total_score) }}>
              {inspection.total_score.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Cumple</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{responseData[0].value}</div>
            <div className="text-xs text-green-600">de {inspection.responses.length} estándares</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Cumple Parcial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-900">{responseData[1].value}</div>
            <div className="text-xs text-yellow-600">requieren mejora</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800">No Cumple</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900">{responseData[2].value}</div>
            <div className="text-xs text-red-600">críticos</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Radar + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart - Phase Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis por Fases PHVA</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={phaseData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Cumplimiento" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Tooltip formatter={(value) => `${value}%`} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {phaseData.map((phase, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-gray-600">{phase.name}:</span>
                  <span className="font-semibold" style={{ color: getScoreColor(parseFloat(phase.percentage)) }}>
                    {phase.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart - Response Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Respuestas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={responseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {responseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-around text-sm">
              {responseData.map((item, index) => (
                <div key={index} className="text-center">
                  <div className="font-bold text-2xl" style={{ color: item.fill }}>{item.value}</div>
                  <div className="text-gray-600">{item.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Categorías - Nivel de Cumplimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" width={200} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getScoreColor(entry.value)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Historical Comparison */}
      {historicalChartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Progreso Histórico de Inspecciones</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="puntaje" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 6 }}
                  name="Puntaje"
                />
              </LineChart>
            </ResponsiveContainer>
            {historicalChartData.length >= 2 && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-900">Tendencia:</span>
                  {(() => {
                    const first = historicalChartData[0].puntaje;
                    const last = historicalChartData[historicalChartData.length - 1].puntaje;
                    const diff = last - first;
                    return (
                      <span className={`text-lg font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {diff >= 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}%
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InspectionCharts;