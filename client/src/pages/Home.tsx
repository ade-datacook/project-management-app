import { useState, useEffect, useRef } from "react"; // Ajout de useRef
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, MessageSquare, Trash2, Plus, Calendar as CalendarIcon, ChevronUp, ChevronDown, Settings, Undo2, Redo2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import AnnualView from "./AnnualView";
import { useUndoRedo } from "@/contexts/UndoRedoContext";

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default function Home() {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const now = new Date();
    return {
      weekNumber: getWeekNumber(now),
      year: now.getFullYear(),
    };
  });

  const [viewMode, setViewMode] = useState<"weekly" | "annual">("weekly");
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [estimatedDays, setEstimatedDays] = useState<number>(0);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);

  // Ce ref permet de savoir si nous sommes en train d'exécuter un Undo/Redo
  // pour NE PAS enregistrer cette action dans l'historique
  const isRestoring = useRef(false);

  const utils = trpc.useUtils();
  const { canUndo, canRedo, undo, redo, recordAction } = useUndoRedo();

  const { data: tasks = [] } = trpc.tasks.listByWeek.useQuery({
    weekNumber: currentWeek.weekNumber,
    year: currentWeek.year,
  });

  const { data: resources = [] } = trpc.resources.list.useQuery();
  const { data: allClients = [] } = trpc.clients.list.useQuery();
  const { data: totalsArray = [] } = trpc.tasks.weeklyTotals.useQuery({
    weekNumber: currentWeek.weekNumber,
    year: currentWeek.year,
  });

  const clients = allClients.filter((c: any) => c.isActive !== false);
  const displayedResources = resources.filter(r => 
    ["Baptiste", "Lucas", "Victor"].includes(r.name)
  );

  const totalsByResource = (totalsArray as Array<{ resourceId: number; totalWorkload: number }>).reduce(
    (acc, item) => {
      acc[item.resourceId] = item.totalWorkload;
      return acc;
    },
    {} as Record<number, number>
  );

  // --- MUTATIONS ---

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: async (result, variables) => {
      // Invalidation immédiate pour mise à jour UI
      await utils.tasks.listByWeek.invalidate();
      await utils.tasks.weeklyTotals.invalidate();
      
      // IMPORTANT: On n'enregistre l'action que si ce n'est PAS un undo/redo
      // On utilise 'result' directement (l'objet créé par le serveur), plus fiable que de refetcher
      if (!isRestoring.current && result) {
        recordAction({
          type: 'create',
          taskId: result.id, // ID renvoyé par le back
          newState: variables,
          timestamp: Date.now(),
        });
      }
    },
  });

  const updateTask = trpc.tasks.update.useMutation({
    onMutate: async (variables) => {
      // On n'enregistre pas l'historique si on est en train de restaurer
      if (isRestoring.current) return;

      const task = tasks.find(t => t.id === variables.id);
      if (task) {
        recordAction({
          type: 'update',
          taskId: variables.id,
          previousState: task,
          newState: variables,
          timestamp: Date.now(),
        });
      }
    },
    onSuccess: () => {
      utils.tasks.listByWeek.invalidate();
      utils.tasks.weeklyTotals.invalidate();
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onMutate: async (variables) => {
      if (isRestoring.current) return;

      const task = tasks.find(t => t.id === variables.id);
      if (task) {
        recordAction({
          type: 'delete',
          taskId: variables.id,
          previousState: task,
          timestamp: Date.now(),
        });
      }
    },
    onSuccess: () => {
      utils.tasks.listByWeek.invalidate();
      utils.tasks.weeklyTotals.invalidate();
    },
  });

  // --- UNDO / REDO LISTENERS ---

  useEffect(() => {
    const handleUndoEvent = (e: any) => {
      if (!e.detail) return;
      
      const action = e.detail;
      console.log('[Home] Undoing:', action.type);
      
      // On active le drapeau pour bloquer recordAction
      isRestoring.current = true;

      const options = {
        // Une fois la mutation terminée (succès ou erreur), on désactive le drapeau
        onSettled: () => { isRestoring.current = false; }
      };
      
      if (action.type === 'create' && action.taskId) {
        // Annuler une création = Supprimer
        deleteTask.mutate({ id: action.taskId }, options);
      } else if (action.type === 'delete' && action.previousState) {
        // Annuler une suppression = Recréer
        // Note: L'ID changera probablement, le backend assignera un nouvel ID
        const { id, ...taskData } = action.previousState; // On retire l'ancien ID pour laisser le back gérer
        createTask.mutate(taskData, options);
      } else if (action.type === 'update' && action.previousState) {
        // Annuler une modif = Remettre l'état précédent
        updateTask.mutate(action.previousState, options);
      } else {
        // Si aucune action ne matche, on reset le flag manuellement
        isRestoring.current = false;
      }
    };

    const handleRedoEvent = (e: any) => {
      if (!e.detail) return;
      
      const action = e.detail;
      console.log('[Home] Redoing:', action.type);
      
      isRestoring.current = true;
      const options = {
        onSettled: () => { isRestoring.current = false; }
      };
      
      if (action.type === 'create' && action.newState) {
        createTask.mutate(action.newState, options);
      } else if (action.type === 'delete' && action.taskId) {
        deleteTask.mutate({ id: action.taskId }, options);
      } else if (action.type === 'update' && action.newState) {
        updateTask.mutate(action.newState, options);
      } else {
        isRestoring.current = false;
      }
    };

    window.addEventListener('undo-action', handleUndoEvent);
    window.addEventListener('redo-action', handleRedoEvent);

    return () => {
      window.removeEventListener('undo-action', handleUndoEvent);
      window.removeEventListener('redo-action', handleRedoEvent);
    };
  }, [createTask, updateTask, deleteTask]); // Dépendances stables

  // --- RESTE DU CODE ---

  const formatWeek = (weekNumber: number) => `S${weekNumber}`;

  const handlePreviousWeek = () => {
    if (currentWeek.weekNumber > 1) {
      setCurrentWeek({ ...currentWeek, weekNumber: currentWeek.weekNumber - 1 });
    } else {
      setCurrentWeek({ weekNumber: 52, year: currentWeek.year - 1 });
    }
  };

  const handleNextWeek = () => {
    if (currentWeek.weekNumber < 52) {
      setCurrentWeek({ ...currentWeek, weekNumber: currentWeek.weekNumber + 1 });
    } else {
      setCurrentWeek({ weekNumber: 1, year: currentWeek.year + 1 });
    }
  };

  const resetWeek = trpc.tasks.resetWeek.useMutation({
    onSuccess: () => {
      utils.tasks.listByWeek.invalidate();
      utils.tasks.weeklyTotals.invalidate();
    },
  });

  const handleResetWeek = () => {
    let previousWeek = currentWeek.weekNumber - 1;
    let previousYear = currentWeek.year;
    
    if (previousWeek < 1) {
      previousWeek = 52;
      previousYear = currentWeek.year - 1;
    }

    resetWeek.mutate({
      fromWeek: previousWeek,
      fromYear: previousYear,
      toWeek: currentWeek.weekNumber,
      toYear: currentWeek.year,
    });
  };

  const handleAddTask = () => {
    if (resources.length === 0 || clients.length === 0 || !selectedClient) return;
    createTask.mutate({
      name: "Nouvelle tâche",
      notes: "",
      resourceId: resources[0].id,
      clientId: selectedClient,
      workload: 0,
      taskType: "oneshot",
      estimatedDays: estimatedDays,
      weekNumber: currentWeek.weekNumber,
      year: currentWeek.year,
    });
    setShowAddTaskDialog(false);
    setEstimatedDays(0);
    setSelectedClient(null);
  };

  if (viewMode === "annual") {
    return <AnnualView onBackToWeekly={() => setViewMode("weekly")} />;
  }

  const tasksByClient = tasks.reduce((acc, task) => {
    if (!acc[task.clientId]) {
      acc[task.clientId] = [];
    }
    acc[task.clientId].push(task);
    return acc;
  }, {} as Record<number, typeof tasks>);

  const sortedClients = [...clients].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handlePreviousWeek}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-xl font-semibold">{formatWeek(currentWeek.weekNumber)}</span>
                <Button variant="ghost" size="icon" onClick={handleNextWeek}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={undo} 
                  variant="ghost" 
                  size="icon"
                  disabled={!canUndo}
                  title="Annuler (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={redo} 
                  variant="ghost" 
                  size="icon"
                  disabled={!canRedo}
                  title="Rétablir (Ctrl+Y)"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={() => {
                    if (tasks.length > 0) {
                      if (confirm(`Cette semaine contient déjà ${tasks.length} tâche(s). Voulez-vous vraiment dupliquer la semaine précédente ?`)) {
                        handleResetWeek();
                      }
                    } else {
                      handleResetWeek();
                    }
                  }} 
                  variant="secondary" 
                  disabled={resetWeek.isPending}
                >
                  {resetWeek.isPending ? "Duplication..." : "Dupliquer semaine précédente"}
                </Button>
                <Button onClick={() => window.location.href = "/clients"} variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Gérer les clients
                </Button>
                <Button onClick={() => setViewMode("annual")} variant="outline">
                  Vue Annuelle →
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto pb-32">
          <div className="container py-6 space-y-6">
            {sortedClients.map((client) => {
              const clientTasks = tasksByClient[client.id] || [];
              return (
                <div key={client.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div 
                    className="px-6 py-3 font-bold text-white text-lg"
                    style={{ 
                      backgroundColor: client.color,
                      borderLeft: `4px solid ${client.color}`
                    }}
                  >
                    {client.name}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-white border-b-2 text-xs uppercase text-gray-700 font-semibold">
                          <th className="px-4 py-3 text-left w-12">Done</th>
                          <th className="px-4 py-3 text-left">Livrable</th>
                          <th className="px-4 py-3 text-left w-40">Assignation</th>
                          <th className="px-4 py-3 text-center w-32">Due Date</th>
                          <th className="px-4 py-3 text-center w-40">Temps(j)</th>
                          <th className="px-4 py-3 text-center w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            resources={resources}
                            onUpdate={(updates) => updateTask.mutate({ id: task.id, ...updates })}
                            onDelete={() => deleteTask.mutate({ id: task.id })}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-3 bg-gray-50 border-t">
                    <Button 
                      onClick={() => {
                        setSelectedClient(client.id);
                        setShowAddTaskDialog(true);
                      }} 
                      variant="ghost" 
                      size="sm"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter élément
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
          <div className="container py-4">
            <div className="flex items-center justify-around gap-4">
              {displayedResources.map((resource) => {
                const total = totalsByResource[resource.id] || 0;
                const totalDays = typeof total === 'number' && !isNaN(total) ? total / 2 : 0;
                return (
                  <div key={resource.id} className="flex flex-col items-center gap-2">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                      style={{ backgroundColor: resource.color }}
                    >
                      {resource.name.charAt(0)}
                    </div>
                    <div className="text-sm font-medium">{resource.name}</div>
                    <div className="text-lg font-bold">{totalDays.toFixed(1)}j</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une tâche</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Estimation initiale (jours)</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={estimatedDays}
                onChange={(e) => setEstimatedDays(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 2.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTaskDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddTask}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ... Le reste du fichier (TaskRow, interface) reste inchangé
interface TaskRowProps {
  task: any;
  resources: any[];
  onUpdate: (updates: any) => void;
  onDelete: () => void;
}

function TaskRow({ task, resources, onUpdate, onDelete }: TaskRowProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(task.notes || "");
  const [taskName, setTaskName] = useState(task.name);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (taskName !== task.name) {
        onUpdate({ name: taskName });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [taskName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes !== task.notes) {
        onUpdate({ notes });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [notes]);

  const assignedResource = resources.find(r => r.id === task.resourceId);
  const workloadDays = (task.workload || 0) / 2;

  const handleIncrement = () => {
    onUpdate({ workload: (task.workload || 0) + 1 });
  };

  const handleDecrement = () => {
    if (task.workload > 0) {
      onUpdate({ workload: task.workload - 1 });
    }
  };

  return (
    <tr className="border-b hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-3">
        <Checkbox
          checked={task.isCompleted}
          onCheckedChange={(checked) => onUpdate({ isCompleted: checked })}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            placeholder="Nom de la tâche"
          />
          <Popover open={showNotes} onOpenChange={setShowNotes}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes..."
                rows={4}
              />
            </PopoverContent>
          </Popover>
        </div>
      </td>
      <td className="px-4 py-3">
        <div 
          className="px-3 py-2 rounded-full text-sm font-medium text-center text-white"
          style={{ 
            backgroundColor: assignedResource?.color || '#808080'
          }}
        >
          <Select
            value={task.resourceId.toString()}
            onValueChange={(value) => onUpdate({ resourceId: parseInt(value) })}
          >
            <SelectTrigger className="border-0 bg-transparent h-auto p-0 focus:ring-0 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {resources.map((resource) => (
                <SelectItem key={resource.id} value={resource.id.toString()}>
                  {resource.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-28">
              <CalendarIcon className="mr-1 h-3 w-3" />
              {task.deadline ? format(new Date(task.deadline), "dd MMM", { locale: fr }) : "Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={task.deadline ? new Date(task.deadline) : undefined}
              onSelect={(date) => onUpdate({ deadline: date })}
              locale={fr}
            />
          </PopoverContent>
        </Popover>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col items-center gap-2">
          <div className="text-2xl font-bold">{workloadDays.toFixed(1)}</div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleDecrement}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Badge 
              variant={task.taskType === "recurring" ? "default" : "secondary"}
              className="w-8"
            >
              {task.taskType === "recurring" ? "R" : "OS"}
            </Badge>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleIncrement}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}