import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { User, LogOut, Info } from "lucide-react";

export function Navbar() {
  const { user, logoutMutation } = useAuth();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              Halal AI Chat
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {user ? (
              <>
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/chat">Chat</Link>
                <Link href="/history">History</Link>
                <Link href="/files">Files</Link>
              </>
            ) : null}
            <Link href="/about-us">About Us</Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center space-x-2 justify-end">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
