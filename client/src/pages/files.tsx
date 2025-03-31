import { useState, useEffect } from "react";
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
import { Folder, File as FileIcon, Search, Plus, Download, FileText, ArrowLeft, Star, Loader2 } from "lucide-react";
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
  const [filter, setFilter] = useState<"all" | "folders">("all");
  const [sortBy, setSortBy] = useState<"name" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [downloadFormat, setDownloadFormat] = useState("txt");
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // New state for folder navigation
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string>("Root");
  const [breadcrumbs, setBreadcrumbs] = useState<{id: number | null, name: string}[]>([{id: null, name: "Root"}]);

  // Query for root files or folder contents based on currentFolderId
  const { data: rootFiles = [], refetch: refetchFiles } = useQuery({
    queryKey: ["/api/files", currentFolderId],
    queryFn: async () => {
      // If currentFolderId is null, get root files, otherwise get folder contents
      let endpoint = currentFolderId === null 
        ? `/api/files` 
        : `/api/folders/${currentFolderId}/contents`;
      
      console.log(`Fetching files from: ${endpoint}`);
      
      const res = await fetch(endpoint);
      if (!res.ok) {
        console.error(`Failed to fetch files: ${res.status}`);
        throw new Error(`Failed to fetch ${currentFolderId ? 'folder contents' : 'files'}`);
      }
      
      const data = await res.json();
      console.log(`Got ${data.length || data.files?.length || 0} files for ${currentFolderId ? 'folder' : 'root'}`);
      
      // Handle both array and object with files property responses
      return Array.isArray(data) ? data : (data.files || []);
    },
  });

  // Query for folders
  const { data: folders = [], refetch: refetchFolders } = useQuery({
    queryKey: ["/api/folders"],
    queryFn: async () => {
      const res = await fetch("/api/folders");
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    },
  });

  // Query for favorite files
  const { data: favoriteFiles = [], refetch: refetchFavorites } = useQuery({
    queryKey: ["/api/files/favorites"],
    queryFn: async () => {
      const res = await fetch("/api/files/favorites");
      if (!res.ok) throw new Error("Failed to fetch favorites");
      return res.json();
    },
  });

  // Search query
  const { data: searchResults = [], refetch: refetchSearch } = useQuery({
    queryKey: ["/api/files/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const res = await fetch(`/api/files/search?q=${searchQuery}`);
      if (!res.ok) throw new Error("Failed to search files");
      return res.json();
    },
    enabled: !!searchQuery,
  });

  // Combine data based on whether we're searching or not
  const files = isSearching 
    ? searchResults.filter((item: any) => 'content' in item)
    : [...rootFiles];

  // Filter folders to only show those in the current location
  const currentFolders = isSearching 
    ? searchResults.filter((item: any) => !('content' in item)) 
    : folders.filter((folder: any) => folder.parent_id === currentFolderId);
    
  // Combined items to display
  const itemsToDisplay = isSearching 
    ? searchResults 
    : [...files, ...currentFolders];

  // Update search state whenever the query changes
  useEffect(() => {
    setIsSearching(!!searchQuery);
    if (searchQuery) {
      refetchSearch();
    }
  }, [searchQuery, refetchSearch]);

  const fileForm = useForm({
    resolver: zodResolver(insertFileSchema),
    defaultValues: {
      name: "",
      content: "",
      folderId: null,
    },
  });

  // Reset the form whenever the current folder changes
  useEffect(() => {
    fileForm.setValue("folderId", currentFolderId);
  }, [currentFolderId, fileForm]);

  const folderForm = useForm({
    resolver: zodResolver(insertFolderSchema),
    defaultValues: {
      name: "",
      parent_id: null
    },
  });

  // Reset the form whenever the current folder changes
  useEffect(() => {
    fileForm.setValue("folderId", currentFolderId);
    folderForm.setValue("parent_id", currentFolderId);
  }, [currentFolderId, fileForm, folderForm]);

  const validateFileName = async (name: string, type: 'file' | 'folder') => {
    // For folders, we need to check if a folder with this name exists in the current location
    const filesToCheck = currentFolderId === null ? rootFiles : rootFiles.filter((item: any) => item.folder_id === currentFolderId);
    const foldersToCheck = folders.filter((folder: any) => folder.parent_id === currentFolderId);
    
    // Combine files and folders in the current location to check for duplicates
    const existingItems = [...filesToCheck, ...foldersToCheck];
    
    const isDuplicate = existingItems.some(
      (item: any) => item.name === name && 
        ((type === 'file' && 'content' in item) || (type === 'folder' && !('content' in item)))
    );

    if (isDuplicate) {
      toast({
        title: "Error",
        description: `A ${type} with this name already exists in this location`,
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
      // Ensure we're using the current folder ID
      const formData = {
        ...data,
        folderId: currentFolderId
      };
      const res = await apiRequest("POST", "/api/files", formData);
      return res.json();
    },
    onSuccess: () => {
      // Refresh the appropriate data after creating a file
      refetchFiles();
      if (searchQuery) refetchSearch();
      
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
      // Include the current folder ID as parent_id
      const folderData = {
        ...data,
        parent_id: currentFolderId
      };
      const res = await apiRequest("POST", "/api/folders", folderData);
      return res.json();
    },
    onSuccess: () => {
      // Refresh the appropriate data after creating a folder
      refetchFolders();
      if (currentFolderId !== null) {
        // If we're in a folder, refresh that folder's contents
        refetchFiles();
      }
      if (searchQuery) refetchSearch();
      
      folderForm.reset();
      setFolderDialogOpen(false);
      toast({
        title: "Success",
        description: `Folder created successfully${currentFolderId !== null ? ` in ${currentFolderName}` : ''}`,
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

  const handleFolderClick = (folderId: number, folderName: string) => {
    setCurrentFolderId(folderId);
    setCurrentFolderName(folderName);
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(newBreadcrumbs[index].id);
    setCurrentFolderName(newBreadcrumbs[index].name);
  };

  // Track active tab
  const [activeTab, setActiveTab] = useState<string>("files");

  // Handlers
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      // If search is cleared, go back to showing all files
      setIsSearching(false);
      // Refetch based on current folder
      refetchFiles();
      return;
    }
    
    setIsSearching(true);
    setLoading(true);
    
    try {
      const response = await fetch(`/api/files/search?query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle different error scenarios
        if (response.status === 503 && errorData.errorCode === 'SCHEMA_ERROR') {
          toast({
            title: "Database Update Required",
            description: "The search feature requires a database update. Please contact your administrator.",
            variant: "destructive",
          });
          return;
        }
        
        if (response.status === 401) {
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          setTimeout(() => window.location.href = '/login', 2000);
          return;
        }
        
        throw new Error(errorData.message || "Search failed");
      }
      
      const data = await response.json();
      // Combine files and folders from search results
      setSearchResults(data);
      
      // Show toast for search results
      if (data.length === 0) {
        toast({
          title: "No results found",
          description: `No items matching "${query}" were found`,
          variant: "default",
        });
      } else {
        toast({
          title: "Search results",
          description: `Found ${data.length} item${data.length === 1 ? '' : 's'} matching "${query}"`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search error",
        description: error instanceof Error ? error.message : "Failed to search. Please try again.",
        variant: "destructive",
      });
      
      // Reset to non-search state on error
      setIsSearching(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Files</h1>
            
            {/* Current folder indicator */}
            {currentFolderId !== null && (
              <div className="text-sm font-medium text-primary mt-1 mb-2">
                Current folder: {currentFolderName}
              </div>
            )}
            
            {/* Breadcrumb navigation */}
            <div className="flex items-center text-sm text-muted-foreground mt-2">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2">/</span>}
                  <button 
                    onClick={() => handleBreadcrumbClick(index)}
                    className="hover:underline hover:text-foreground"
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {/* Back button - only show when in a folder */}
            {currentFolderId !== null && (
              <Button
                variant="outline"
                size="sm"
                className="mb-4"
                onClick={() => {
                  const parentIndex = breadcrumbs.length - 2;
                  if (parentIndex >= 0) {
                    handleBreadcrumbClick(parentIndex);
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Parent
              </Button>
            )}

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
                  {currentFolderId !== null && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Creating folder in: {currentFolderName}
                    </p>
                  )}
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
                  {currentFolderId !== null && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Creating file in: {currentFolderName}
                    </p>
                  )}
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

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center space-x-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              All Files
            </Button>
            <Button
              variant={filter === "folders" ? "default" : "outline"}
              onClick={() => setFilter("folders")}
            >
              Folders
            </Button>
          </div>
        </div>
        
        {/* Show files and folders */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 text-center p-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <h3 className="text-lg font-medium">Loading folder contents...</h3>
              </div>
            </div>
          ) : itemsToDisplay.length === 0 ? (
            <div className="col-span-3 text-center p-6">
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium">No files or folders found</h3>
                <p className="text-muted-foreground">
                  {isSearching 
                    ? "Try a different search term or clear your search" 
                    : "Create your first file or folder to get started"}
                </p>
              </div>
            </div>
          ) : (
            itemsToDisplay
              .filter(item => {
                // If filter is "all", show everything
                if (filter === "all") return true;
                // If filter is "folders", only show folders
                if (filter === "folders") return !('content' in item);
                return true;
              })
              .map((item: any) => (
                <Card
                  key={item.id}
                  className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                    'content' in item ? 'border-primary/20' : 'border-secondary/20'
                  }`}
                  onClick={() => {
                    console.log('File clicked:', item);
                    
                    if ('content' in item) {
                      // Check that the ID is a valid number, not a string like 'search'
                      const fileId = typeof item.id === 'number' ? item.id : parseInt(item.id);
                      console.log('File ID for navigation:', fileId, 'isNaN:', isNaN(fileId));
                      
                      if (!isNaN(fileId)) {
                        const fileUrl = `/files/${fileId}`;
                        console.log('Navigating to:', fileUrl);
                        
                        // Try a more direct approach to navigation
                        window.location.href = fileUrl;
                      } else {
                        console.log('Invalid file ID detected:', item.id);
                        toast({
                          title: "Error",
                          description: "Invalid file ID",
                          variant: "destructive",
                        });
                      }
                    } else {
                      // Navigate to folder
                      handleFolderClick(item.id, item.name);
                    }
                  }}
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
                      Created {new Date(item.created_at).toLocaleDateString()}
                      {item.folder_id && !isSearching && 
                        <span className="ml-2">(In folder)</span>
                      }
                      {isSearching && item.folder_id && 
                        <span className="ml-2 italic">(In folder)</span>
                      }
                    </p>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      </main>
    </div>
  );
}