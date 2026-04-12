import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import AccountDetailPage from "./pages/AccountDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/accounts/:id" element={<AccountDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
