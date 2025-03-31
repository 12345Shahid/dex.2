import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Server Error Alert component
 * Displays global server error messages to users
 */
export function ServerErrorAlert() {
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Check server status on component mount and periodically
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api/health', { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          setError(data.message || "The server is experiencing issues. Please try again later.");
          setWarning(null);
          setVisible(true);
        } else {
          // Check for schema issues
          if (data.schemaStatus === 'warning') {
            setWarning(data.message || "Some database features may not work correctly. Please contact your administrator.");
            setVisible(true);
          } else {
            setWarning(null);
          }
          
          // Clear error if server is healthy
          setError(null);
        }
      } catch (err) {
        setError("Unable to connect to the server. Please check your internet connection.");
        setWarning(null);
        setVisible(true);
      }
    };

    // Initial check
    checkServerStatus();
    
    // Set up periodic checks (every 30 seconds)
    const interval = setInterval(checkServerStatus, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, []);

  // If no error/warning or alert dismissed, don't show anything
  if (!visible || (!error && !warning)) return null;

  if (error) {
    return (
      <Alert variant="destructive" className="fixed top-4 right-4 w-96 z-50 flex items-center justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5" />
          <div>
            <AlertTitle>Server Error</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setVisible(false)}
          className="h-6 w-6 rounded-full hover:bg-red-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    );
  }

  if (warning) {
    return (
      <Alert className="fixed top-4 right-4 w-96 z-50 flex items-center justify-between bg-amber-100 border-amber-300">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div>
            <AlertTitle className="text-amber-800">Database Warning</AlertTitle>
            <AlertDescription className="text-amber-700">
              {warning}
            </AlertDescription>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setVisible(false)}
          className="h-6 w-6 rounded-full hover:bg-amber-200"
        >
          <X className="h-4 w-4 text-amber-700" />
        </Button>
      </Alert>
    );
  }

  return null;
} 