import { useEffect, useState } from "react";
import { Navbar } from "@/components/ui/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, Download, Share } from "lucide-react";

export default function EditorPage() {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [originalContent, setOriginalContent] = useState("");

  useEffect(() => {
    // Get content from localStorage if it exists
    const savedContent = localStorage.getItem("editContent");
    if (savedContent) {
      setContent(savedContent);
      setOriginalContent(savedContent);
      // Generate a default file name from the first line or first few words
      const defaultName = savedContent.split('\n')[0].slice(0, 30).trim() + ".txt";
      setFileName(defaultName);
      // Clear localStorage
      localStorage.removeItem("editContent");
    }
  }, []);

  const handleSave = async () => {
    if (!fileName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a file name",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/files", {
        name: fileName,
        content: content,
      });

      toast({
        title: "Success",
        description: "File saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save file",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Success",
        description: "Content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy content",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container py-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Document Editor</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Enter file name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="max-w-[200px]"
              />
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button onClick={handleDownload} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button onClick={handleShare} variant="outline">
                <Share className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[500px] font-mono"
              placeholder="Start typing..."
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
