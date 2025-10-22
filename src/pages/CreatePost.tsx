import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const postSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title must be less than 200 characters"),
  content: z.string().min(50, "Content must be at least 50 characters").max(50000, "Content must be less than 50000 characters"),
  tags: z.string().max(200, "Tags must be less than 200 characters"),
});

export default function CreatePost() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      checkAdminStatus(session.user.id);
    });

    if (slug) {
      loadPost();
    }
  }, [slug, navigate]);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const loadPost = async () => {
    if (!slug) return;
    
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        post_tags (
          tags (
            name
          )
        )
      `)
      .eq("slug", slug)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Post not found",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setTitle(data.title);
    setContent(data.content);
    setExistingImageUrl(data.featured_image_url);
    const tagNames = data.post_tags?.map((pt: any) => pt.tags.name).join(", ") || "";
    setTags(tagNames);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("post-images")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      postSchema.parse({ title, content, tags });
      
      if (!user) return;
      setLoading(true);

      let imageUrl = existingImageUrl;
      if (featuredImage) {
        imageUrl = await uploadImage(featuredImage);
      }

      const postSlug = slug || generateSlug(title);

      const postData = {
        user_id: user.id,
        title,
        content,
        slug: postSlug,
        featured_image_url: imageUrl,
      };

      let postId: string;

      if (slug) {
        const { data, error } = await supabase
          .from("posts")
          .update(postData)
          .eq("slug", slug)
          .select()
          .single();

        if (error) throw error;
        postId = data.id;
      } else {
        const { data, error } = await supabase
          .from("posts")
          .insert([postData])
          .select()
          .single();

        if (error) throw error;
        postId = data.id;
      }

      if (tags.trim()) {
        await supabase
          .from("post_tags")
          .delete()
          .eq("post_id", postId);

        const tagNames = tags.split(",").map((t) => t.trim()).filter((t) => t);
        
        for (const tagName of tagNames) {
          const tagSlug = generateSlug(tagName);
          
          const { data: existingTag } = await supabase
            .from("tags")
            .select("id")
            .eq("slug", tagSlug)
            .maybeSingle();

          let tagId: string;
          if (existingTag) {
            tagId = existingTag.id;
          } else {
            const { data: newTag, error: tagError } = await supabase
              .from("tags")
              .insert([{ name: tagName, slug: tagSlug }])
              .select()
              .single();

            if (tagError) throw tagError;
            tagId = newTag.id;
          }

          await supabase
            .from("post_tags")
            .insert([{ post_id: postId, tag_id: tagId }]);
        }
      }

      toast({
        title: "Success!",
        description: slug ? "Post updated successfully" : "Post created successfully",
      });
      navigate(`/posts/${postSlug}`);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} isAdmin={isAdmin} />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>{slug ? "Edit Post" : "Create New Post"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter post title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your post content..."
                  rows={15}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="technology, news, breaking"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Featured Image</Label>
                {existingImageUrl && !featuredImage && (
                  <div className="mb-2">
                    <img
                      src={existingImageUrl}
                      alt="Current featured image"
                      className="w-full max-w-md rounded-lg"
                    />
                  </div>
                )}
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFeaturedImage(e.target.files?.[0] || null)}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : slug ? "Update Post" : "Publish Post"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/")}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
