import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import GroupGuard from "@/components/shared/GroupGuard";
import { AppShell } from "@/components/layout/AppShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopBar } from "@/components/layout/TopBar";
import Auth from "@/pages/Auth";
import Setup from "@/pages/Setup";
import Dashboard from "@/pages/Dashboard";
import AddExpense from "@/pages/AddExpense";
import ExpenseHistory from "@/pages/ExpenseHistory";
import ExpenseDetail from "@/pages/ExpenseDetail";
import Members from "@/pages/Members";
import Invitations from "@/pages/Invitations";
import Settings from "@/pages/Settings";
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
            <GroupGuard>
              <AppShell>
                <TopBar />
                <main className="flex-1 px-4 py-4">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/add" element={<AddExpense />} />
                    <Route path="/edit/:id" element={<AddExpense />} />
                    <Route path="/expenses" element={<ExpenseHistory />} />
                    <Route path="/expenses/:id" element={<ExpenseDetail />} />
                    <Route path="/members" element={<Members />} />
                    <Route path="/invitations" element={<Invitations />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <BottomNav />
              </AppShell>
            </GroupGuard>
          }
        />
      </Route>
    </Routes>
  );
}
