import { HashRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout/AppLayout";
import {
  DashboardPage,
  AccountDetailPage,
  PlanPage,
  SettingsStoragePage,
  MonthPage,
  ImportPage,
  HistoryPage,
} from "./pages";

export default function App() {
  return (
    <HashRouter>
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
  );
}
