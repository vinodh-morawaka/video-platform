"use client";

import { useState } from "react";
import Link from "next/link";
import CommentForm from "@/components/CommentForm";

type CommentAuthor = { username: string; avatarUrl: string | null };
type Comment = {
  id: string;
  body: string;
  createdAt: Date | string;
  author: CommentAuthor;
  replies: { id: string; body: string; createdAt: Date | string; author: CommentAuthor }[];
};

function CommentRow({
  comment,
  videoId,
  isReply = false,
  loggedIn,
}: {
  comment: { id: string; body: string; createdAt: Date | string; author: CommentAuthor };
  videoId: string;
  isReply?: boolean;
  loggedIn: boolean;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-paper-100">{comment.author.username}</span>
        <span className="text-xs text-paper-100/40">
          {new Date(comment.createdAt).toLocaleDateString()}
        </span>
      </div>
      <p className="text-sm text-paper-100/70">{comment.body}</p>
      {!isReply && loggedIn ? (
        <button
          onClick={() => setReplying((r) => !r)}
          className="w-fit text-xs text-paper-100/50 hover:text-marquee-500"
        >
          {replying ? "Cancel" : "Reply"}
        </button>
      ) : null}
      {replying ? (
        <div className="ml-4 mt-1">
          <CommentForm
            videoId={videoId}
            parentId={comment.id}
            placeholder="Write a reply…"
            autoFocus
            onPosted={() => setReplying(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function CommentsSection({
  videoId,
  comments,
  loggedIn,
}: {
  videoId: string;
  comments: Comment[];
  loggedIn: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-ink-800 pt-4">
      <h2 className="text-sm font-medium text-paper-100/70">{comments.length} comments</h2>

      {loggedIn ? (
        <CommentForm videoId={videoId} />
      ) : (
        <p className="text-sm text-paper-100/50">
          <Link href="/login" className="text-marquee-500 underline">
            Log in
          </Link>{" "}
          to leave a comment.
        </p>
      )}

      {comments.map((c) => (
        <div key={c.id} className="flex flex-col gap-3">
          <CommentRow comment={c} videoId={videoId} loggedIn={loggedIn} />
          {c.replies.length > 0 ? (
            <div className="ml-4 flex flex-col gap-3 border-l border-ink-800 pl-4">
              {c.replies.map((r) => (
                <CommentRow key={r.id} comment={r} videoId={videoId} isReply loggedIn={loggedIn} />
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
