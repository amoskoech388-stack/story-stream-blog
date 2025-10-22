import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2 } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface Post {
  id: string;
  title: string;
  content: string;
  slug: string;
  featured_image_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
  post_tags: Array<{
    tags: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

export default function PostDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
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
    fetchPost();
  }, [slug]);

  useEffect(() => {
    if (post && user) {
      setCanEdit(post.user_id === user.id || isAdmin);
    }
  }, [post, user, isAdmin]);

  const fetchPost = async () => {
    if (!slug) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (
            full_name,
            email
          ),
          post_tags (
            tags (
              id,
              name,
              slug
            )
          )
        `)
        .eq("slug", slug)
        .single();

      if (error) throw error;
      setPost(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !window.confirm("Are you sure you want to delete this post?")) return;

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} isAdmin={isAdmin} />
        <div className="container mx-auto px-4 py-8 text-center">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} isAdmin={isAdmin} />
        <div className="container mx-auto px-4 py-8 text-center">Post not found</div>
      </div>
    );
  }

  const siteUrl = window.location.origin;
  const postUrl = `${siteUrl}/posts/${post.slug}`;
  const imageUrl = post.featured_image_url || `${siteUrl}/placeholder.svg`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.title} | BreakingNewsDaily</title>
        <meta name="description" content={post.content.substring(0, 160)} />
        <link rel="canonical" href={postUrl} />

        <meta property="og:title" content={post.title} />
        <meta
          property="og:description"
          content={post.content.substring(0, 160)}
        />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:url" content={postUrl} />
        <meta property="og:type" content="article" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta
          name="twitter:description"
          content={post.content.substring(0, 160)}
        />
        <meta name="twitter:image" content={imageUrl} />
      </Helmet>

      <Navbar user={user} isAdmin={isAdmin} />

      <article className="container mx-auto px-4 py-8 max-w-4xl">
        {post.featured_image_url && (
          <div className="aspect-video overflow-hidden rounded-lg mb-8">
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>

          <div className="flex items-center justify-between flex-wrap gap-4 text-muted-foreground mb-4">
            <div>
              By {post.profiles.full_name || post.profiles.email} •{" "}
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
              })}
            </div>

            {canEdit && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/edit/${post.slug}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {post.post_tags.map((pt) => (
              <Badge key={pt.tags.id} variant="secondary">
                {pt.tags.name}
              </Badge>
            ))}
          </div>
        </header>

        <div className="prose prose-lg max-w-none">
          {post.content.split("\n").map((paragraph, index) => (
            <p key={index} className="mb-4">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </div>
  );
}
