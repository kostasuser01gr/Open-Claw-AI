import { Fragment, type RefObject } from 'react';
import { Bot, Loader2, MapPin, Search, User } from 'lucide-react';
import Markdown from 'react-markdown';
import { AnimatePresence, motion } from 'motion/react';
import { DynamicUI, type DynamicUIData } from '@/components/DynamicUI';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/domain';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendDynamicMessage: (message: string) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export function ChatMessageList({
  messages,
  isLoading,
  onSendDynamicMessage,
  scrollRef,
}: ChatMessageListProps) {
  return (
    <div
      ref={scrollRef}
      role="log"
      aria-live="polite"
      aria-label="Conversation messages"
      className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
    >
      <AnimatePresence initial={false}>
        {messages.map((message, index) => (
          <motion.article
            key={`${message.role}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            aria-label={message.role === 'user' ? 'User message' : 'Assistant message'}
            className={cn('flex gap-4 max-w-4xl mx-auto group', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
          >
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-lg',
                message.role === 'user' ? 'bg-surface border border-border' : 'bg-gradient-to-br from-orange-500 to-red-600',
              )}
            >
              {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-white" />}
            </div>

            <div className={cn('flex flex-col gap-3 max-w-[85%]', message.role === 'user' ? 'items-end' : 'items-start')}>
              {message.image && (
                <div className="relative group/img">
                  <img
                    src={message.image}
                    alt="Uploaded attachment"
                    className="rounded-2xl max-w-sm border border-border shadow-2xl transition-transform group-hover/img:scale-[1.02]"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div
                className={cn(
                  'px-5 py-4 rounded-2xl text-[15px] leading-relaxed shadow-xl',
                  message.role === 'user'
                    ? 'bg-surface border border-border text-text rounded-tr-none'
                    : 'bg-surface border border-border text-text rounded-tl-none',
                )}
              >
                <div className="markdown-body prose prose-invert max-w-none">
                  <Markdown
                    components={{
                      code(props) {
                        const { children, className } = props;
                        const match = /language-(\w+)/.exec(className || '');

                        if (match?.[1] === 'ui') {
                          try {
                            const data = JSON.parse(String(children).replace(/\n$/, '')) as DynamicUIData;
                            return <DynamicUI data={data} onSendMessage={onSendDynamicMessage} />;
                          } catch {
                            return (
                              <pre className={className}>
                                <code>{children}</code>
                              </pre>
                            );
                          }
                        }

                        return (
                          <code className={className}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </Markdown>
                </div>
              </div>

              {message.groundingMetadata?.groundingChunks && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {message.groundingMetadata.groundingChunks.map((chunk, chunkIndex) => (
                    <Fragment key={chunk.web?.uri || chunk.maps?.uri || chunkIndex}>
                      {chunk.web && (
                        <a
                          href={chunk.web.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] px-2.5 py-1.5 rounded-lg bg-surface border border-border text-text-muted hover:text-text hover:border-orange-500/30 transition-all flex items-center gap-2"
                        >
                          <Search className="w-3 h-3" />
                          {chunk.web.title || 'Web result'}
                        </a>
                      )}
                      {chunk.maps && (
                        <a
                          href={chunk.maps.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500 hover:bg-orange-500/20 transition-all flex items-center gap-2"
                        >
                          <MapPin className="w-3 h-3" />
                          {chunk.maps.title || 'View on Maps'}
                        </a>
                      )}
                    </Fragment>
                  ))}
                </div>
              )}
            </div>
          </motion.article>
        ))}
      </AnimatePresence>

      {isLoading && (
        <div role="status" aria-live="polite" className="flex gap-4 max-w-4xl mx-auto">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0 shadow-lg">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
          <div className="bg-surface border border-border px-5 py-4 rounded-2xl rounded-tl-none shadow-xl">
            <span className="sr-only">Assistant is thinking.</span>
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
