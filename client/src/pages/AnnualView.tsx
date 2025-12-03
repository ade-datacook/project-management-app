import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff } from "lucide-react";
import * as XLSX from 'xlsx';

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const MONTHS_SHORT = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"
];

interface AnnualViewProps {
  onBackToWeekly: () => void;
}

export default function AnnualView({ onBackToWeekly }: AnnualViewProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showAllClients, setShowAllClients] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportType, setExportType] = useState<'client' | 'resource'>('client');
  const [exportPeriod, setExportPeriod] = useState<'annual' | 'monthly'>('annual');
  const [selectedMonth, setSelectedMonth] = useState<number>(1);

  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: resources = [] } = trpc.resources.list.useQuery();
  const { data: annualData = [] } = trpc.tasks.annualData.useQuery({ year: currentYear });
  const { data: annualDataByResource = [] } = trpc.tasks.annualDataByResource.useQuery({ year: currentYear });

  // Organize data by client and month
  const dataByClientAndMonth = useMemo(() => {
    const organized: Record<number, Record<number, number>> = {};
    
    annualData.forEach((item: any) => {
      if (!organized[item.clientId]) {
        organized[item.clientId] = {};
      }
      
      const month = item.month;
      if (month >= 1 && month <= 12) {
        if (!organized[item.clientId][month]) {
          organized[item.clientId][month] = 0;
        }
        organized[item.clientId][month] += item.totalWorkload / 2; // Convert to days
      }
    });
    
    return organized;
  }, [annualData]);

  // Calculate totals
  const monthlyTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    Object.values(dataByClientAndMonth).forEach((clientData) => {
      Object.entries(clientData).forEach(([month, workload]) => {
        const monthNum = parseInt(month);
        if (!totals[monthNum]) {
          totals[monthNum] = 0;
        }
        totals[monthNum] += workload;
      });
    });
    return totals;
  }, [dataByClientAndMonth]);

  const clientTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    Object.entries(dataByClientAndMonth).forEach(([clientId, clientData]) => {
      const clientIdNum = parseInt(clientId);
      totals[clientIdNum] = Object.values(clientData).reduce((sum, val) => sum + val, 0);
    });
    return totals;
  }, [dataByClientAndMonth]);

  const grandTotal = useMemo(() => {
    return Object.values(clientTotals).reduce((sum, val) => sum + val, 0);
  }, [clientTotals]);

  // Sort clients alphabetically and filter those with total > 0 (unless showAllClients is true)
  const sortedClients = useMemo(() => {
    return [...clients]
      .filter(client => showAllClients || (clientTotals[client.id] || 0) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, clientTotals, showAllClients]);

  // Handle export with options
  const handleExport = () => {
    setShowExportDialog(false);
    
    if (exportPeriod === 'annual') {
      exportAnnual();
    } else {
      exportMonthly();
    }
  };

  // Export annual aggregated data
  const exportAnnual = () => {
    // Sheet 1: Par Client
    const clientSheetData = [
      ['Client', ...MONTHS, 'Total'],
      ...sortedClients.map(client => [
        client.name,
        ...MONTHS.map((_, monthIndex) => {
          const monthNum = monthIndex + 1;
          return dataByClientAndMonth[client.id]?.[monthNum]?.toFixed(1) || '0.0';
        }),
        clientTotals[client.id]?.toFixed(1) || '0.0'
      ]),
      ['TOTAL', ...MONTHS.map((_, monthIndex) => {
        const monthNum = monthIndex + 1;
        return (monthlyTotals[monthNum] || 0).toFixed(1);
      }), grandTotal.toFixed(1)]
    ];

    // Sheet 2: Par Data Scientist
    const dsSheetData = [
      ['Data Scientist', ...MONTHS.map(m => `${m} Réel`), ...MONTHS.map(m => `${m} Estimé`), 'Total Réel', 'Total Estimé', 'Écart'],
      ...resources.map(resource => {
        const realByMonth: Record<number, number> = {};
        const estimatedByMonth: Record<number, number> = {};
        
        annualDataByResource.forEach((item: any) => {
          if (item.resourceId === resource.id) {
            realByMonth[item.month] = (item.totalWorkload || 0) / 2;
            estimatedByMonth[item.month] = item.totalEstimated || 0;
          }
        });
        
        const totalReal = Object.values(realByMonth).reduce((sum, val) => sum + val, 0);
        const totalEstimated = Object.values(estimatedByMonth).reduce((sum, val) => sum + val, 0);
        const variance = totalReal - totalEstimated;
        
        return [
          resource.name,
          ...MONTHS.map((_, monthIndex) => {
            const monthNum = monthIndex + 1;
            return (realByMonth[monthNum] || 0).toFixed(1);
          }),
          ...MONTHS.map((_, monthIndex) => {
            const monthNum = monthIndex + 1;
            return (estimatedByMonth[monthNum] || 0).toFixed(1);
          }),
          totalReal.toFixed(1),
          totalEstimated.toFixed(1),
          variance.toFixed(1)
        ];
      })
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    if (exportType === 'client') {
      const wsClient = XLSX.utils.aoa_to_sheet(clientSheetData);
      XLSX.utils.book_append_sheet(wb, wsClient, 'Par Client');
    } else {
      const wsDS = XLSX.utils.aoa_to_sheet(dsSheetData);
      XLSX.utils.book_append_sheet(wb, wsDS, 'Par Data Scientist');
    }
    
    // Download
    XLSX.writeFile(wb, `Rapport_Annuel_${currentYear}_${exportType === 'client' ? 'Clients' : 'DataScientists'}.xlsx`);
  };

  // Export monthly detailed data
  const exportMonthly = () => {
    // TODO: Implement monthly detailed export with all tasks
    alert(`Export mensuel détaillé pour ${MONTHS[selectedMonth - 1]} ${currentYear} - À implémenter`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Header */}
      <div className="sticky-header p-4 border-b">
        <div className="container">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentYear(currentYear - 1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="text-xl font-semibold">Année {currentYear}</span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentYear(currentYear + 1)}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowAllClients(!showAllClients)} 
                variant="outline"
                title={showAllClients ? "Masquer les clients vides" : "Afficher tous les clients"}
              >
                {showAllClients ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showAllClients ? "Masquer clients vides" : "Tous les clients"}
              </Button>
              <Button onClick={() => setShowExportDialog(true)} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter Excel
              </Button>
              <Button onClick={onBackToWeekly} variant="outline">
                ← Vue Hebdomadaire
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Annual Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="container">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2 text-left font-semibold sticky left-0 bg-muted z-10">
                    Client
                  </th>
                  {MONTHS.map((month, index) => (
                    <th key={index} className="border p-2 text-center font-semibold min-w-[80px]">
                      {month}
                    </th>
                  ))}
                  <th className="border p-2 text-center font-semibold bg-primary/10">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/50">
                    <td className="border p-2 font-medium sticky left-0 bg-background z-10">
                      {client.name}
                    </td>
                    {MONTHS.map((_, monthIndex) => {
                      const month = monthIndex + 1;
                      const value = dataByClientAndMonth[client.id]?.[month] || 0;
                      return (
                        <td key={monthIndex} className="border p-2 text-center">
                          {value > 0 ? value.toFixed(1) : ""}
                        </td>
                      );
                    })}
                    <td className="border p-2 text-center font-semibold bg-primary/10">
                      {(clientTotals[client.id] || 0).toFixed(1)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-primary/20 font-bold">
                  <td className="border p-2 sticky left-0 bg-primary/20 z-10">Total</td>
                  {MONTHS.map((_, monthIndex) => {
                    const month = monthIndex + 1;
                    const value = monthlyTotals[month] || 0;
                    return (
                      <td key={monthIndex} className="border p-2 text-center">
                        {value > 0 ? value.toFixed(1) : ""}
                      </td>
                    );
                  })}
                  <td className="border p-2 text-center bg-primary/30">
                    {grandTotal.toFixed(1)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Data Scientist View */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Vue par Data Scientist (Estimation vs Réel)</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-left font-semibold sticky left-0 bg-muted z-10">
                      Data Scientist
                    </th>
                    {MONTHS_SHORT.map((month, index) => (
                      <th key={index} className="border p-2 text-center font-semibold min-w-[70px]">
                        {month}
                      </th>
                    ))}
                    <th className="border p-2 text-center font-semibold bg-primary/10">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resources
                    .filter(r => ["Baptiste", "Lucas", "Victor"].includes(r.name))
                    .map((resource) => {
                      // Calculate data for this resource
                      const resourceData: Record<number, { actual: number; estimated: number }> = {};
                      
                      annualDataByResource.forEach((item: any) => {
                        if (item.resourceId === resource.id) {
                          const month = item.month;
                          if (month >= 1 && month <= 12) {
                            if (!resourceData[month]) {
                              resourceData[month] = { actual: 0, estimated: 0 };
                            }
                            resourceData[month].actual += item.totalWorkload / 2; // Convert to days
                            resourceData[month].estimated += item.totalEstimated;
                          }
                        }
                      });

                      const totalActual = Object.values(resourceData).reduce((sum, val) => sum + val.actual, 0);
                      const totalEstimated = Object.values(resourceData).reduce((sum, val) => sum + val.estimated, 0);

                      return (
                        <tr key={resource.id} className="hover:bg-muted/50">
                          <td className="border p-2 font-medium sticky left-0 bg-background z-10">
                            {resource.name}
                          </td>
                          {MONTHS.map((_, monthIndex) => {
                            const month = monthIndex + 1;
                            const data = resourceData[month];
                            return (
                              <td key={monthIndex} className="border p-2 text-center text-sm">
                                {data ? (
                                  <div>
                                    <div className="text-green-700 font-semibold">{data.actual.toFixed(1)}j</div>
                                    <div className="text-blue-600 text-xs">Est: {data.estimated.toFixed(1)}j</div>
                                  </div>
                                ) : (
                                  ""
                                )}
                              </td>
                            );
                          })}
                          <td className="border p-2 text-center font-semibold bg-primary/10">
                            <div className="text-green-700">{totalActual.toFixed(1)}j</div>
                            <div className="text-blue-600 text-xs">Est: {totalEstimated.toFixed(1)}j</div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Options d'export Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type d'export</label>
              <Select value={exportType} onValueChange={(value: 'client' | 'resource') => setExportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Par Client</SelectItem>
                  <SelectItem value="resource">Par Data Scientist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Période</label>
              <Select value={exportPeriod} onValueChange={(value: 'annual' | 'monthly') => setExportPeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Année entière (agrégé)</SelectItem>
                  <SelectItem value="monthly">Mois spécifique (détaillé)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {exportPeriod === 'monthly' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Mois</label>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
