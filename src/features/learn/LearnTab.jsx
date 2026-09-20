import React, { useState, useEffect } from 'react';
import { ExternalLink, Search, Heart, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { INK, INK_2, PAPER, PAPER_DIM, TEXT_SOFT, VIOLET, SKY, LIME, AMBER, MOSS, BRICK } from '../../theme';

// Cycled by list position so each tidbit's title reads as its own color,
// stable across reloads (not randomized) — purely a visual "each of
// these is its own little thing" cue, not tied to meaning.
const TITLE_COLORS = [VIOLET, SKY, LIME, AMBER, MOSS, BRICK];

function mapArticle(row) {
  return { id: row.id, title: row.title, summary: row.summary, url: row.url, createdAt: row.created_at };
}

export default function LearnTab() {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: articleRows }, { data: favRows }] = await Promise.all([
        supabase.from('articles').select('*').order('created_at', { ascending: false }),
        user ? supabase.from('article_favorites').select('article_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
      ]);
      setArticles((articleRows || []).map(mapArticle));
      setFavoriteIds(new Set((favRows || []).map((f) => f.article_id)));
      setLoading(false);
    })();
  }, [user]);

  async function toggleFavorite(articleId) {
    const isFav = favoriteIds.has(articleId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(articleId); else next.add(articleId);
      return next;
    });
    if (isFav) {
      await supabase.from('article_favorites').delete().eq('user_id', user.id).eq('article_id', articleId);
    } else {
      await supabase.from('article_favorites').insert({ user_id: user.id, article_id: articleId });
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <span style={{ color: TEXT_SOFT }} className="text-sm">Loading…</span>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const visibleArticles = articles.filter((a) => {
    if (showFavoritesOnly && !favoriteIds.has(a.id)) return false;
    if (!q) return true;
    return a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-md mx-auto px-4 pb-12">
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-4 text-center">Reasons to Move</div>

      <div className="relative mb-2">
        <Search size={14} color={TEXT_SOFT} className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          style={{ background: INK_2, color: PAPER }}
          className="w-full rounded-md pl-9 pr-9 py-2.5 text-sm outline-none"
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ color: TEXT_SOFT }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 -m-1.5">
            <X size={14} />
          </button>
        )}
      </div>

      <button
        onClick={() => setShowFavoritesOnly((v) => !v)}
        style={{ background: showFavoritesOnly ? VIOLET : INK_2, color: showFavoritesOnly ? INK : PAPER_DIM }}
        className="w-full rounded-md py-2 text-sm font-medium mb-4 flex items-center justify-center gap-1.5"
      >
        <Heart size={13} fill={showFavoritesOnly ? INK : 'none'} />
        {showFavoritesOnly ? 'Showing favorites' : 'Show favorites only'}
      </button>

      {visibleArticles.length === 0 ? (
        <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-md px-4 py-6 text-center text-sm">
          {articles.length === 0
            ? 'Nothing posted yet — check back soon.'
            : showFavoritesOnly
            ? "You haven't favorited anything yet."
            : 'Nothing matches your search.'}
        </div>
      ) : (
        <div className="space-y-2">
          {visibleArticles.map((a) => {
            const originalIndex = articles.indexOf(a);
            const color = TITLE_COLORS[originalIndex % TITLE_COLORS.length];
            const isFav = favoriteIds.has(a.id);
            return (
              <div key={a.id} style={{ background: INK_2, borderLeft: `3px solid ${color}` }} className="rounded-md px-4 py-3 text-center relative">
                <button
                  onClick={() => toggleFavorite(a.id)}
                  style={{ color: isFav ? BRICK : TEXT_SOFT }}
                  className="absolute top-2.5 right-2.5 p-1.5 -m-1.5"
                  aria-label={isFav ? 'Remove favorite' : 'Add favorite'}
                >
                  <Heart size={15} fill={isFav ? BRICK : 'none'} />
                </button>
                <div style={{ color: TEXT_SOFT }} className="text-sm mb-1">
                  {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                {a.url ? (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color }}
                    className="text-sm font-medium mb-1 inline-flex items-center gap-1 pr-5"
                  >
                    {a.title} <ExternalLink size={12} />
                  </a>
                ) : (
                  <div style={{ color: PAPER }} className="text-sm font-medium mb-1 pr-5">{a.title}</div>
                )}
                <div style={{ color: PAPER_DIM }} className="text-sm">{a.summary}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
