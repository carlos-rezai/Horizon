import { HashRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout/AppLayout";
import CacheProvider from "./components/CacheProvider/CacheProvider";
import { useMenuNavigation } from "./features/menu/useMenuNavigation";
import {
  DashboardPage,
  AccountDetailPage,
  PlanPage,
  SettingsStoragePage,
  MonthPage,
  ImportPage,
  HistoryPage,
} from "./pages";

function MenuNavigationListener() {
  useMenuNavigation();
  return null;
}

export default function App() {
  return (
    // Above the router on purpose: cached resources must survive navigation.
    <CacheProvider>
      <HashRouter>
        <MenuNavigationListener />
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
          <Route
            path="/months/:month"
            element={
              <AppLayout>
                <MonthPage />
              </AppLayout>
            }
          />
          <Route
            path="/history"
            element={
              <AppLayout>
                <HistoryPage />
              </AppLayout>
            }
          />
          <Route
            path="/import"
            element={
              <AppLayout>
                <ImportPage />
              </AppLayout>
            }
          />
        </Routes>
      </HashRouter>
    </CacheProvider>
  );
}
