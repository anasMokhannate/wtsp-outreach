"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  Inbox,
  ArrowLeft,
  MessageSquare,
  Send,
  Image,
  FileText,
  Mic,
  MapPin,
  Check,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface Conversation {
  id: string;
  prospectId: string | null;
  fromPhone: string;
  prospectName: string | null;
  prospectPhone: string;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  totalReplies: number;
  totalSent: number;
}

interface ThreadMessage {
  id: string;
  type: "sent" | "received";
  text: string | null;
  templateName?: string | null;
  mediaType?: string | null;
  status: string | null;
  timestamp: string;
}

interface ThreadData {
  prospect: {
    id: string;
    name: string | null;
    phoneNumber: string;
    tags: string | null;
  };
  thread: ThreadMessage[];
  totalSent: number;
  totalReceived: number;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(() => {
    fetch("/api/replies/conversations")
      .then((r) => r.json())
      .then(setConversations)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const openThread = async (conv: Conversation) => {
    if (!conv.prospectId) return;
    setSelectedConv(conv.id);
    setThreadLoading(true);

    const res = await fetch(`/api/replies/thread/${conv.prospectId}`);
    const data = await res.json();
    setThread(data);
    setThreadLoading(false);

    // Refresh conversations to update unread counts
    fetchConversations();
  };

  useEffect(() => {
    if (thread && threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [thread]);

  const goBack = () => {
    setSelectedConv(null);
    setThread(null);
    fetchConversations();
  };

  function mediaIcon(mediaType: string | null | undefined) {
    switch (mediaType) {
      case "image":
        return <Image className="w-3.5 h-3.5 inline mr-1" />;
      case "document":
        return <FileText className="w-3.5 h-3.5 inline mr-1" />;
      case "audio":
        return <Mic className="w-3.5 h-3.5 inline mr-1" />;
      case "location":
        return <MapPin className="w-3.5 h-3.5 inline mr-1" />;
      default:
        return null;
    }
  }

  function statusIcon(status: string | null) {
    switch (status) {
      case "SENT":
        return <Check className="w-3.5 h-3.5 text-gray-400" />;
      case "DELIVERED":
        return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
      case "READ":
        return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Thread view
  if (selectedConv && thread) {
    return (
      <>
        <button
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Inbox
        </button>

        <div className="bg-card-bg border border-border rounded-xl overflow-hidden flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
          {/* Thread header */}
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center">
              <span className="text-accent font-semibold text-sm">
                {(thread.prospect.name || thread.prospect.phoneNumber).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold truncate">
                {thread.prospect.name || thread.prospect.phoneNumber}
              </h2>
              <p className="text-xs text-muted font-mono">
                {thread.prospect.phoneNumber}
              </p>
            </div>
            <div className="flex gap-4 text-xs text-muted">
              <span>{thread.totalSent} sent</span>
              <span>{thread.totalReceived} received</span>
            </div>
          </div>

          {/* Thread messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {threadLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : thread.thread.length === 0 ? (
              <div className="text-center text-sm text-muted py-12">
                No messages in this conversation yet.
              </div>
            ) : (
              thread.thread.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === "sent" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      msg.type === "sent"
                        ? "bg-accent text-white rounded-br-md"
                        : "bg-gray-100 text-gray-900 rounded-bl-md"
                    }`}
                  >
                    {msg.type === "sent" && msg.templateName && (
                      <p className={`text-[10px] font-medium mb-1 ${msg.type === "sent" ? "text-white/70" : "text-gray-500"}`}>
                        Template: {msg.templateName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.mediaType && mediaIcon(msg.mediaType)}
                      {msg.text || "[Empty message]"}
                    </p>
                    <div className={`flex items-center justify-end gap-1 mt-1 ${msg.type === "sent" ? "text-white/60" : "text-gray-400"}`}>
                      <span className="text-[10px]">
                        {format(new Date(msg.timestamp), "HH:mm")}
                      </span>
                      {msg.type === "sent" && statusIcon(msg.status)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Info bar */}
          <div className="px-5 py-3 border-t border-border bg-gray-50 text-center">
            <p className="text-xs text-muted">
              Replies are received via webhook. Messages can only be sent through campaigns.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Conversation list view
  return (
    <>
      <PageHeader
        title="Inbox"
        description="View replies to your WhatsApp outreach messages"
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-7 h-7" />}
          title="No replies yet"
          description="When prospects reply to your campaign messages, they'll appear here. Make sure your webhook is configured in Settings."
        />
      ) : (
        <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openThread(conv)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-accent-light flex items-center justify-center">
                    <span className="text-accent font-semibold text-sm">
                      {(conv.prospectName || conv.prospectPhone).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`text-sm truncate ${conv.unreadCount > 0 ? "font-bold" : "font-medium"}`}>
                      {conv.prospectName || conv.prospectPhone}
                    </h3>
                    <span className="text-[11px] text-muted shrink-0 ml-2">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate ${conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted"}`}>
                      {conv.lastMessage || "[Media message]"}
                    </p>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] text-muted flex items-center gap-0.5">
                        <Send className="w-3 h-3" /> {conv.totalSent}
                      </span>
                      <span className="text-[10px] text-muted flex items-center gap-0.5">
                        <MessageSquare className="w-3 h-3" /> {conv.totalReplies}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
