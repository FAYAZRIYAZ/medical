import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, MessageSquare, Plus, Search, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth.store';
import { initials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface ChatParticipant {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role?: string;
}

interface ChatRoom {
  _id: string;
  name?: string;
  type: string;
  participants: ChatParticipant[];
  lastMessage?: { text: string; sentAt: string };
}

interface ChatMessage {
  _id: string;
  senderId: { _id: string; firstName: string; lastName: string; avatar?: string };
  text?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
}

interface StaffUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

function participantName(p: ChatParticipant) {
  return `${p.firstName} ${p.lastName}`.trim() || 'Unknown';
}

function NewConversationDialog({ onClose, onRoomCreated }: { onClose: () => void; onRoomCreated: (roomId: string) => void }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const qc = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ['users', 'staff', debouncedSearch],
    queryFn: async () => {
      const res = await api.get<{ data: StaffUser[] }>('/auth/users', { params: { q: debouncedSearch } });
      return res.data.data ?? [];
    },
  });

  const createRoom = useMutation({
    mutationFn: (participantId: string) =>
      api.post<{ data: ChatRoom }>('/chat/rooms', { participantId, type: 'direct' }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['chat', 'rooms'] });
      onRoomCreated(res.data.data._id);
      onClose();
    },
  });

  const roleColors: Record<string, string> = {
    doctor: 'bg-blue-100 text-blue-700',
    nurse: 'bg-green-100 text-green-700',
    hospital_admin: 'bg-purple-100 text-purple-700',
    receptionist: 'bg-yellow-100 text-yellow-700',
    pharmacist: 'bg-orange-100 text-orange-700',
    lab_technician: 'bg-pink-100 text-pink-700',
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>New Conversation</DialogTitle>
      </DialogHeader>
      <div className="mt-2 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search staff by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-80 overflow-y-auto space-y-1">
          {(users ?? []).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {debouncedSearch ? 'No staff found' : 'Start typing to search staff'}
            </p>
          ) : (
            (users ?? []).map((u) => (
              <button
                key={u._id}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                onClick={() => createRoom.mutate(u._id)}
                disabled={createRoom.isPending}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-medical-blue text-white text-sm">
                    {initials(`${u.firstName} ${u.lastName}`)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roleColors[u.role] ?? 'bg-gray-100 text-gray-600')}>
                  {u.role.replace(/_/g, ' ')}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </DialogContent>
  );
}

export function ChatPage() {
  const { roomId } = useParams<{ roomId?: string }>();
  const { user } = useAuthStore();
  const [selectedRoom, setSelectedRoom] = useState(roomId ?? '');
  const [message, setMessage] = useState('');
  const [newConvOpen, setNewConvOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: rooms } = useQuery({
    queryKey: ['chat', 'rooms'],
    queryFn: async () => {
      const res = await api.get<{ data: ChatRoom[] }>('/chat/rooms');
      return res.data.data ?? [];
    },
    refetchInterval: 10_000,
  });

  const { data: messages } = useQuery({
    queryKey: ['chat', 'messages', selectedRoom],
    queryFn: async () => {
      const res = await api.get<{ data: ChatMessage[] }>(`/chat/rooms/${selectedRoom}/messages`);
      return res.data.data ?? [];
    },
    enabled: !!selectedRoom,
    refetchInterval: 3000,
  });

  const sendMessage = useMutation({
    mutationFn: () =>
      api.post(`/chat/rooms/${selectedRoom}/messages`, { text: message }),
    onSuccess: () => {
      setMessage('');
      void qc.invalidateQueries({ queryKey: ['chat', 'messages', selectedRoom] });
      void qc.invalidateQueries({ queryKey: ['chat', 'rooms'] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const roomList = rooms ?? [];
  const messageList = messages ?? [];

  const getRoomName = (room: ChatRoom): string => {
    if (room.name) return room.name;
    const other = room.participants.find((p) => p._id !== user?.id);
    return other ? participantName(other) : 'Unknown';
  };

  const getLastMessageTime = (room: ChatRoom) => {
    if (!room.lastMessage?.sentAt) return '';
    const d = new Date(room.lastMessage.sentAt);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const activeRoom = roomList.find((r) => r._id === selectedRoom);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Messages</h2>
          <button
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title="New conversation"
            onClick={() => setNewConvOpen(true)}
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {roomList.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setNewConvOpen(true)}>
                Start a conversation
              </Button>
            </div>
          ) : (
            roomList.map((room) => (
              <button
                key={room._id}
                className={cn(
                  'w-full text-left p-3 hover:bg-muted/50 transition-colors border-b',
                  selectedRoom === room._id && 'bg-muted/70'
                )}
                onClick={() => setSelectedRoom(room._id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-medical-blue text-white text-sm">
                      {initials(getRoomName(room))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-medium truncate">{getRoomName(room)}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{getLastMessageTime(room)}</span>
                    </div>
                    {room.lastMessage ? (
                      <p className="text-xs text-muted-foreground truncate">{room.lastMessage.text}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No messages yet</p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {selectedRoom && activeRoom ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-medical-blue/10 text-medical-blue text-sm">
                  {initials(getRoomName(activeRoom))}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-sm">{getRoomName(activeRoom)}</p>
                <p className="text-xs text-muted-foreground">
                  {activeRoom.participants.length} participant{activeRoom.participants.length !== 1 ? 's' : ''} · {activeRoom.type} chat
                </p>
              </div>
              <div className="flex gap-1">
                {activeRoom.participants
                  .filter((p) => p._id !== user?.id)
                  .slice(0, 3)
                  .map((p) => (
                    <Avatar key={p._id} className="h-7 w-7">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {initials(participantName(p))}
                      </AvatarFallback>
                    </Avatar>
                  ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {messageList.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
                  </div>
                </div>
              ) : (
                messageList.map((msg) => {
                  const isOwn = msg.senderId._id === user?.id;
                  const senderName = `${msg.senderId.firstName} ${msg.senderId.lastName}`.trim();
                  return (
                    <div key={msg._id} className={cn('flex gap-2 items-end', isOwn && 'flex-row-reverse')}>
                      <Avatar className="h-7 w-7 shrink-0 mb-1">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {initials(senderName || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn('max-w-[70%]', isOwn && 'items-end flex flex-col')}>
                        {!isOwn && (
                          <p className="text-xs text-muted-foreground mb-1 px-1">{senderName}</p>
                        )}
                        <div className={cn(
                          'rounded-2xl px-3 py-2',
                          isOwn
                            ? 'bg-medical-blue text-white rounded-tr-sm'
                            : 'bg-white border rounded-tl-sm shadow-sm'
                        )}>
                          {msg.fileUrl ? (
                            <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="text-sm underline">
                              {msg.fileName ?? 'File'}
                            </a>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                          )}
                          <p className={cn('text-xs mt-0.5', isOwn ? 'text-blue-200' : 'text-muted-foreground')}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (message.trim()) sendMessage.mutate();
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Type a message…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (message.trim()) sendMessage.mutate(); } }}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!message.trim() || sendMessage.isPending}
                  className="bg-medical-blue hover:bg-medical-blue/90 px-3"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <MessageSquare className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900">Select a conversation</p>
              <p className="text-sm text-muted-foreground mt-1">
                Choose from your conversations on the left, or start a new one.
              </p>
              <Button className="mt-4 gap-2 bg-medical-blue hover:bg-medical-blue/90" onClick={() => setNewConvOpen(true)}>
                <Plus className="h-4 w-4" /> New Conversation
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
        <NewConversationDialog
          onClose={() => setNewConvOpen(false)}
          onRoomCreated={(id) => setSelectedRoom(id)}
        />
      </Dialog>
    </div>
  );
}
