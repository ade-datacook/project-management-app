import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ClientsManagement from "./pages/ClientsManagement";

import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />

      {/* Protected Routes */}
      <Route path="/">
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      </Route>

      <Route path="/clients">
        <ProtectedRoute>
          <ClientsManagement />
        </ProtectedRoute>
      </Route>

      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

import { UndoRedoProvider } from "./contexts/UndoRedoContext";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      // switchable
      >
        <TooltipProvider>
          <UndoRedoProvider>
            <Toaster />
            <Router />
          </UndoRedoProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
