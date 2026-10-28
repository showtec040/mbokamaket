import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Download, LoaderCircle, MessageCircle, RefreshCw, Send, Smartphone, X } from "lucide-react";
import { supabase } from "./lib/supabase";

type MessagesUser = {
  id: string;
  fullName?: string;
  avatar?: string;
  isAnonymous?: boolean;
  businessOwnerId?: string;
};

type MessageTarget = {
  id: string;
  name: string;
  productId: string;
  productTitle: string;
};

type Conversation = {
  id: string;
  buyer_id: string;
  seller_id: string;
  assigned_to?: string | null;
  product_id: string | null;
  last_message_at: string;
  otherUserId: string;
  otherName: string;
  otherAvatar: string;
  productTitle: string;
  lastMessage: string;
  unread: number;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  product_id?: string | null;
  read: boolean;
  created_at: string;
};

type Props = {
  user: MessagesUser | null;
  target?: MessageTarget | null;
  onClose: () => void;
  onLogin: () => void;
  onDownload: () => void;
  onUnreadCountChange: (count: number) => void;
};

const formatDate = (value: string) => new Date(value).toLocaleString("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "La messagerie n’a pas pu être actualisée.";

export default function MessagesPage({ user, target, onClose, onLogin, onDownload, onUnreadCountChange }: Props) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 639px)").matches);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pushNotice, setPushNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );
  const userCanMessage = Boolean(user && !user.isAnonymous);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const loadConversations = useCallback(async () => {
    await Promise.resolve();
    if (!userCanMessage || !user) {
      setConversations([]);
      setLoading(false);
      onUnreadCountChange(0);
      return;
    }
    if (!supabase) {
      setErrorMessage("La configuration Supabase est absente.");
      setLoading(false);
      return;
    }

    try {
      const participantFilter = `buyer_id.eq.${user.id},seller_id.eq.${user.id}`;
      const { data: directRows, error: directError } = await supabase
        .from("conversations")
        .select("id,buyer_id,seller_id,assigned_to,product_id,last_message_at")
        .or(participantFilter)
        .order("last_message_at", { ascending: false })
        .limit(50);
      if (directError) throw directError;

      let rows = directRows ?? [];
      if (user.businessOwnerId && user.businessOwnerId !== user.id) {
        const { data: teamRows, error: teamError } = await supabase
          .from("conversations")
          .select("id,buyer_id,seller_id,assigned_to,product_id,last_message_at")
          .eq("seller_id", user.businessOwnerId)
          .order("last_message_at", { ascending: false })
          .limit(50);
        if (teamError) throw teamError;
        rows = [...rows, ...(teamRows ?? [])];
      }

      const uniqueRows = Array.from(new Map(rows.map((row) => [row.id, row])).values());
      if (!uniqueRows.length) {
        setConversations([]);
        setSelectedConversationId(null);
        onUnreadCountChange(0);
        return;
      }

      const conversationIds = uniqueRows.map((row) => row.id);
      const relatedUserIds = Array.from(new Set(uniqueRows.map((row) =>
        row.buyer_id === user.id ? row.seller_id : row.buyer_id,
      )));
      const productIds = Array.from(new Set(uniqueRows.map((row) => row.product_id).filter((id): id is string => Boolean(id))));
      const [messagesResult, profilesResult, productsResult] = await Promise.all([
        supabase.from("messages")
          .select("id,conversation_id,sender_id,recipient_id,text,read,created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("public_profiles")
          .select("id,name,business_name,avatar")
          .in("id", relatedUserIds),
        productIds.length
          ? supabase.from("produits").select("id,title").in("id", productIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (messagesResult.error) throw messagesResult.error;
      if (profilesResult.error) throw profilesResult.error;
      if (productsResult.error) throw productsResult.error;

      const profileMap = new Map((profilesResult.data ?? []).map((profile) => [
        profile.id,
        { name: profile.business_name || profile.name || "Utilisateur", avatar: profile.avatar || "" },
      ]));
      const productMap = new Map((productsResult.data ?? []).map((product) => [product.id, product.title || "Produit"]));
      const latestByConversation = new Map<string, Message>();
      const unreadByConversation = new Map<string, number>();
      let unreadCount = 0;
      for (const message of messagesResult.data ?? []) {
        if (!latestByConversation.has(message.conversation_id)) latestByConversation.set(message.conversation_id, message);
        if (message.recipient_id === user.id && !message.read) {
          unreadCount += 1;
          unreadByConversation.set(message.conversation_id, (unreadByConversation.get(message.conversation_id) ?? 0) + 1);
        }
      }
      const mapped = uniqueRows.map((row) => {
        const otherUserId = row.buyer_id === user.id ? row.seller_id : row.buyer_id;
        const profile = profileMap.get(otherUserId);
        return {
          ...row,
          otherUserId,
          otherName: profile?.name || "Utilisateur",
          otherAvatar: profile?.avatar || "",
          productTitle: row.product_id ? productMap.get(row.product_id) || "Produit" : "",
          lastMessage: latestByConversation.get(row.id)?.text || "",
          unread: unreadByConversation.get(row.id) ?? 0,
        };
      }).sort((first, second) => new Date(second.last_message_at).getTime() - new Date(first.last_message_at).getTime());
      setConversations(mapped);
      onUnreadCountChange(unreadCount);
      setSelectedConversationId((current) => {
        if (current && mapped.some((conversation) => conversation.id === current)) return current;
        return target
          ? mapped.find((conversation) => conversation.otherUserId === target.id && conversation.product_id === target.productId)?.id ?? null
          : mapped[0]?.id ?? null;
      });
    } catch (loadError) {
      setErrorMessage(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange, target, user, userCanMessage]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadConversations(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadConversations, refreshKey]);

  const loadSelectedMessages = useCallback(async () => {
    await Promise.resolve();
    if (!selectedConversationId || !user || !supabase) {
      setMessages([]);
      return;
    }
    const { data, error } = await supabase
      .from("messages")
      .select("id,conversation_id,sender_id,recipient_id,text,read,created_at")
      .eq("conversation_id", selectedConversationId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    const orderedMessages = (data ?? []).reverse() as Message[];
    setMessages(orderedMessages);

    const unreadIds = orderedMessages
      .filter((message) => message.recipient_id === user.id && !message.read)
      .map((message) => message.id);
    if (unreadIds.length) {
      const { error: markReadError } = await supabase
        .from("messages")
        .update({ read: true })
        .in("id", unreadIds);
      if (markReadError) {
        setErrorMessage(markReadError.message);
        return;
      }
      setMessages((current) => current.map((message) => unreadIds.includes(message.id) ? { ...message, read: true } : message));
      setConversations((current) => current.map((conversation) => conversation.id === selectedConversationId ? { ...conversation, unread: 0 } : conversation));
      void loadConversations();
    }
  }, [loadConversations, selectedConversationId, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSelectedMessages(); }, 0);
    const client = supabase;
    if (!selectedConversationId || !client) return () => window.clearTimeout(timer);
    const channel = client
      .channel(`web-messages-${selectedConversationId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${selectedConversationId}`,
      }, () => { void loadSelectedMessages(); })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[messages] synchronisation temps réel indisponible", status);
        }
      });
    return () => {
      window.clearTimeout(timer);
      void client.removeChannel(channel);
    };
  }, [loadSelectedMessages, selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const ensureConversation = async () => {
    const client = supabase;
    if (!client || !user || !target) throw new Error("Sélectionnez une conversation avant d’envoyer un message.");
    if (target.id === user.id) throw new Error("Vous ne pouvez pas vous envoyer un message à vous-même.");

    const [profileResult, blockedResult] = await Promise.all([
      client.from("public_profiles").select("id,allow_messages,account_type").eq("id", target.id).maybeSingle(),
      client.from("blocked_users")
        .select("id")
        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${target.id}),and(blocker_id.eq.${target.id},blocked_id.eq.${user.id})`)
        .limit(1)
        .maybeSingle(),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (blockedResult.error) throw blockedResult.error;
    if (!profileResult.data) throw new Error("Le destinataire est introuvable.");
    if (profileResult.data.allow_messages === false) throw new Error("Ce compte n’accepte pas les messages privés.");
    if (blockedResult.data) throw new Error("Vous ne pouvez pas envoyer de message à cet utilisateur.");

    if (profileResult.data.account_type === "boutique_pro" || profileResult.data.account_type === "magasin_pro") {
      const { data, error } = await client.rpc("get_or_create_business_conversation", { p_product_id: target.productId });
      if (error) throw error;
      const businessConversation = Array.isArray(data) ? data[0] : data;
      if (!businessConversation?.conversation_id) throw new Error("La conversation professionnelle n’a pas pu être créée.");
      return {
        id: businessConversation.conversation_id as string,
        buyer_id: user.id,
        seller_id: target.id,
        assigned_to: businessConversation.assigned_to as string | null | undefined,
      };
    }

    const buyerId = user.id;
    const sellerId = target.id;
    const findExisting = () => {
      const query = client.from("conversations").select("id,buyer_id,seller_id,product_id").eq("buyer_id", buyerId).eq("seller_id", sellerId).eq("product_id", target.productId).limit(1);
      return query.maybeSingle();
    };
    const existingResult = await findExisting();
    if (existingResult.error) throw existingResult.error;
    if (existingResult.data) return { ...existingResult.data, assigned_to: null };

    const createdResult = await client.from("conversations")
      .insert({ buyer_id: buyerId, seller_id: sellerId, product_id: target.productId })
      .select("id,buyer_id,seller_id,product_id")
      .single();
    if (createdResult.error?.code === "23505") {
      const concurrentResult = await findExisting();
      if (concurrentResult.error) throw concurrentResult.error;
      if (concurrentResult.data) return { ...concurrentResult.data, assigned_to: null };
    }
    if (createdResult.error) throw createdResult.error;
    return { ...createdResult.data, assigned_to: null };
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    if (!userCanMessage || !user) {
      setErrorMessage("Connectez-vous pour envoyer un message.");
      return;
    }
    if (!supabase) {
      setErrorMessage("La configuration Supabase est absente.");
      return;
    }
    setSending(true);
    setErrorMessage("");
    setPushNotice("");
    try {
      let conversationId = selectedConversationId;
      let recipientId: string | undefined;
      if (!conversationId && target) {
        const conversation = await ensureConversation();
        conversationId = conversation.id;
        recipientId = conversation.buyer_id === user.id
          ? conversation.assigned_to || conversation.seller_id
          : conversation.buyer_id;
      } else if (selectedConversation) {
        recipientId = selectedConversation.buyer_id === user.id
          ? selectedConversation.assigned_to || selectedConversation.seller_id
          : selectedConversation.buyer_id;
      }
      if (!conversationId || !recipientId) throw new Error("Sélectionnez une conversation valide.");
      if (recipientId === user.id) throw new Error("Vous ne pouvez pas vous envoyer un message à vous-même.");

      const [recipientResult, blockedResult] = await Promise.all([
        supabase.from("public_profiles").select("allow_messages").eq("id", recipientId).maybeSingle(),
        supabase.from("blocked_users")
          .select("id")
          .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${user.id})`)
          .limit(1)
          .maybeSingle(),
      ]);
      if (recipientResult.error) throw recipientResult.error;
      if (blockedResult.error) throw blockedResult.error;
      if (!recipientResult.data) throw new Error("Le destinataire est introuvable.");
      if (recipientResult.data.allow_messages === false) throw new Error("Ce compte n’accepte pas les messages privés.");
      if (blockedResult.data) throw new Error("Vous ne pouvez pas envoyer de message à cet utilisateur.");

      const { data, error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        recipient_id: recipientId,
        text,
        read: false,
        product_id: target?.productId ?? selectedConversation?.product_id ?? null,
      }).select("id,conversation_id,sender_id,recipient_id,text,product_id,read,created_at").single();
      if (error) throw error;

      const { error: conversationUpdateError } = await supabase.from("conversations")
        .update({ last_message_at: data.created_at })
        .eq("id", conversationId);
      if (conversationUpdateError) {
        console.warn("[messages] date de dernière activité non actualisée", conversationUpdateError);
      }
      setDraft("");
      setSelectedConversationId(conversationId);
      setMessages((current) => [...current, data as Message]);
      setRefreshKey((current) => current + 1);
      try {
        const { data: pushResult, error: pushError } = await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: recipientId,
            notification_type: "MESSAGE_RECEIVED",
            event_id: `message_received:${data.id}`,
            related_id: data.id,
            related_type: "message",
            persist_notification: false,
            tag: "message",
            data: {
              route: "Messages",
              sender_id: user.id,
              recipient_id: recipientId,
              conversation_id: conversationId,
              product_id: data.product_id,
            },
          },
        });
        if (pushError) throw pushError;
        if (pushResult?.ok !== true) {
          console.warn("[messages] message enregistré, notification push non confirmée", pushResult);
          setPushNotice("Message envoyé. La notification push n’a pas été confirmée; le destinataire le retrouvera dans sa messagerie.");
        }
      } catch (pushError) {
        console.warn("[messages] message enregistré, échec de la notification push", pushError);
        setPushNotice("Message envoyé. La notification push n’a pas pu être envoyée; le destinataire le retrouvera dans sa messagerie.");
      }
    } catch (sendError) {
      setErrorMessage(getErrorMessage(sendError));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#f6f8fc] text-slate-900" role="dialog" aria-modal="true" aria-label="Messagerie Mbokamarket">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-circle btn-sm" aria-label="Fermer la messagerie"><X size={18} /></button>
          <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-[#143ca8]"><MessageCircle size={19} /></span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-bold">Messagerie</h1>
            <p className="text-xs text-slate-500">Échanges par texte avec la communauté</p>
          </div>
          {!isMobile && userCanMessage && (
            <button type="button" onClick={() => setRefreshKey((current) => current + 1)} disabled={loading} className="btn btn-ghost btn-circle btn-sm" aria-label="Actualiser les conversations">
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          )}
        </div>
      </header>

      {isMobile ? (
        <main className="mx-auto max-w-lg px-5 py-10 sm:py-16">
          <section className="rounded-3xl border border-blue-100 bg-white p-6 text-center shadow-sm sm:p-9">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-blue-50 text-[#143ca8]"><Smartphone size={31} /></span>
            <h2 className="mt-5 font-display text-2xl font-bold">Continuez vos échanges dans l’application</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">La messagerie complète est disponible dans l’application Mbokamarket. Téléchargez-la pour retrouver vos conversations et contacter les vendeurs.</p>
            <button type="button" onClick={onDownload} className="btn mt-6 w-full bg-[#143ca8] text-white hover:bg-[#102f85]">
              <Download size={17} /> Télécharger l’application
            </button>
          </section>
        </main>
      ) : !userCanMessage ? (
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <MessageCircle className="mx-auto size-12 text-slate-300" />
            <h2 className="mt-4 font-display text-xl font-bold">Connectez-vous pour accéder à vos messages</h2>
            <button type="button" onClick={onLogin} className="btn mt-5 bg-[#143ca8] text-white">Se connecter</button>
          </section>
        </main>
      ) : (
        <main className="mx-auto grid h-[calc(100dvh-4.25rem)] max-w-7xl grid-cols-[20rem_minmax(0,1fr)] gap-4 p-4 sm:px-6">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-4">
              <h2 className="font-display font-bold">Conversations</h2>
              <p className="mt-1 text-xs text-slate-500">{conversations.length} conversation(s)</p>
            </div>
            {loading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500"><LoaderCircle size={18} className="mr-2 animate-spin" />Chargement...</div>
            ) : conversations.length ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => { setSelectedConversationId(conversation.id); setErrorMessage(""); }}
                    className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${selectedConversationId === conversation.id ? "bg-blue-50" : ""}`}
                  >
                    {conversation.otherAvatar
                      ? <img src={conversation.otherAvatar} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                      : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-50 text-[#143ca8]"><MessageCircle size={17} /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <strong className="truncate text-sm">{conversation.otherName}</strong>
                        {conversation.unread > 0 && <span className="badge badge-primary badge-xs">{conversation.unread}</span>}
                      </span>
                      {conversation.productTitle && <span className="block truncate text-[11px] font-medium text-[#143ca8]">{conversation.productTitle}</span>}
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{conversation.lastMessage || "Aucun message"}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <MessageCircle className="size-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold">Aucune conversation</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Ouvrez une annonce et choisissez « Écrire au vendeur » pour démarrer un échange.</p>
              </div>
            )}
          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {selectedConversation ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                  {selectedConversation.otherAvatar
                    ? <img src={selectedConversation.otherAvatar} alt="" className="size-10 rounded-full object-cover" />
                    : <span className="grid size-10 place-items-center rounded-full bg-blue-50 text-[#143ca8]"><MessageCircle size={17} /></span>}
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">{selectedConversation.otherName}</h2>
                    {selectedConversation.productTitle && <p className="truncate text-xs text-slate-500">{selectedConversation.productTitle}</p>}
                  </div>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-5">
                  {messages.length ? messages.map((message) => {
                    const isOwnMessage = message.sender_id === user?.id;
                    return (
                      <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isOwnMessage ? "rounded-br-md bg-[#143ca8] text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
                          <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
                          <time className={`mt-1 block text-right text-[10px] ${isOwnMessage ? "text-blue-100" : "text-slate-400"}`}>{formatDate(message.created_at)}</time>
                        </div>
                      </div>
                    );
                  }) : <p className="py-10 text-center text-sm text-slate-500">Commencez la conversation en envoyant un message texte.</p>}
                  <div ref={messagesEndRef} />
                </div>
                {pushNotice && <p role="status" className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">{pushNotice}</p>}
                <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-2 border-t border-slate-100 p-3 sm:p-4">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    maxLength={4000}
                    rows={1}
                    placeholder="Écrire un message..."
                    aria-label="Message texte"
                    className="textarea textarea-bordered max-h-32 min-h-11 flex-1 resize-y"
                  />
                  <button type="submit" disabled={sending || !draft.trim()} className="btn size-11 min-h-11 border-0 bg-[#143ca8] p-0 text-white" aria-label="Envoyer le message">
                    {sending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </form>
              </>
            ) : target ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                  <span className="grid size-10 place-items-center rounded-full bg-blue-50 text-[#143ca8]"><MessageCircle size={17} /></span>
                  <div><h2 className="font-bold">{target.name}</h2><p className="text-xs text-slate-500">{target.productTitle}</p></div>
                </div>
                <div className="flex flex-1 items-center justify-center bg-slate-50/70 p-6 text-center text-sm text-slate-500">Envoyez votre premier message au vendeur.</div>
                {pushNotice && <p role="status" className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">{pushNotice}</p>}
                <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-2 border-t border-slate-100 p-3 sm:p-4">
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} rows={1} placeholder="Écrire un message..." aria-label="Message texte" className="textarea textarea-bordered max-h-32 min-h-11 flex-1 resize-y" />
                  <button type="submit" disabled={sending || !draft.trim()} className="btn size-11 min-h-11 border-0 bg-[#143ca8] p-0 text-white" aria-label="Envoyer le message">
                    {sending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <MessageCircle className="size-12 text-slate-300" />
                <h2 className="mt-4 font-semibold">Vos messages</h2>
                <p className="mt-1 text-sm text-slate-500">Sélectionnez une conversation pour lire et envoyer des messages texte.</p>
              </div>
            )}
          </section>
        </main>
      )}

      {errorMessage && !isMobile && (
        <div role="alert" className="fixed bottom-5 left-1/2 z-20 flex max-w-xl -translate-x-1/2 items-center gap-3 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700 shadow-lg">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage("")} aria-label="Fermer le message d’erreur"><X size={15} /></button>
        </div>
      )}
      {loading && !isMobile && conversations.length === 0 && (
        <div className="sr-only" role="status"><LoaderCircle className="animate-spin" /> Chargement des conversations</div>
      )}
    </div>
  );
}
