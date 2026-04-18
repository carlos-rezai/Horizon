import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import AccountDetailPage from "./pages/AccountDetailPage";
import PlanPage from "./pages/PlanPage";

export default function App() {
  return (
    <BrowserRouter>
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
      </Routes>
    </BrowserRouter>
  );
}
