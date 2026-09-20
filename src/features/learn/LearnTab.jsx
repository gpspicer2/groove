import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { INK_2, PAPER, PAPER_DIM, TEXT_SOFT, VIOLET } from '../../theme';

function mapArticle(row) {
  return { id: row.id, title: row.title, summary: row.summary, url: row.url, createdAt: row.created_at };
}

export default function LearnTab() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
      setArticles((data || []).map(mapArticle));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <span style={{ color: TEXT_SOFT }} className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-12">
      <div style={{ color: TEXT_SOFT }} className="text-sm mb-4 text-center">Reasons to Move</div>

      {articles.length === 0 ? (
        <div style={{ background: INK_2, color: TEXT_SOFT }} className="rounded-md px-4 py-6 text-center text-sm">
          Nothing posted yet — check back soon.
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <div key={a.id} style={{ background: INK_2, borderLeft: `3px solid ${VIOLET}` }} className="rounded-md px-4 py-3 text-center">
              <div style={{ color: TEXT_SOFT }} className="text-sm mb-1">
                {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              {a.url ? (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: VIOLET }}
                  className="text-sm font-medium mb-1 inline-flex items-center gap-1"
                >
                  {a.title} <ExternalLink size={12} />
                </a>
              ) : (
                <div style={{ color: PAPER }} className="text-sm font-medium mb-1">{a.title}</div>
              )}
              <div style={{ color: PAPER_DIM }} className="text-sm">{a.summary}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
