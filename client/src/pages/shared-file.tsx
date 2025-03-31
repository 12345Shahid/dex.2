import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/ui/navbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { format } from "date-fns";

interface SharedFile {
  id: number;
  name: string;
  content: string;
  created_at: string;
}

export default function SharedFilePage() {
  const [, params] = useParams();
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<SharedFile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSharedFile = async () => {
      try {
        const shareId = params?.shareId;
        if (!shareId) {
          throw new Error("No share ID provided");
        }

        const res = await apiRequest("GET", `/api/shared-files/${shareId}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast({
              title: "Error",
              description: "Shared file not found",
              variant: "destructive",
            });
            setLocation("/");
            return;
          }
          throw new Error("Failed to fetch shared file");
        }

        const data = await res.json();
        setFile(data);
      } catch (error) {
        console.error("Error fetching shared file:", error);
        toast({
          title: "Error",
          description: "Failed to load shared file",
          variant: "destructive",
        });
        setLocation("/");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedFile();
  }, [params?.shareId, setLocation]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please wait while we load the shared file...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!file) {
    return null;
  }

  // Export functionality
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(22);
      doc.text(file.name, 20, 20);
      
      // Add metadata
      doc.setFontSize(12);
      if (file.created_at) {
        doc.text(`Created: ${format(new Date(file.created_at), 'PPP')}`, 20, 30);
      }
      
      // Add content with word wrapping
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(file.content, 170);
      doc.text(splitText, 20, 45);
      
      // Save the PDF
      doc.save(`${file.name}.pdf`);
      
      toast({
        title: "Success",
        description: "File exported as PDF",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Error",
        description: "Failed to export as PDF",
        variant: "destructive",
      });
    }
  };

  const exportToPPT = () => {
    try {
      // Create a simple HTML representation that can be opened in PowerPoint
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${file.name}</title>
          <style>
            body { font-family: Arial; margin: 40px; }
            .slide { page-break-after: always; height: 500px; padding: 40px; }
            h1 { font-size: 28px; }
            p { font-size: 18px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="slide">
            <h1>${file.name}</h1>
            <p>${file.content.replace(/\n/g, '<br>')}</p>
          </div>
        </body>
        </html>
      `;
      
      // Create a Blob from the HTML content
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-powerpoint' });
      
      // Create a download link and trigger it
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${file.name}.ppt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: "File exported as PPT",
      });
    } catch (error) {
      console.error("PPT export error:", error);
      toast({
        title: "Error",
        description: "Failed to export as PPT",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    try {
      // For CSV, we'll split content by lines and commas to create rows and columns
      const lines = file.content.split('\n');
      let csvContent = "data:text/csv;charset=utf-8,";
      
      lines.forEach(line => {
        const row = line.replace(/"/g, '""');
        csvContent += `"${row}"\r\n`;
      });
      
      // Create a download link and trigger it
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.href = encodedUri;
      link.download = `${file.name}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: "File exported as CSV",
      });
    } catch (error) {
      console.error("CSV export error:", error);
      toast({
        title: "Error",
        description: "Failed to export as CSV",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10">
        <Button
          onClick={() => setLocation("/")}
          variant="outline"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{file.name}</CardTitle>
              {file.created_at && (
                <p className="text-sm text-muted-foreground mt-1">
                  Created {format(new Date(file.created_at), "PPP")}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" title="Export file">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export As</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportToPDF}>
                    PDF Document
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPPT}>
                    PowerPoint Presentation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToCSV}>
                    CSV Spreadsheet
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md p-4 whitespace-pre-wrap">
              {file.content}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 