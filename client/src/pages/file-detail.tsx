import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/ui/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useLocation, useRoute } from "wouter";
import { Save, ArrowLeft, Trash2, Folder, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { jsPDF } from "jspdf/dist/jspdf.es.min.js";
import './../../node_modules/jspdf-autotable/dist/jspdf.plugin.autotable';

export default function FileDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [matched, routeParams] = useRoute("/files/:id");
  
  const [isEditing, setIsEditing] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Debug params
  console.log('FileDetailPage params:', params);
  console.log('Wouter route matched:', matched);
  console.log('Wouter routeParams:', routeParams);
  
  // Get fileId from different sources
  const fileIdFromParams = params?.id ? parseInt(params.id) : NaN;
  const fileIdFromRoute = routeParams?.id ? parseInt(routeParams.id) : NaN;
  
  // Use the routeParams.id if available, otherwise fallback to params.id
  const fileId = !isNaN(fileIdFromRoute) ? fileIdFromRoute : fileIdFromParams;
  console.log('Final fileId:', fileId);
  
  useEffect(() => {
    if (isNaN(fileId)) {
      console.log('Invalid file ID, redirecting to /files');
      toast({
        title: "Error",
        description: "Invalid file ID",
        variant: "destructive",
      });
      navigate("/files");
    }
  }, [fileId, navigate, toast]);

  const { data: file, isLoading: isFileLoading } = useQuery({
    queryKey: [`/api/files/${fileId}`],
    queryFn: async () => {
      const res = await fetch(`/api/files/${fileId}`);
      if (!res.ok) {
        if (res.status === 404) {
          navigate("/files");
          throw new Error("File not found");
        }
        throw new Error("Failed to fetch file");
      }
      return res.json();
    },
    enabled: !isNaN(fileId),
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["/api/folders"],
    queryFn: async () => {
      const res = await fetch("/api/folders");
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    },
  });

  useEffect(() => {
    if (file) {
      setFileContent(file.content || "");
      setFileName(file.name || "");
      setSelectedFolderId(file.folder_id ? String(file.folder_id) : null);
    }
  }, [file]);

  const updateFileMutation = useMutation({
    mutationFn: async (data: { name?: string; content?: string }) => {
      const res = await apiRequest("PUT", `/api/files/${fileId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/files/${fileId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/files/search"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "File updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update file",
        variant: "destructive",
      });
    },
  });

  const moveFileMutation = useMutation({
    mutationFn: async (folderId: number | null) => {
      const res = await apiRequest("POST", `/api/files/${fileId}/move`, { folderId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/files/${fileId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/files/search"] });
      setMoveDialogOpen(false);
      toast({
        title: "Success",
        description: "File moved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to move file",
        variant: "destructive",
      });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/files/${fileId}`);
      return res.ok;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      navigate("/files");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateFileMutation.mutate({
      name: fileName,
      content: fileContent,
    });
  };

  const handleMove = () => {
    moveFileMutation.mutate(selectedFolderId ? parseInt(selectedFolderId) : null);
  };

  const handleDelete = () => {
    deleteFileMutation.mutate();
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return dateString;
    }
  };

  // Export functionality
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(22);
      doc.text(fileName, 20, 20);
      
      // Add metadata
      doc.setFontSize(12);
      doc.text(`Created: ${format(new Date(file.created_at), 'PPP')}`, 20, 30);
      
      // Add content with word wrapping
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(fileContent, 170);
      doc.text(splitText, 20, 45);
      
      // Save the PDF
      doc.save(`${fileName}.pdf`);
      
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
          <title>${fileName}</title>
          <style>
            body { font-family: Arial; margin: 40px; }
            .slide { page-break-after: always; height: 500px; padding: 40px; }
            h1 { font-size: 28px; }
            p { font-size: 18px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="slide">
            <h1>${fileName}</h1>
            <p>${fileContent.replace(/\n/g, '<br>')}</p>
          </div>
        </body>
        </html>
      `;
      
      // Create a Blob from the HTML content
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-powerpoint' });
      
      // Create a download link and trigger it
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.ppt`;
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
      const lines = fileContent.split('\n');
      let csvContent = "data:text/csv;charset=utf-8,";
      
      lines.forEach(line => {
        const row = line.replace(/"/g, '""');
        csvContent += `"${row}"\r\n`;
      });
      
      // Create a download link and trigger it
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.href = encodedUri;
      link.download = `${fileName}.csv`;
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

  if (isFileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-6">
          <div className="max-w-4xl mx-auto text-center py-8">
            Loading file...
          </div>
        </main>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-6">
          <div className="max-w-4xl mx-auto text-center py-8">
            File not found
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container py-6 space-y-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/files")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Files
            </Button>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                {isEditing ? (
                  <Input
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="File Name"
                    className="text-xl font-semibold"
                  />
                ) : (
                  <CardTitle>{fileName}</CardTitle>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Created{" "}
                  {file?.created_at
                    ? format(new Date(file.created_at), "PPP")
                    : ""}
                </p>
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

                {!isEditing ? (
                  <Button 
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSave}
                    disabled={updateFileMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => setMoveDialogOpen(true)}
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Move
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="min-h-[300px] font-mono"
                  placeholder="File content"
                />
              ) : (
                <div className="whitespace-pre-wrap font-mono bg-muted p-4 rounded-md">
                  {file.content || "No content"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Move Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move File</DialogTitle>
            <DialogDescription>
              Select a folder to move this file to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination Folder</label>
              <Select
                value={selectedFolderId === null ? "root" : selectedFolderId}
                onValueChange={(value) => 
                  setSelectedFolderId(value === "root" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root (No folder)</SelectItem>
                  {folders.map((folder: any) => (
                    <SelectItem key={folder.id} value={folder.id.toString()}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleMove}>Move File</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{file.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 