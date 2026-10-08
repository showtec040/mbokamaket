/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Heart, LoaderCircle, MessageCircle, Star, UserRound } from "lucide-react";
import { supabase } from "./lib/supabase";
import NoticeDialog from "./NoticeDialog";
import type { NoticeDialogVariant } from "./NoticeDialog";

type ProductComment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  like_count: number;
  liked_by_current_user: boolean;
};

type BusinessReview = {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string;
  reviewer_avatar: string | null;
};

type ReviewSummary = {
  average_rating: number;
  total_reviews: number;
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
};

const emptySummary: ReviewSummary = {
  average_rating: 0,
  total_reviews: 0,
  rating_1_count: 0,
  rating_2_count: 0,
  rating_3_count: 0,
  rating_4_count: 0,
  rating_5_count: 0,
};

const businessAccountTypes = new Set(["boutique", "magasin", "boutique_pro", "magasin_pro", "agence_immo"]);

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "";
};

function Stars({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${rating} étoiles sur 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={size} fill={index < rating ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

export default function ProductFeedbackSection({
  productId,
  sellerId,
  sellerName,
  sellerAccountType,
  currentUserId,
  onLogin,
}: {
  productId: string;
  sellerId: string;
  sellerName: string;
  sellerAccountType?: string;
  currentUserId: string | null;
  onLogin: () => void;
}) {
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);
  const [showAllComments, setShowAllComments] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>(emptySummary);
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [myReview, setMyReview] = useState<BusinessReview | null>(null);
  const [hasCompletedOrder, setHasCompletedOrder] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [notice, setNotice] = useState<{
    title: string;
    message: string;
    variant: NoticeDialogVariant;
    requiresLogin?: boolean;
    confirmLabel?: string;
    onConfirm?: () => void;
    destructive?: boolean;
  } | null>(null);
  const isBusiness = businessAccountTypes.has((sellerAccountType ?? "").toLowerCase());
  const canReview = Boolean(currentUserId && currentUserId !== sellerId);

  const loadComments = useCallback(async () => {
    if (!supabase) {
      setCommentsError("La configuration Supabase est absente.");
      setCommentsLoading(false);
      return;
    }
    setCommentsLoading(true);
    setCommentsError("");
    const { data: rows, error } = await supabase
      .from("product_comments")
      .select("id,user_id,content,created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });
    if (error) {
      setCommentsError(error.message || "Impossible de charger les commentaires.");
      setCommentsLoading(false);
      return;
    }
    const commentRows = rows ?? [];
    const userIds = [...new Set(commentRows.map((row) => row.user_id))];
    const commentIds = commentRows.map((row) => row.id);
    const [profilesResult, likesResult] = await Promise.all([
      userIds.length
        ? supabase.from("public_profiles").select("id,name,username,avatar").in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
      commentIds.length
        ? supabase.from("product_comment_likes").select("comment_id,user_id").in("comment_id", commentIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (profilesResult.error || likesResult.error) {
      setCommentsError((profilesResult.error ?? likesResult.error)?.message || "Impossible de charger les réactions.");
      setCommentsLoading(false);
      return;
    }
    const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
    const likes = likesResult.data ?? [];
    setComments(commentRows.map((row) => {
      const profile = profiles.get(row.user_id);
      const commentLikes = likes.filter((like) => like.comment_id === row.id);
      return {
        ...row,
        author_name: profile?.name || profile?.username || "Utilisateur",
        author_avatar: profile?.avatar ?? null,
        like_count: commentLikes.length,
        liked_by_current_user: Boolean(currentUserId && commentLikes.some((like) => like.user_id === currentUserId)),
      };
    }));
    setCommentsLoading(false);
  }, [currentUserId, productId]);

  const loadReviews = useCallback(async () => {
    if (!supabase || !isBusiness) return;
    setReviewsLoading(true);
    setReviewsError("");
    const [summaryResult, reviewsResult, myReviewResult, orderResult] = await Promise.all([
      supabase.from("business_review_summary").select("*").eq("business_id", sellerId).maybeSingle(),
      supabase.from("business_reviews").select("id,reviewer_id,rating,comment,created_at")
        .eq("business_id", sellerId).order("created_at", { ascending: false }).limit(20),
      currentUserId
        ? supabase.from("business_reviews").select("id,reviewer_id,rating,comment,created_at")
            .eq("business_id", sellerId).eq("reviewer_id", currentUserId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      currentUserId
        ? supabase.from("orders").select("id").eq("buyer_id", currentUserId).eq("seller_id", sellerId)
            .eq("business_stage", "completed").limit(1).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    const loadError = summaryResult.error ?? reviewsResult.error ?? myReviewResult.error ?? orderResult.error;
    if (loadError) {
      setReviewsError(loadError.message || "Impossible de charger les avis de cette entreprise.");
      setReviewsLoading(false);
      return;
    }
    const reviewRows = reviewsResult.data ?? [];
    const ownReview = myReviewResult.data ?? null;
    const reviewerIds = [...new Set([...reviewRows.map((review) => review.reviewer_id), ...(ownReview ? [ownReview.reviewer_id] : [])])];
    const profilesResult = reviewerIds.length
      ? await supabase.from("public_profiles").select("id,name,avatar").in("id", reviewerIds)
      : { data: [], error: null };
    if (profilesResult.error) {
      setReviewsError(profilesResult.error.message || "Impossible de charger les profils des auteurs.");
      setReviewsLoading(false);
      return;
    }
    const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
    const attachReviewer = (review: typeof reviewRows[number]): BusinessReview => {
      const profile = profiles.get(review.reviewer_id);
      return {
        ...review,
        reviewer_name: profile?.name || "Utilisateur",
        reviewer_avatar: profile?.avatar ?? null,
      };
    };
    setReviewSummary((summaryResult.data as ReviewSummary | null) ?? emptySummary);
    setReviews(reviewRows.map(attachReviewer));
    setMyReview(ownReview ? attachReviewer(ownReview) : null);
    setHasCompletedOrder(Boolean(orderResult.data));
    setReviewsLoading(false);
  }, [currentUserId, isBusiness, sellerId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    setShowAllComments(false);
    setShowAllReviews(false);
  }, [productId, sellerId]);

  const addComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = commentText.trim();
    if (!currentUserId) {
      setNotice({ title: "Connexion requise", message: "Connectez-vous pour commenter ce produit.", variant: "info", requiresLogin: true });
      return;
    }
    if (!supabase || !content || postingComment) return;
    setPostingComment(true);
    setCommentsError("");
    const { data, error } = await supabase
      .from("product_comments")
      .insert({ product_id: productId, user_id: currentUserId, content })
      .select("id,user_id,content,created_at")
      .single();
    if (error) {
      setCommentsError(error.message || "Impossible d’ajouter le commentaire.");
      setPostingComment(false);
      return;
    }
    setCommentText("");
    setPostingComment(false);
    await loadComments();
    if (!data) setCommentsError("Le commentaire est enregistré, mais la liste n’a pas pu être actualisée.");
  };

  const toggleLike = async (comment: ProductComment) => {
    if (!currentUserId) {
      setNotice({ title: "Connexion requise", message: "Connectez-vous pour aimer un commentaire.", variant: "info", requiresLogin: true });
      return;
    }
    if (!supabase || likingCommentId) return;
    const shouldLike = !comment.liked_by_current_user;
    setLikingCommentId(comment.id);
    setComments((items) => items.map((item) => item.id === comment.id
      ? { ...item, liked_by_current_user: shouldLike, like_count: item.like_count + (shouldLike ? 1 : -1) }
      : item));
    const result = shouldLike
      ? await supabase.from("product_comment_likes").insert({ comment_id: comment.id, user_id: currentUserId })
      : await supabase.from("product_comment_likes").delete().eq("comment_id", comment.id).eq("user_id", currentUserId);
    setLikingCommentId(null);
    if (result.error) {
      setComments((items) => items.map((item) => item.id === comment.id
        ? { ...item, liked_by_current_user: comment.liked_by_current_user, like_count: comment.like_count }
        : item));
      setCommentsError(result.error.message || "Impossible de modifier cette réaction.");
    }
  };

  const saveReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !currentUserId || !canReview || selectedRating < 1 || savingReview) return;
    setSavingReview(true);
    setReviewsError("");
    const { error } = await supabase.from("business_reviews").upsert({
      business_id: sellerId,
      reviewer_id: currentUserId,
      rating: selectedRating,
      comment: reviewText.trim() || null,
    }, { onConflict: "reviewer_id,business_id" });
    setSavingReview(false);
    if (error) {
      setReviewsError(error.message || "Impossible d’enregistrer votre avis.");
      return;
    }
    await loadReviews();
  };

  const confirmDeleteReview = async () => {
    if (!supabase || !myReview || deletingReview) return;
    setDeletingReview(true);
    setReviewsError("");
    const { error } = await supabase.from("business_reviews").delete().eq("id", myReview.id);
    setDeletingReview(false);
    if (error) {
      setReviewsError(error.message || "Impossible de supprimer votre avis.");
      return;
    }
    setSelectedRating(0);
    setReviewText("");
    await loadReviews();
  };

  const deleteReview = () => {
    if (!supabase || !myReview || deletingReview) return;
    setNotice({
      title: "Supprimer votre avis ?",
      message: "Votre note et votre commentaire seront supprimés. Cette action est définitive.",
      variant: "warning",
      confirmLabel: "Supprimer",
      destructive: true,
      onConfirm: () => {
        setNotice(null);
        void confirmDeleteReview();
      },
    });
  };

  useEffect(() => {
    setSelectedRating(myReview?.rating ?? 0);
    setReviewText(myReview?.comment ?? "");
  }, [myReview]);

  return (
    <div className="order-6 space-y-3">
      {notice && (
        <NoticeDialog
          title={notice.title}
          message={notice.message}
          variant={notice.variant}
          onLogin={notice.requiresLogin ? onLogin : undefined}
          confirmLabel={notice.confirmLabel}
          destructive={notice.destructive}
          onClose={() => setNotice(null)}
          onConfirm={notice.onConfirm}
        />
      )}
      {isBusiness && (
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <Star size={19} className="text-amber-500" /> Avis sur {sellerName || "l’entreprise"}
          </h3>
          {reviewsLoading ? (
            <div className="flex justify-center py-5"><LoaderCircle className="animate-spin text-[#143ca8]" /></div>
          ) : reviewsError ? (
            <p role="alert" className="mt-3 text-sm text-red-600">{reviewsError}</p>
          ) : (
            <>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-3xl font-black">{Number(reviewSummary.average_rating).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                <div><Stars rating={Math.round(Number(reviewSummary.average_rating))} /><p className="text-xs text-slate-500">{reviewSummary.total_reviews} avis</p></div>
              </div>
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviewSummary[`rating_${rating}_count` as keyof ReviewSummary] as number;
                const percent = reviewSummary.total_reviews ? Math.round((count / reviewSummary.total_reviews) * 100) : 0;
                return (
                  <div key={rating} className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span>{rating} ★</span><div className="h-1.5 flex-1 overflow-hidden rounded bg-slate-100"><div className="h-full bg-amber-400" style={{ width: `${percent}%` }} /></div><span className="w-5 text-right">{count}</span>
                  </div>
                );
              })}
              {canReview && (hasCompletedOrder || myReview) && (
                <form onSubmit={(event) => void saveReview(event)} className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-sm font-semibold">{myReview ? "Modifier votre avis" : "Évaluer cette entreprise"}</p>
                  <div className="mt-1 flex gap-1" aria-label="Choisir une note sur cinq">
                    {Array.from({ length: 5 }, (_, index) => {
                      const rating = index + 1;
                      return <button key={rating} type="button" onClick={() => setSelectedRating(rating)} aria-label={`${rating} étoile${rating > 1 ? "s" : ""}`} aria-pressed={selectedRating === rating} className="text-amber-500"><Star size={27} fill={rating <= selectedRating ? "currentColor" : "none"} /></button>;
                    })}
                  </div>
                  <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} maxLength={1000} rows={3} placeholder="Partagez votre expérience (facultatif)" className="textarea textarea-bordered mt-2 w-full text-sm" />
                  <p className="text-right text-xs text-slate-400">{reviewText.length}/1000</p>
                  <div className="mt-2 flex gap-2">
                    <button type="submit" disabled={savingReview || selectedRating < 1} className="btn btn-sm flex-1 border-0 bg-[#143ca8] text-white">{savingReview ? <LoaderCircle className="animate-spin" size={16} /> : myReview ? "Mettre à jour" : "Publier mon avis"}</button>
                    {myReview && <button type="button" disabled={deletingReview} onClick={() => void deleteReview()} className="btn btn-sm btn-outline text-red-600">{deletingReview ? <LoaderCircle className="animate-spin" size={16} /> : "Supprimer"}</button>}
                  </div>
                </form>
              )}
              {!currentUserId && <p className="mt-3 text-sm text-slate-500">Connectez-vous pour noter cette entreprise et partager votre expérience.</p>}
              {currentUserId && canReview && !hasCompletedOrder && !myReview && <p className="mt-3 text-sm text-slate-500">Vous pourrez noter cette entreprise après avoir terminé une commande.</p>}
              <div className="mt-4 border-t border-slate-100 pt-3">
                <h4 className="text-sm font-bold">Derniers avis</h4>
                {reviews.length ? (showAllReviews ? reviews : reviews.slice(0, 2)).map((review) => (
                  <article key={review.id} className="border-b border-slate-100 py-3 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {review.reviewer_avatar ? <img src={review.reviewer_avatar} alt="" className="size-8 rounded-full object-cover" /> : <span className="grid size-8 place-items-center rounded-full bg-slate-100"><UserRound size={16} /></span>}
                        <div className="min-w-0"><p className="truncate text-sm font-semibold">{review.reviewer_name}</p><p className="text-xs text-slate-400">{formatDate(review.created_at)}</p></div>
                      </div>
                      <Stars rating={review.rating} size={13} />
                    </div>
                    {review.comment && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{review.comment}</p>}
                  </article>
                )) : <p className="py-3 text-sm text-slate-500">Aucun avis pour le moment.</p>}
                {reviews.length > 2 && <button type="button" onClick={() => setShowAllReviews((value) => !value)} aria-expanded={showAllReviews} className="btn btn-ghost btn-sm mt-1 w-full text-[#143ca8]">{showAllReviews ? "Voir moins" : `Voir plus d’avis (${reviews.length - 2})`}</button>}
              </div>
            </>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold"><MessageCircle size={19} className="text-[#143ca8]" /> Commentaires du produit <span className="text-sm font-medium text-slate-500">({comments.length})</span></h3>
        {commentsError && <p role="alert" className="mt-3 text-sm text-red-600">{commentsError}</p>}
        {commentsLoading ? (
          <div className="flex justify-center py-5"><LoaderCircle className="animate-spin text-[#143ca8]" /></div>
        ) : comments.length ? (
          <div className="mt-2 divide-y divide-slate-100">
            {(showAllComments ? comments : comments.slice(0, 3)).map((comment) => (
              <article key={comment.id} className="py-3 first:pt-1">
                <div className="flex items-start gap-2">
                  {comment.author_avatar ? <img src={comment.author_avatar} alt="" className="size-9 shrink-0 rounded-full object-cover" /> : <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100"><UserRound size={17} /></span>}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <p className="text-sm font-semibold">{comment.author_name}</p><time className="text-xs text-slate-400">{formatDate(comment.created_at)}</time>
                    </div>
                    <p className="mt-1 whitespace-pre-line break-words text-sm leading-5 text-slate-600">{comment.content}</p>
                    <button type="button" onClick={() => void toggleLike(comment)} disabled={likingCommentId === comment.id} aria-pressed={comment.liked_by_current_user} className={`mt-2 inline-flex items-center gap-1 text-xs ${comment.liked_by_current_user ? "text-rose-600" : "text-slate-500"}`}>
                      <Heart size={15} fill={comment.liked_by_current_user ? "currentColor" : "none"} /> {comment.like_count} J’aime
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {comments.length > 3 && <button type="button" onClick={() => setShowAllComments((value) => !value)} aria-expanded={showAllComments} className="btn btn-ghost btn-sm w-full text-[#143ca8]">{showAllComments ? "Voir moins" : `Voir tous les commentaires (${comments.length})`}</button>}
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">Aucun commentaire pour le moment.</p>}
        <form onSubmit={(event) => void addComment(event)} className="mt-3 border-t border-slate-100 pt-3">
          <label htmlFor={`comment-${productId}`} className="text-sm font-semibold">Ajouter un commentaire</label>
          <textarea id={`comment-${productId}`} value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={1000} rows={3} placeholder="Partagez votre avis sur ce produit..." className="textarea textarea-bordered mt-2 w-full text-sm" />
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">{commentText.length}/1000</span>
            <button type="submit" disabled={postingComment || !commentText.trim()} className="btn btn-sm border-0 bg-[#143ca8] text-white">{postingComment ? <LoaderCircle className="animate-spin" size={16} /> : "Publier"}</button>
          </div>
          {!currentUserId && <p className="mt-2 text-xs text-slate-500">Connectez-vous pour publier un commentaire ou aimer une réaction.</p>}
        </form>
      </section>
    </div>
  );
}
