import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/firebase';
import type { ChatMessage } from '@/types/domain';

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

const CONVERSATIONS_COLLECTION = 'conversations';
const MAX_CONVERSATIONS = 50;

function generateTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) return 'New Conversation';
  const text = firstUserMessage.content.slice(0, 60);
  return text.length < firstUserMessage.content.length ? `${text}...` : text;
}

export function useConversations(user: User | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, CONVERSATIONS_COLLECTION),
        where('uid', '==', user.uid),
        orderBy('updatedAt', 'desc'),
        limit(MAX_CONVERSATIONS),
      );
      const snapshot = await getDocs(q);
      setConversations(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: typeof data.title === 'string' ? data.title : 'Untitled',
            createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
            updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
            messageCount: typeof data.messageCount === 'number' ? data.messageCount : 0,
          };
        }),
      );
    } catch {
      // Silently fail — conversations are supplementary
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const saveConversation = useCallback(
    async (messages: ChatMessage[]): Promise<string | null> => {
      if (!user || messages.length === 0) return null;

      const title = generateTitle(messages);
      const now = new Date().toISOString();
      const serialized = messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.groundingMetadata ? { groundingMetadata: m.groundingMetadata } : {}),
      }));

      try {
        if (activeConversationId) {
          await updateDoc(doc(db, CONVERSATIONS_COLLECTION, activeConversationId), {
            title,
            messages: serialized,
            messageCount: messages.length,
            updatedAt: now,
            serverUpdatedAt: serverTimestamp(),
          });
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversationId
                ? { ...c, title, messageCount: messages.length, updatedAt: now }
                : c,
            ),
          );
          return activeConversationId;
        }

        const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), {
          uid: user.uid,
          title,
          messages: serialized,
          messageCount: messages.length,
          createdAt: now,
          updatedAt: now,
          serverCreatedAt: serverTimestamp(),
          serverUpdatedAt: serverTimestamp(),
        });

        const newConversation: Conversation = {
          id: docRef.id,
          title,
          createdAt: now,
          updatedAt: now,
          messageCount: messages.length,
        };

        setActiveConversationId(docRef.id);
        setConversations((prev) => [newConversation, ...prev].slice(0, MAX_CONVERSATIONS));
        return docRef.id;
      } catch {
        return null;
      }
    },
    [user, activeConversationId],
  );

  const loadConversation = useCallback(
    async (conversationId: string): Promise<ChatMessage[]> => {
      try {
        const { getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId));
        if (!snap.exists()) return [];

        const data = snap.data();
        if (data.uid !== user?.uid) return [];

        setActiveConversationId(conversationId);

        const messages = Array.isArray(data.messages) ? data.messages : [];
        return messages.map((m: Record<string, unknown>) => ({
          role: m.role === 'model' ? 'model' : 'user',
          content: typeof m.content === 'string' ? m.content : '',
          groundingMetadata: m.groundingMetadata as ChatMessage['groundingMetadata'],
        })) as ChatMessage[];
      } catch {
        return [];
      }
    },
    [user],
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await deleteDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId));
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (activeConversationId === conversationId) {
          setActiveConversationId(null);
        }
      } catch {
        // Silently fail
      }
    },
    [activeConversationId],
  );

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const clearAll = useCallback(() => {
    setConversations([]);
    setActiveConversationId(null);
  }, []);

  return {
    conversations,
    activeConversationId,
    isLoading,
    saveConversation,
    loadConversation,
    deleteConversation,
    startNewConversation,
    clearAll,
  };
}
