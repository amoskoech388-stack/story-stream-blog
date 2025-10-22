import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Post {
  id: string;
  title: string;
  content: string;
  slug: string;
  featured_image_url: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
    });
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    fetchTags();
    fetchPosts();
  }, [selectedTag]);

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name");
    
    if (error) {
      console.error("Error fetching tags:", error);
    } else {
      setTags(data || []);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("posts")
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (selectedTag) {
        const { data: postIds } = await supabase
          .from("post_tags")
          .select("post_id")
          .eq("tag_id", selectedTag);
        
        if (postIds && postIds.length > 0) {
          query = query.in("id", postIds.map(pt => pt.post_id));
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getExcerpt = (content: string) => {
    return content.length > 150 ? content.substring(0, 150) + "..." : content;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} isAdmin={isAdmin} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Latest News</h1>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedTag === null ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setSelectedTag(null)}
            >
              All
            </Badge>
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTag === tag.id ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setSelectedTag(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts found. Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} to={`/posts/${post.slug}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  {post.featured_image_url && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img
                        src={post.featured_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                    <CardDescription>
                      By {post.profiles.full_name || post.profiles.email} •{" "}
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-3">
                      {getExcerpt(post.content)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
