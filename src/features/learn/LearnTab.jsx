import { titleCase } from '../../lib/titleCase';
import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Search, Heart, X, ChevronDown, ChevronUp } from '../../lib/icons';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { INK, INK_2, PAPER, PAPER_DIM, TEXT_SOFT, VIOLET, SKY, LIME, AMBER, MOSS, BRICK } from '../../theme';
import Portal from '../../Portal';
import Guides from './Guides';

// Cycled by position in the list being shown, so neighbors are always
// different colors (stable across reloads, not randomized). The order keeps
// the two greens (LIME, MOSS) and the teal apart, so no two tidbits next to
// each other ever look alike, whatever category or search is showing.
const TITLE_COLORS = [VIOLET, LIME, AMBER, SKY, BRICK, MOSS];

// Category lives inside the stored title as a "[Tag] " prefix — the
// articles table has no category column, so this avoids needing a
// schema migration for what's otherwise a pure display/filter concern.
// Articles written before categorization carry no prefix and show up
// regardless of which filter is active.
const CATEGORY_PREFIX = /^\[(Benefits|Strategy|Adherence)\]\s*/;
const CATEGORIES = [
  { key: 'Benefits', label: 'Benefits of Movement', color: MOSS },
  { key: 'Strategy', label: 'Scientific Strategizing', color: SKY },
  { key: 'Adherence', label: 'Exercise Adherence', color: AMBER },
];

// Shown in a brief popup on a long-press of each filter pill.
const CATEGORY_INFO = {
  Benefits: 'What regular movement does for your body and mind.',
  Strategy: 'How to structure a workout for the best results.',
  Adherence: 'How to stick with it for the long haul.',
};

function mapArticle(row) {
  const match = row.title.match(CATEGORY_PREFIX);
  return {
    id: row.id,
    title: titleCase(match ? row.title.slice(match[0].length) : row.title),
    category: match ? match[1] : null,
    summary: row.summary,
    url: row.url,
    createdAt: row.created_at,
    pinned: row.pinned || false,
  };
}

// Tidbits that make the case for Groove itself lead the list: "You Weren't Born
// to Exercise" first, then tracking/data, then journaling; anything about dancing
// sinks to the bottom. A title match beats a summary match; everything else keeps
// the database order (pinned, then newest). The sort runs once on load, so every
// list (favorites, categories, search) inherits it. No SQL needed.
const PROMO_ORDER = [/born to\s*\*?exercise|meant to\s*\*?(exercise|move)/i, /track|data|measure|log/i, /journal|reflect|writ/i, /nature|outdoor|outside/i];
const DANCE = /danc|zumba|salsa|ballet/i;
function promoRank(a) {
  const t = a.title.replace(/\*/g, '');
  const first = PROMO_ORDER.findIndex((re) => re.test(t));
  if (first === 0) return 0;
  if (DANCE.test(t) || (first === -1 && DANCE.test(a.summary || ''))) return 99;
  if (first !== -1) return first;
  const viaSummary = PROMO_ORDER.findIndex((re, k) => k > 0 && re.test(a.summary || ''));
  return viaSummary === -1 ? 50 : 10 + viaSummary;
}

// Lightweight markdown for titles — *word* renders italic. Lets a
// specific word be emphasized (e.g. "...Meant to *Move*") without
// needing a rich-text editor for what's otherwise plain text.
function renderEmphasis(text) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) =>
    part.startsWith('*') && part.endsWith('*')
      ? <em key={i}>{part.slice(1, -1)}</em>
      : part
  );
}

// A rough "first sentence or two" teaser — good enough for the short,
// plain-language tidbits these are written as; falls back to the whole
// thing if it's already short.
function teaser(text, maxSentences = 1) {
  // Real sentence segmentation (handles quotes, ellipses, abbreviations,
  // etc. correctly) — a hand-rolled regex kept mis-splitting on embedded
  // quotes like `("I felt...", "I thought...")`. Supported in every
  // modern browser; fall back to treating the whole thing as one
  // "sentence" on the rare engine without it.
  let sentences;
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    sentences = [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(text)].map((s) => s.segment);
  } else {
    sentences = [text];
  }
  if (sentences.length <= maxSentences) return { teaser: text, hasMore: false };
  return { teaser: sentences.slice(0, maxSentences).join('').trim(), hasMore: true };
}

