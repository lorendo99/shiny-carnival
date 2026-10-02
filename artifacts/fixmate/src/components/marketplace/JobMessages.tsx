import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useListJobMessages, useSendJobMessage, getListJobMessagesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Send, LoaderCircle } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { MarketplaceSafetyActions } from './MarketplaceSafetyActions';

interface JobMessagesProps {
  jobId: string;
  engineerId: string;
  currentRole: 'customer' | 'engineer';
}

export function JobMessages({ jobId, engineerId, currentRole }: JobMessagesProps) {
  const queryClient = useQueryClient();
  const { data: messages, isPending } = useListJobMessages(jobId);
  const sendMessage = useSendJobMessage();
  const [body, setBody] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter messages for this specific thread
  const threadMessages = messages?.filter(m => m.threadEngineerId === engineerId) || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadMessages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    sendMessage.mutate(
      {
        jobId,
        data: { body: body.trim(), engineerId },
      },
      {
        onSuccess: () => {
          trackEvent('job_message_sent', { role: currentRole });
          setBody('');
          queryClient.invalidateQueries({ queryKey: getListJobMessagesQueryKey(jobId) });
        },
        onError: () => {
          trackEvent('job_message_send_failed', { role: currentRole });
        }
      }
    );
  };

  return (
    <div className="job-messages">
      <div className="messages-list" ref={scrollRef}>
        {isPending ? (
          <div className="messages-loading"><LoaderCircle className="animate-spin" /></div>
        ) : threadMessages.length === 0 ? (
          <div className="messages-empty" data-testid="empty-private-messages">No messages yet. Keep questions and updates in this private thread.</div>
        ) : (
          threadMessages.map(msg => {
            const isMe = msg.senderRole === currentRole;
            return (
              <div key={msg.id} className={`message-bubble ${isMe ? 'mine' : 'theirs'}`}>
                <span className="message-sender">{msg.senderDisplayLabel}</span>
                <p>{msg.body}</p>
                {!isMe && (
                  <MarketplaceSafetyActions targetType="message" targetId={msg.id} blockedUserId={msg.senderId} compact />
                )}
              </div>
            );
          })
        )}
      </div>
      <form className="message-form" onSubmit={handleSubmit}>
        <input
          data-testid="input-private-message"
          type="text" 
          placeholder="Message privately about the job"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={sendMessage.isPending}
        />
        <button data-testid="button-send-private-message" type="submit" disabled={sendMessage.isPending || !body.trim()}>
          {sendMessage.isPending ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
