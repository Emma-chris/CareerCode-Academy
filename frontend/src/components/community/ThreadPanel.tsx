import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Send, MessageSquare, ArrowLeft } from 'lucide-react';
import { useCommunityStore, ChannelMessage } from '@/store/communityStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ThreadPanel() {
  const { activeThread, threadMessages, replyToThread, fetchThread } = useCommunityStore();
  const { user } = useAuthStore();
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages]);

  const handleReply = async () => {
    if (!replyText.trim() || !activeThread || sending) return;
    setSending(true);
    await replyToThread(activeThread.id, replyText.trim());
    setReplyText('');
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  };

  if (!activeThread) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 380, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="flex-shrink-0 bg-gray-900/80 border-l border-gray-700/50 h-full flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-400" />
          <h3 className="font-semibold text-gray-200">Thread</h3>
          <span className="text-xs text-gray-500">{threadMessages.length} replies</span>
        </div>
        <button
          onClick={() => useCommunityStore.setState({ activeThread: null, threadMessages: [] })}
          className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Original message */}
      <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-800/30">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {(activeThread.author_name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-sm text-gray-200">{activeThread.author_name}</span>
              <span className="text-[11px] text-gray-500">{formatTime(activeThread.created_at)}</span>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{activeThread.content}</p>
          </div>
        </div>
      </div>

      {/* Thread replies */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {threadMessages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No replies yet. Start the conversation!</p>
          </div>
        ) : (
          threadMessages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                {(msg.author_name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-xs text-gray-200">{msg.author_name}</span>
                  <span className="text-[10px] text-gray-500">{formatTime(msg.created_at)}</span>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply composer */}
      <div className="p-3 border-t border-gray-700/50 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply in thread..."
            className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-primary-500/50 max-h-24"
            rows={1}
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim() || sending}
            className={cn(
              'p-2 rounded-lg transition-colors flex-shrink-0',
              replyText.trim() ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-gray-800 text-gray-600'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
