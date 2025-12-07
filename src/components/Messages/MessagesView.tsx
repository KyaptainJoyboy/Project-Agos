import { useEffect, useState } from 'react';
import { Send, AlertTriangle, MessageSquare, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { offlineDB, PendingMessage } from '../../lib/db';
import { syncManager } from '../../lib/syncManager';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface Message {
  id: string;
  sender_id: string | null;
  recipient_id: string | null;
  message_type: 'broadcast' | 'direct' | 'alert';
  subject?: string;
  content: string;
  priority: number;
  is_read: boolean;
  created_at: string;
  sender_profile?: {
    full_name: string;
    role: string;
  };
}

export function MessagesView() {
  const { user, profile } = useAuth();
  const isOnline = useOnlineStatus();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [newMessage, setNewMessage] = useState({
    content: '',
    subject: '',
    messageType: 'direct' as 'broadcast' | 'direct' | 'alert',
    priority: 1,
  });

  useEffect(() => {
    loadMessages();
    loadPendingMessages();

    const messagesChannel = supabase
      .channel('messages-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${user?.id}`,
      }, () => {
        loadMessages();
      })
      .subscribe();

    return () => {
      messagesChannel.unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (isOnline) {
      syncManager.requestBackgroundSync('sync-messages');
      loadPendingMessages();
    }
  }, [isOnline]);

  const loadMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:users_profile!messages_sender_id_fkey(full_name, role)
        `)
        .or(`recipient_id.eq.${user.id},message_type.eq.broadcast`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingMessages = async () => {
    try {
      const pending = await offlineDB.getPendingMessages();
      setPendingMessages(pending);
    } catch (error) {
      console.error('Error loading pending messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.content.trim() || !user) return;

    const messageData: PendingMessage = {
      id: crypto.randomUUID(),
      content: newMessage.content,
      subject: newMessage.subject || undefined,
      messageType: newMessage.messageType,
      priority: newMessage.priority,
      timestamp: Date.now(),
      syncStatus: 'pending',
    };

    try {
      if (isOnline) {
        const { error } = await supabase.from('messages').insert({
          sender_id: user.id,
          recipient_id: null,
          message_type: newMessage.messageType,
          subject: newMessage.subject || null,
          content: newMessage.content,
          priority: newMessage.priority,
          sync_status: 'synced',
        });

        if (error) throw error;
      } else {
        await offlineDB.addPendingMessage(messageData);
        setPendingMessages(prev => [...prev, messageData]);
      }

      setNewMessage({ content: '', subject: '', messageType: 'direct', priority: 1 });
      setShowCompose(false);
      loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      await offlineDB.addPendingMessage(messageData);
      setPendingMessages(prev => [...prev, messageData]);
      alert('Message saved offline and will be sent when connection is restored.');
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', messageId);

      if (!error) {
        setMessages(prev => prev.map(msg =>
          msg.id === messageId ? { ...msg, is_read: true } : msg
        ));
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'text-red-600 bg-red-50 border-red-200';
    if (priority >= 3) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 4) return 'Urgent';
    if (priority >= 3) return 'High';
    if (priority >= 2) return 'Normal';
    return 'Low';
  };

  const formatTimestamp = (timestamp: string | number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-16">
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Messages</h1>
        {(profile?.role === 'personnel' || profile?.role === 'admin') && (
          <button
            onClick={() => setShowCompose(!showCompose)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            New
          </button>
        )}
      </div>

      {!isOnline && pendingMessages.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 p-3">
          <div className="flex items-center gap-2 text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>{pendingMessages.length} message(s) waiting to sync</span>
          </div>
        </div>
      )}

      {showCompose && (
        <div className="bg-white border-b border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Compose Message</h2>
            <button onClick={() => setShowCompose(false)} className="text-slate-500 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <input
            type="text"
            placeholder="Subject (optional)"
            value={newMessage.subject}
            onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />

          <div className="flex gap-2">
            <select
              value={newMessage.messageType}
              onChange={(e) => setNewMessage(prev => ({ ...prev, messageType: e.target.value as any }))}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="direct">Direct</option>
              <option value="broadcast">Broadcast</option>
              <option value="alert">Alert</option>
            </select>

            <select
              value={newMessage.priority}
              onChange={(e) => setNewMessage(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value={1}>Low Priority</option>
              <option value={2}>Normal</option>
              <option value={3}>High</option>
              <option value={4}>Urgent</option>
            </select>
          </div>

          <textarea
            placeholder="Type your message..."
            value={newMessage.content}
            onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
          />

          <button
            onClick={handleSendMessage}
            disabled={!newMessage.content.trim()}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send Message
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pendingMessages.map((msg) => (
          <div key={msg.id} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                  Pending
                </span>
                <span className="text-xs text-amber-700 font-medium capitalize">{msg.messageType}</span>
              </div>
              <span className="text-xs text-amber-600">{formatTimestamp(msg.timestamp)}</span>
            </div>
            {msg.subject && <p className="font-semibold text-slate-900 mb-1">{msg.subject}</p>}
            <p className="text-sm text-slate-700">{msg.content}</p>
          </div>
        ))}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`bg-white border rounded-lg p-4 cursor-pointer transition-colors ${
              msg.is_read ? 'border-slate-200' : 'border-blue-200 bg-blue-50/30'
            }`}
            onClick={() => !msg.is_read && markAsRead(msg.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPriorityColor(msg.priority)}`}>
                  {getPriorityLabel(msg.priority)}
                </span>
                <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium capitalize">
                  {msg.message_type}
                </span>
                {!msg.is_read && (
                  <span className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium">
                    New
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">{formatTimestamp(msg.created_at)}</span>
            </div>

            {msg.sender_profile && (
              <p className="text-sm text-slate-600 mb-2">
                From: <span className="font-medium">{msg.sender_profile.full_name}</span>
                <span className="text-slate-400 ml-1 capitalize">({msg.sender_profile.role})</span>
              </p>
            )}

            {msg.subject && <p className="font-semibold text-slate-900 mb-1">{msg.subject}</p>}
            <p className="text-sm text-slate-700">{msg.content}</p>
          </div>
        ))}

        {messages.length === 0 && pendingMessages.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No messages yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