export default function LearnTab({ request = null, onConsumeRequest }) {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [explainCategory, setExplainCategory] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [loadError, setLoadError] = useState('');
  const [section, setSection] = useState('tidbits'); // 'tidbits' (short reads) | 'guides' (your plan and the movement library)
  const [openSupport, setOpenSupport] = useState(false); // arrived from "Want Some Help?" on Birdseye: Scientific Support starts open
  const pressTimerRef = useRef(null);

  function selectCategory(key) {
    setActiveCategory((prev) => (prev === key ? null : key));
  }

  // Long-press (held ~450ms without moving away) opens a brief
  // explanation of that filter — a plain tap still just selects it.
  function startLongPress(key) {
    clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => setExplainCategory(key), 450);
  }
  function cancelLongPress() {
    clearTimeout(pressTimerRef.current);
  }

  function toggleExpanded(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    (async () => {
      const [articlesRes, favRes] = await Promise.all([
        supabase.from('articles').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
        user ? supabase.from('article_favorites').select('article_id').eq('user_id', user.id) : Promise.resolve({ data: [], error: null }),
      ]);
      const firstError = articlesRes.error || favRes.error;
      setLoadError(firstError ? `Couldn't load Learn: ${firstError.message}` : '');
      setArticles((articlesRes.data || []).map(mapArticle).map((a, i) => ({ a, i })).sort((x, y) => promoRank(x.a) - promoRank(y.a) || x.i - y.i).map((x) => x.a));
      setFavoriteIds(new Set((favRes.data || []).map((f) => f.article_id)));
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

  // Birdseye can send people straight to Learn > Guides > Scientific Support.
  useEffect(() => {
    if (!request) return;
    setSection(request.section || 'tidbits');
    setOpenSupport(request.open === 'support');
    onConsumeRequest && onConsumeRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

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
    if (activeCategory && a.category !== activeCategory) return false;
    if (!q) return true;
    return a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-md mx-auto px-4 pb-12">
      {loadError && (
        <div style={{ background: INK_2, color: BRICK, borderLeft: `3px solid ${BRICK}` }} className="rounded-md px-4 py-3 mb-4 text-sm">
          {loadError}
        </div>
      )}

      <div className="flex justify-center mb-3">
        <div style={{ background: INK_2 }} className="inline-flex rounded-full p-0.5">
          {[{ id: 'tidbits', label: 'Research' }, { id: 'guides', label: 'Guides' }].map((t) => (
            <button
              key={t.id}
              onClick={() => { setSection(t.id); setOpenSupport(false); }}
              style={{ background: section === t.id ? VIOLET : 'transparent', color: section === t.id ? INK : PAPER_DIM }}
              className="rounded-full px-6 py-1.5 text-sm font-medium"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {section !== 'guides' && <div style={{ color: TEXT_SOFT }} className="text-sm text-center -mt-1 mb-3">Learning tidbits from peer-reviewed scientific literature</div>}

      {section === 'guides' ? <Guides userId={user?.id} openSupport={openSupport} /> : (<>
      <div className="flex items-center gap-2 mb-2">
        <div data-tour="learn-search" className="relative flex-1">
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
          className="shrink-0 rounded-md p-2.5"
          aria-label={showFavoritesOnly ? 'Showing favorites' : 'Show favorites only'}
          title={showFavoritesOnly ? 'Showing favorites' : 'Show favorites only'}
        >
          <Heart size={16} fill={showFavoritesOnly ? INK : 'none'} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 mb-4">
        {CATEGORIES.map(({ key, label, color }) => {
          const active = activeCategory === key;
          return (
            <button
              key={key}
              onClick={() => selectCategory(key)}
              onTouchStart={() => startLongPress(key)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              onTouchCancel={cancelLongPress}
              onMouseDown={() => startLongPress(key)}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                background: active ? color : INK_2,
                color: active ? INK : PAPER_DIM,
                // user-select alone doesn't stop iOS's long-press text
                // callout/selection bubble — that's what was highlighting
                // the whole page on a held filter pill.
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
              className="flex-1 rounded-md px-1 py-2 text-xs font-medium text-center leading-tight select-none"
            >
              {label}
            </button>
          );
        })}
      </div>


      {explainCategory && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setExplainCategory(null)}>
            <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0" />
            <div
              style={{ background: INK_2, borderTop: `2px solid ${CATEGORIES.find((c) => c.key === explainCategory).color}` }}
              className="relative w-full max-w-sm rounded-xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: CATEGORIES.find((c) => c.key === explainCategory).color }} className="text-sm font-medium uppercase tracking-wide">
                  {CATEGORIES.find((c) => c.key === explainCategory).label}
                </div>
                <button onClick={() => setExplainCategory(null)} style={{ color: TEXT_SOFT }} className="p-1 -m-1">
                  <X size={18} />
                </button>
              </div>
              <div style={{ color: PAPER }} className="text-sm leading-relaxed">
                {CATEGORY_INFO[explainCategory]}
              </div>
            </div>
          </div>
        </Portal>
      )}

      <div data-tour="learn-list">
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
          {visibleArticles.map((a, shownIndex) => {
            const color = TITLE_COLORS[shownIndex % TITLE_COLORS.length];
            const isFav = favoriteIds.has(a.id);
            const { teaser: shortText, hasMore } = teaser(a.summary);
            const expanded = expandedIds.has(a.id);
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
                {a.url ? (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color }}
                    className="text-sm font-medium mb-1 inline-flex items-center gap-1 pr-5"
                  >
                    <span>{renderEmphasis(a.title)}</span> <ExternalLink size={12} />
                  </a>
                ) : (
                  <div style={{ color: PAPER }} className="text-sm font-medium mb-1 pr-5">{renderEmphasis(a.title)}</div>
                )}
                <div style={{ color: PAPER_DIM }} className="text-sm">{expanded ? a.summary : shortText}</div>
                {hasMore && (
                  <button
                    onClick={() => toggleExpanded(a.id)}
                    style={{ color: TEXT_SOFT }}
                    className="text-sm mt-1.5 inline-flex items-center gap-1"
                  >
                    {expanded ? 'Show less' : 'Read more'}
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
      </>)}
    </div>
  );
}
