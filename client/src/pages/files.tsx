import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/ui/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFileSchema, insertFolderSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Folder, File as FileIcon, Search, Plus, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FilesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [downloadFormat, setDownloadFormat] = useState("txt");

  // Query for both files and folders
  const { data: files = [] } = useQuery({
    queryKey: ["/api/files/search", searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/files/search?q=${searchQuery || ''}`);
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
  });

  const fileForm = useForm({
    resolver: zodResolver(insertFileSchema),
    defaultValues: {
      name: "",
      content: "",
      folderId: null,
    },
  });

  const folderForm = useForm({
    resolver: zodResolver(insertFolderSchema),
    defaultValues: {
      name: "",
    },
  });

  const validateFileName = async (name: string, type: 'file' | 'folder') => {
    const existingItems = files || [];
    const isDuplicate = existingItems.some(
      (item: any) => item.name === name &&
        ((type === 'file' && !('folderId' in item)) || (type === 'folder' && !('content' in item)))
    );

    if (isDuplicate) {
      toast({
        title: "Error",
        description: `A ${type} with this name already exists`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const createFileMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!(await validateFileName(data.name, 'file'))) {
        throw new Error("Duplicate file name");
      }
      const res = await apiRequest("POST", "/api/files", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files/search"] });
      fileForm.reset();
      setFileDialogOpen(false);
      toast({
        title: "Success",
        description: "File created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create file",
        variant: "destructive",
      });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!(await validateFileName(data.name, 'folder'))) {
        throw new Error("Duplicate folder name");
      }
      const res = await apiRequest("POST", "/api/folders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files/search"] });
      folderForm.reset();
      setFolderDialogOpen(false);
      toast({
        title: "Success",
        description: "Folder created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    },
  });

  const handleDownload = (file: any) => {
    let fileType = 'text/plain';
    let extension = downloadFormat;
    let content = file.content;

    if (downloadFormat === 'pdf') {
      // For PDF, we'll need to create a formatted document
      content = `
        <html>
          <body>
            <pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">
              ${file.content}
            </pre>
          </body>
        </html>
      `;
      fileType = 'text/html';
    }

    const blob = new Blob([content], { type: fileType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.split('.')[0]}.${extension}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Files</h1>

          <div className="flex gap-2">
            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Folder className="mr-2 h-4 w-4" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                </DialogHeader>
                <Form {...folderForm}>
                  <form
                    onSubmit={folderForm.handleSubmit((data) =>
                      createFolderMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={folderForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Folder Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createFolderMutation.isPending}>
                      Create Folder
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <FileText className="mr-2 h-4 w-4" />
                  New File
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New File</DialogTitle>
                </DialogHeader>
                <Form {...fileForm}>
                  <form
                    onSubmit={fileForm.handleSubmit((data) =>
                      createFileMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={fileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>File Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={fileForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createFileMutation.isPending}>
                      Create File
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((item: any) => (
            <Card
              key={item.id}
              className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                'content' in item ? 'border-primary/20' : 'border-secondary/20'
              }`}
              onClick={() => 'content' in item && setSelectedFile(item)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {'content' in item ? (
                    <FileIcon className="h-4 w-4 text-primary" />
                  ) : (
                    <Folder className="h-4 w-4 text-secondary" />
                  )}
                  {item.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedFile?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {selectedFile?.content}
                </pre>
              </div>
              <div className="flex items-center gap-4">
                <Select value={downloadFormat} onValueChange={setDownloadFormat}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="txt">Text (.txt)</SelectItem>
                    <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex justify-end gap-2 flex-1">
                  <Button
                    onClick={() => {
                      localStorage.setItem("editContent", selectedFile.content);
                      setSelectedFile(null);
                      setLocation("/editor");
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(selectedFile)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}