import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Spinner } from "@/components/ui/spinner";

export default function ReferPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/refer/:code");
  
  useEffect(() => {
    // Get the referral code from the URL
    const referralCode = params?.code;
    
    if (referralCode) {
      // Store referral code in localStorage
      localStorage.setItem('referralCode', referralCode);
      console.log('Referral code saved:', referralCode);
      
      // Redirect to registration page
      setTimeout(() => {
        setLocation('/register');
      }, 1500);
    } else {
      // If no referral code, redirect to home
      setLocation('/');
    }
  }, [params, setLocation]);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center">
        <Spinner size="xl" className="mb-4" />
        <h1 className="text-2xl font-bold mb-2">Processing Referral...</h1>
        <p className="text-muted-foreground">You'll be redirected to register in a moment</p>
      </div>
    </div>
  );
} 