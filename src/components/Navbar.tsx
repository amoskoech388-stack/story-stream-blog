import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { PenSquare, LogOut, LayoutDashboard, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface NavbarProps {
  user: User | null;
  isAdmin: boolean;
}

export const Navbar = ({ user, isAdmin }: NavbarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
    setIsOpen(false);
  };

  const NavigationItems = () => (
    <>
      {user ? (
        <>
          <Button variant="secondary" asChild className="w-full md:w-auto justify-start">
            <Link to="/create-post" onClick={() => setIsOpen(false)}>
              <PenSquare className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
          {isAdmin && (
            <Button variant="secondary" asChild className="w-full md:w-auto justify-start">
              <Link to="/admin" onClick={() => setIsOpen(false)}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={handleLogout} className="w-full md:w-auto justify-start">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </>
      ) : (
        <Button asChild className="w-full md:w-auto">
          <Link to="/auth" onClick={() => setIsOpen(false)}>Login</Link>
        </Button>
      )}
    </>
  );

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl md:text-2xl font-bold text-primary">
            BreakingNewsDaily
          </Link>

          {isMobile ? (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <div className="flex flex-col gap-4 mt-8">
                  <NavigationItems />
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <div className="flex items-center gap-4">
              <NavigationItems />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
