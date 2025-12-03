import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus } from "lucide-react";
import { useLocation } from "wouter";

export default function ClientsManagement() {
  const [, setLocation] = useLocation();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientColor, setNewClientColor] = useState("#808080");

  const toggleActive = trpc.clients.toggleActive.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
    },
  });

  const updateColor = trpc.clients.updateColor.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
    },
  });

  const createClient = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setShowAddDialog(false);
      setNewClientName("");
      setNewClientColor("#808080");
    },
  });

  const handleCreateClient = () => {
    if (newClientName.trim()) {
      createClient.mutate({
        name: newClientName.trim(),
        color: newClientColor,
      });
    }
  };

  const sortedClients = [...clients].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au tableau de bord
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gestion des Clients</h1>
              <p className="text-gray-600 mt-2">
                Activez ou désactivez les clients pour les afficher ou les masquer du tableau de bord
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Client
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-4 text-left font-semibold">Client</th>
                <th className="px-6 py-4 text-center font-semibold w-32">Couleur</th>
                <th className="px-6 py-4 text-center font-semibold w-32">Statut</th>
              </tr>
            </thead>
            <tbody>
              {sortedClients.map((client) => (
                <tr key={client.id} className="border-b hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium">{client.name}</td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="color"
                      value={client.color}
                      onChange={(e) => {
                        updateColor.mutate({
                          id: client.id,
                          color: e.target.value,
                        });
                      }}
                      className="w-8 h-8 rounded mx-auto cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-sm text-gray-600">
                        {client.isActive !== false ? "Actif" : "Inactif"}
                      </span>
                      <Switch
                        checked={client.isActive !== false}
                        onCheckedChange={(checked) => {
                          toggleActive.mutate({
                            id: client.id,
                            isActive: checked,
                          });
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Client Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un nouveau client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Nom du client</Label>
                <Input
                  id="client-name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Nom du client"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateClient();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-color">Couleur</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="client-color"
                    type="color"
                    value={newClientColor}
                    onChange={(e) => setNewClientColor(e.target.value)}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">{newClientColor}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateClient} disabled={!newClientName.trim()}>
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
