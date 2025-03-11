import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/ui/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, AlertCircle, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";

const TOOLS = {
  blogging: {
    name: "Blogging Tool",
    description: "Create SEO-optimized blog content"
  },
  youtube: {
    name: "YouTube Tool",
    description: "Generate video scripts and descriptions"
  },
  research: {
    name: "Research Tool",
    description: "Academic and research content generation"
  },
  developer: {
    name: "Developer Tool",
    description: "Code and technical documentation"
  },
  general: {
    name: "General Tool",
    description: "All-purpose content generation"
  }
};

export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [minWords, setMinWords] = useState("500");
  const [maxWords, setMaxWords] = useState("1000");
  const [tone, setTone] = useState("professional");
  const [selectedTool, setSelectedTool] = useState("general");
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const queryClient = useQueryClient();

  const chatMutation = useMutation({
    mutationFn: async (data: {
      prompt: string;
      negativePrompt: string;
      minWords: string;
      maxWords: string;
      tone: string;
      tool: string;
    }) => {
      const res = await apiRequest("POST", "/api/chat", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setResponse(data.response);
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    chatMutation.mutate({
      prompt,
      negativePrompt,
      minWords,
      maxWords,
      tone,
      tool: selectedTool,
    });
  };

  const handleSaveToFiles = async () => {
    if (!response) return;

    try {
      // Check if file with this name already exists
      const res = await fetch(`/api/files/search?q=${prompt.slice(0, 30).trim()}`);
      if (!res.ok) throw new Error("Failed to check existing files");
      const files = await res.json();

      const defaultName = prompt.slice(0, 30).trim() + ".txt";
      const isDuplicate = files.some((file: any) => file.name === defaultName);

      if (isDuplicate) {
        toast({
          title: "Warning",
          description: "A file with this name already exists. Please choose a different name.",
          variant: "destructive",
        });
      }

      setFileName(defaultName);
      setSaveDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save content",
        variant: "destructive",
      });
    }
  };

  const handleConfirmSave = async () => {
    try {
      // Check for duplicate name before saving
      const res = await fetch(`/api/files/search?q=${fileName}`);
      if (!res.ok) throw new Error("Failed to check existing files");
      const files = await res.json();

      const isDuplicate = files.some((file: any) => file.name === fileName);
      if (isDuplicate) {
        toast({
          title: "Error",
          description: "A file with this name already exists. Please choose a different name.",
          variant: "destructive",
        });
        return;
      }

      await apiRequest("POST", "/api/files", {
        name: fileName,
        content: response,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/files/search"] });
      toast({
        title: "Saved!",
        description: "Content saved to your files",
      });
      setSaveDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save content",
        variant: "destructive",
      });
    }
  };

  const handleEdit = () => {
    localStorage.setItem("editContent", response);
    setLocation("/editor");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container py-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>AI Content Generator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Tool</label>
                <Select value={selectedTool} onValueChange={setSelectedTool}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TOOLS).map(([key, tool]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span>{tool.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {tool.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Main Prompt</label>
                  <Textarea
                    placeholder="What would you like to create?"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[100px]"
                    disabled={chatMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Negative Prompt (Optional)</label>
                  <Textarea
                    placeholder="What should be avoided in the content?"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    disabled={chatMutation.isPending}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Min Words</label>
                    <Input
                      type="number"
                      value={minWords}
                      onChange={(e) => setMinWords(e.target.value)}
                      disabled={chatMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Words</label>
                    <Input
                      type="number"
                      value={maxWords}
                      onChange={(e) => setMaxWords(e.target.value)}
                      disabled={chatMutation.isPending}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tone</label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="excited">Excited</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-xs text-muted-foreground">
                  Credits remaining: {user?.credits || 0}
                </div>

                <Button
                  type="submit"
                  disabled={chatMutation.isPending || !prompt.trim()}
                  className="w-full"
                >
                  {chatMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Content"
                  )}
                </Button>
              </form>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {response && (
                <div className="mt-8 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Generated Content:</h3>
                    <div className="space-x-2">
                      <Button onClick={handleSaveToFiles} variant="outline" size="sm">
                        <Save className="mr-2 h-4 w-4" />
                        Save to Files
                      </Button>
                      <Button onClick={handleEdit} size="sm">
                        Edit in Document
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    <p className="whitespace-pre-wrap">{response}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to Files</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">File Name</label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter file name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}