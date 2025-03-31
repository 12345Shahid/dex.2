import { Toaster } from "@/components/ui/toaster";
import { Switch, Route } from "wouter";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { ServerErrorAlert } from "@/components/ui/server-error-alert";

import HomePage from "@/pages/home-page";
import DashboardPage from "@/pages/dashboard";
import LoginPage from "@/pages/auth-page";
import RegisterPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile";
import FilesPage from "@/pages/files";
import TodoPage from "@/pages/editor";
import CalendarPage from "@/pages/editor";
import NotesPage from "@/pages/editor";
import EditorPage from "@/pages/editor";
import SettingsPage from "@/pages/profile";
import FileDetailPage from "@/pages/file-detail";
import ForgotPasswordPage from "@/pages/auth-page";
import ResetPasswordPage from "@/pages/auth-page";
import ChatPage from "@/pages/chat";
import HistoryPage from "@/pages/history";
import NotFound from "@/pages/not-found";
import SharedFilePage from "@/pages/shared-file";
import ReferPage from "@/pages/refer-page";
import AboutUsPage from "@/pages/about-us";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/files" component={FilesPage} />
      <ProtectedRoute path="/files/:fileId" component={FileDetailPage} />
      <ProtectedRoute path="/todo" component={TodoPage} />
      <ProtectedRoute path="/calendar" component={CalendarPage} />
      <ProtectedRoute path="/notes" component={NotesPage} />
      <ProtectedRoute path="/editor" component={EditorPage} />
      <ProtectedRoute path="/chat" component={ChatPage} />
      <ProtectedRoute path="/history" component={HistoryPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/shared-file/:shareId" component={SharedFilePage} />
      <Route path="/refer/:code" component={ReferPage} />
      <Route path="/about-us" component={AboutUsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <div className="app-container">
      {/* Server error alert that appears when needed */}
      <ServerErrorAlert />
      
      <AuthProvider>
        <Router />
      </AuthProvider>
        
      <Toaster />
    </div>
  );
}

export default App;