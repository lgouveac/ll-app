import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopBar } from "@/components/layout/TopBar";
import Auth from "@/pages/Auth";
import Setup from "@/pages/Setup";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import AddExpense from "@/pages/AddExpense";
import ExpenseHistory from "@/pages/ExpenseHistory";
import ExpenseDetail from "@/pages/ExpenseDetail";
import Members from "@/pages/Members";
import Invitations from "@/pages/Invitations";
import Settings from "@/pages/Settings";
import AccountSettings from "@/pages/AccountSettings";
import Tips from "@/pages/Tips";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/setup" element={<Setup />} />
        <Route
          path="/*"
          element={
            <AppShell>
              <TopBar />
              <main className="flex-1 px-4 py-4">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/group/:id" element={<Dashboard />} />
                  <Route path="/add" element={<AddExpense />} />
                  <Route path="/edit/:id" element={<AddExpense />} />
                  <Route path="/expenses" element={<ExpenseHistory />} />
                  <Route path="/expenses/:id" element={<ExpenseDetail />} />
                  <Route path="/tips" element={<Tips />} />
                  <Route path="/members" element={<Members />} />
                  <Route path="/invitations" element={<Invitations />} />
                  <Route path="/account" element={<AccountSettings />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <BottomNav />
            </AppShell>
          }
        />
      </Route>
    </Routes>
  );
}
