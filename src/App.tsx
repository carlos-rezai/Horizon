import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import AccountDetailPage from "./pages/AccountDetailPage";
import PlanPage from "./pages/PlanPage";
import SettingsStoragePage from "./pages/SettingsStoragePage";

const Router =
  window.horizon?.platform === "electron" ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          }
        />
        <Route
          path="/accounts/:id"
          element={
            <AppLayout>
              <AccountDetailPage />
            </AppLayout>
          }
        />
        <Route
          path="/plan"
          element={
            <AppLayout>
              <PlanPage />
            </AppLayout>
          }
        />
        <Route
          path="/settings/storage"
          element={
            <AppLayout>
              <SettingsStoragePage />
            </AppLayout>
          }
        />
      </Routes>
    </Router>
  );
}
