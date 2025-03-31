import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType<any>;
}) {
  const { user, isLoading } = useAuth();
  console.log(`ProtectedRoute (${path}) - isLoading: ${isLoading}, user:`, user);

  // Force refresh the user data if it's not available and not currently loading
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!isLoading && !user) {
      console.log("No user data, forcing refresh of user data");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  }, [isLoading, user, queryClient]);

  if (isLoading) {
    console.log(`ProtectedRoute (${path}) - Still loading user data`);
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    console.log(`ProtectedRoute (${path}) - No user, redirecting to login`);
    return (
      <Route path={path}>
        <Redirect to="/login" />
      </Route>
    );
  }

  console.log(`ProtectedRoute (${path}) - User authenticated, rendering component`);
  return (
    <Route path={path}>
      {(params) => {
        console.log('ProtectedRoute params:', params);
        return <Component params={params} />;
      }}
    </Route>
  );
}
