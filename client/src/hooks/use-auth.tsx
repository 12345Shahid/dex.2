import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        const res = await apiRequest("POST", "/api/login", credentials);
        return await res.json();
      } catch (error) {
        // Try to extract the message from the response
        if (error instanceof Error) {
          const message = error.message;
          // Check if the message contains a JSON structure
          if (message.includes('{')) {
            try {
              const startJson = message.indexOf('{');
              const jsonStr = message.substring(startJson);
              const errorData = JSON.parse(jsonStr);
              if (errorData.message) {
                throw new Error(errorData.message);
              }
            } catch (jsonError) {
              // If parsing fails, just throw the original error
            }
          }
        }
        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Login successful, setting user data:", user);
      queryClient.setQueryData(["/api/user"], user);
      // Invalidate queries to force a refresh
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      try {
        const res = await apiRequest("POST", "/api/register", credentials);
        return await res.json();
      } catch (error) {
        // Try to extract the message from the response
        if (error instanceof Error) {
          const message = error.message;
          // Check if the message contains a JSON structure
          if (message.includes('{')) {
            try {
              const startJson = message.indexOf('{');
              const jsonStr = message.substring(startJson);
              const errorData = JSON.parse(jsonStr);
              if (errorData.message) {
                throw new Error(errorData.message);
              }
            } catch (jsonError) {
              // If parsing fails, just throw the original error
            }
          }
        }
        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}