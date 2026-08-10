"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/app/lib/supabase";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import { Button } from "@/components/ui/button";
import { PostCard, type Post } from "../DiscoverClient";

export function PostDetailClient({ id }: { id: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [post, setPost] = useState<Post | null>(null);
  const [viewerId, setViewerId] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);

  const auth = useCallback(async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) throw new Error("Sign in to view this post.");
    return token;
  }, [supabase]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await auth();
      const response = await fetch(`/api/social/posts/${encodeURIComponent(id)}`, { headers: buildTeamAuthHeaders(token, selectedTeamId) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to load this post.");
      const loadedPost = payload.post as Post;
      if (loadedPost.media_path) {
        const { data: signed } = await supabase.storage.from("social-media").createSignedUrl(loadedPost.media_path, 3600);
        loadedPost.media_url = signed?.signedUrl ?? null;
      }
      setPost(loadedPost); setViewerId(payload.viewerId);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Unable to load this post."); }
    finally { setLoading(false); }
  }, [auth, id, selectedTeamId, supabase]);

  useEffect(() => { void load(); }, [load]);

  const engage = async (postId: string, action: string, extra: Record<string, unknown> = {}) => {
    try {
      const token = await auth();
      const response = await fetch("/api/social/engage", { method: "POST", headers: buildTeamAuthHeaders(token, selectedTeamId, { "Content-Type": "application/json" }), body: JSON.stringify({ postId, action, ...extra }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to update post.");
      if (action === "comment") setComment("");
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Unable to update post."); }
  };

  return <div className="mx-auto max-w-4xl space-y-5"><Button variant="ghost" asChild><Link href="/discover"><ArrowLeft />Back to Explore</Link></Button>{loading ? <div className="grid min-h-96 place-items-center"><Loader2 className="animate-spin text-muted-foreground" /></div> : post ? <PostCard post={post} viewerId={viewerId} comment={comment} setComment={setComment} engage={engage} detail /> : <div className="rounded-3xl border border-border p-12 text-center"><h1 className="text-xl font-semibold">Post unavailable</h1><p className="mt-2 text-sm text-muted-foreground">It may have been removed or shared with a different team.</p></div>}</div>;
}
