import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useEffect, useState } from "react";

export default function AuthPage({ params }: { params?: { tab?: string } }) {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  
  // Determine the default tab based on the current route
  const getDefaultTab = () => {
    if (location.includes('/register')) return 'register';
    if (location.includes('/login')) return 'login';
    return 'login';
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());

  const loginForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Handle redirect in useEffect
  useEffect(() => {
    console.log('Auth status changed. User:', user);
    if (user) {
      console.log('User is authenticated, redirecting to dashboard');
      setTimeout(() => {
        setLocation("/dashboard");
      }, 100); // Short delay to ensure the redirect happens
    }
  }, [user, setLocation]);

  // Function to handle registration with referral code
  const handleRegister = (data) => {
    // Check if there's a stored referral code
    const referralCode = localStorage.getItem('referralCode');
    
    if (referralCode) {
      // Include the referral code in the registration data
      registerMutation.mutate({
        ...data,
        referrer: referralCode
      });
      
      // Clear the referral code after using it
      localStorage.removeItem('referralCode');
    } else {
      // Register without a referral code
      registerMutation.mutate(data);
    }
  };

  // If we're in the process of redirecting, show nothing
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Welcome to Halal AI Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" onClick={() => setLocation("/login")}>Login</TabsTrigger>
                <TabsTrigger value="register" onClick={() => setLocation("/register")}>Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit((data) => {
                    console.log("Login form submitted with data:", data);
                    loginMutation.mutate(data, {
                      onSuccess: () => {
                        console.log("Login mutation success, redirecting to dashboard");
                        setTimeout(() => setLocation("/dashboard"), 100);
                      },
                      onError: (error) => {
                        console.error("Login error:", error);
                      }
                    });
                  })} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={loginMutation.isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} disabled={loginMutation.isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {loginMutation.isError && (
                      <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                        {loginMutation.error?.message || "Login failed. Please try again."}
                      </div>
                    )}
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={registerMutation.isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} disabled={registerMutation.isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {registerMutation.isError && (
                      <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                        {registerMutation.error?.message || "Registration failed. Please try again."}
                      </div>
                    )}
                    <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-8">
        <div className="max-w-md space-y-6">
          <h1 className="text-4xl font-bold">The First Free, Unlimited Halal AI Chat Assistant</h1>
          <ul className="space-y-4">
            <li className="flex items-center gap-2">
              <span className="text-primary">🔹</span>
              <span>Ethical & Halal AI – Content filtered to align with Islamic principles</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">🔹</span>
              <span>Unlimited Free Access – No credit card required</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">🔹</span>
              <span>Share & Learn – Save and share AI-generated Islamic content</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}