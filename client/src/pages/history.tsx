import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/ui/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, StarOff, Save, Trash2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function HistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [fileName, setFileName] = useState("");

  const { data: chatHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ["/api/chat/history"],
    queryFn: async () => {
      const res = await fetch("/api/chat/history");
      if (!res.ok) throw new Error("Failed to fetch chat history");
      return res.json();
    },
  });

  const { data: favorites = [], refetch: refetchFavorites } = useQuery({
    queryKey: ["/api/chat/favorites"],
    queryFn: async () => {
      const res = await fetch("/api/chat/favorites");
      if (!res.ok) throw new Error("Failed to fetch favorites");
      return res.json();
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: number; isFavorite: boolean }) => {
      const res = await apiRequest("POST", `/api/chat/${id}/favorite`, { isFavorite });
      return res.ok;
    },
    onSuccess: () => {
      refetchHistory();
      refetchFavorites();
      toast({
        title: "Success",
        description: "Favorite status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    },
  });

  const saveToFilesMutation = useMutation({
    mutationFn: async ({ name, content }: { name: string; content: string }) => {
      const res = await apiRequest("POST", "/api/files", {
        name,
        content,
      });
      return res.ok;
    },
    onSuccess: () => {
      setSaveDialogOpen(false);
      toast({
        title: "Success",
        description: "Chat saved to files",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save to files",
        variant: "destructive",
      });
    },
  });

  const handleToggleFavorite = (id: number, currentStatus: boolean) => {
    toggleFavoriteMutation.mutate({ id, isFavorite: !currentStatus });
  };

  const handleSaveToFiles = (chat: any) => {
    setSelectedChat(chat);
    const defaultName = chat.prompt.slice(0, 30).trim() + ".txt";
    setFileName(defaultName);
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = () => {
    if (!selectedChat || !fileName) return;
    saveToFilesMutation.mutate({
      name: fileName,
      content: selectedChat.response,
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return dateString;
    }
  };

  const renderChatList = (chats: any[]) => {
    if (chats.length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground">
          No chat history found
        </div>
      );
    }

    return chats.map((chat) => (
      <Card key={chat.id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm truncate max-w-[80%]">
              {chat.prompt.substring(0, 60)}
              {chat.prompt.length > 60 ? "..." : ""}
            </CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleToggleFavorite(chat.id, chat.is_favorite)}
                title={chat.is_favorite ? "Remove from favorites" : "Add to favorites"}
              >
                {chat.is_favorite ? (
                  <Star className="h-4 w-4 text-yellow-400" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSaveToFiles(chat)}
                title="Save to files"
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDate(chat.created_at)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span className="bg-primary/10 text-primary p-1 rounded-full">
                  You
                </span>
              </h4>
              <p className="text-sm">{chat.prompt}</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span className="bg-secondary/10 text-secondary p-1 rounded-full">
                  AI
                </span>
              </h4>
              <p className="text-sm whitespace-pre-wrap">{chat.response}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Chat History</h1>

          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Chats</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {renderChatList(chatHistory)}
            </TabsContent>

            <TabsContent value="favorites" className="space-y-4">
              {renderChatList(favorites)}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to Files</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">File name</label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter file name"
              />
            </div>
            <Button onClick={handleConfirmSave} disabled={!fileName.trim()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 