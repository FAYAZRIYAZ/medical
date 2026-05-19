import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/auth.store';
import { initials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ChatRoom {
  _id: string;
  name?: string;
  participants: { _id: string; name: string }[];
  lastMessage?: { content: string; createdAt: string };
}

interface ChatMessage {
  _id: string;
  senderId: { _id: string; name: string };
  content: string;
  createdAt: string;
}

export function ChatPage() {
  const { roomId } = useParams<{ roomId?: string }>();
  const { user } = useAuthStore();
  const [selectedRoom, setSelectedRoom] = useState(roomId ?? '');
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: rooms } = useQuery({
    queryKey: ['chat', 'rooms'],
    queryFn: async () => {
      const res = await api.get<{ data: ChatRoom[] }>('/chat/rooms');
      return res.data.data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ['chat', 'messages', selectedRoom],
    queryFn: async () => {
      const res = await api.get<{ data: { messages: ChatMessage[] } }>(`/chat/rooms/${selectedRoom}/messages`);
      return res.data.data.messages;
    },
    enabled: !!selectedRoom,
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: () => api.post(`/chat/rooms/${selectedRoom}/messages`, { content: message }),
    onSuccess: () => {
      setMessage('');
      void qc.invalidateQueries({ queryKey: ['chat', 'messages', selectedRoom] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const roomList = rooms ?? [];
  const messageList = messages ?? [];

  const getRoomName = (room: ChatRoom) => {
    if (room.name) return room.name;
    const other = room.participants.find((p) => p._id !== user?.id);
    return other?.name ?? 'Unknown';
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {roomList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">No conversations yet</p>
          ) : (
            roomList.map((room) => (
              <button
                key={room._id}
                className={cn('w-full text-left p-3 hover:bg-muted/50 transition-colors border-b', selectedRoom === room._id && 'bg-muted')}
                onClick={() => setSelectedRoom(room._id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-medical-blue text-white text-sm">{initials(getRoomName(room))}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getRoomName(room)}</p>
                    {room.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate">{room.lastMessage.content}</p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedRoom ? (
          <>
            <div className="p-4 border-b bg-white">
              <p className="font-semibold">{getRoomName(roomList.find((r) => r._id === selectedRoom) ?? {} as ChatRoom)}</p>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
              {messageList.map((msg) => {
                const isOwn = msg.senderId._id === user?.id;
                return (
                  <div key={msg._id} className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">{initials(msg.senderId.name)}</AvatarFallback>
                    </Avatar>
                    <div className={cn('max-w-[70%] rounded-2xl px-3 py-2', isOwn ? 'bg-medical-blue text-white rounded-tr-sm' : 'bg-muted rounded-tl-sm')}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={cn('text-xs mt-0.5', isOwn ? 'text-blue-200' : 'text-muted-foreground')}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white">
              <form
                onSubmit={(e) => { e.preventDefault(); if (message.trim()) sendMessage.mutate(); }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={!message.trim() || sendMessage.isPending} className="bg-medical-blue hover:bg-medical-blue/90">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">Select a conversation</p>
              <p className="text-sm text-muted-foreground mt-1">Choose from your conversations on the left</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
