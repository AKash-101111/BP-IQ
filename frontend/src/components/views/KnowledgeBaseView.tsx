import React, { useState, useEffect } from 'react';
import { BookOpen, Search, ShieldCheck, Tag } from 'lucide-react';
import { RAGChunk } from '../../types';
import { api } from '../../api';

export const KnowledgeBaseView: React.FC = () => {
  const [standards, setStandards] = useState<RAGChunk[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStandards();
  }, []);

  const loadStandards = async () => {
    try {
      setLoading(true);
      const data = await api.getStandards();
      setStandards(data);
    } catch (e) {
      console.error('Failed to load standards', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadStandards();
      return;
    }
    try {
      setLoading(true);
      const cat = selectedCategory === 'ALL' ? undefined : selectedCategory;
      const results = await api.searchRAG(searchQuery, cat);
      setStandards(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['ALL', 'DIMENSIONS', 'STAIRS', 'MATERIALS', 'MASONRY', 'PLASTER', 'STRUCTURAL'];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="border-b border-borderline pb-4">
        <h2 className="text-xl font-bold text-textPrimary tracking-tight">Construction Knowledge Base (RAG)</h2>
        <p className="text-xs text-textSecondary mt-0.5">
          Verified architectural, structural, and quantity surveying standards indexed for AI compliance cross-referencing.
        </p>
      </div>

      {/* Search & Filters */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-textSecondary absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search building standards (e.g. 'habitable room area', 'stair riser', 'concrete mix')..."
            className="w-full pl-9 pr-4 py-2 bg-panel border border-borderline rounded text-xs text-textPrimary focus:outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
        >
          Search Clauses
        </button>
      </form>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded text-[11px] font-semibold transition-colors ${
              selectedCategory === cat
                ? 'bg-accent text-white'
                : 'bg-panel border border-borderline text-textSecondary hover:bg-canvas'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Standards Cards */}
      <div className="grid grid-cols-2 gap-4">
        {standards.map((st) => (
          <div key={st.id} className="bg-panel border border-borderline rounded p-4 shadow-workbench space-y-2">
            <div className="flex items-center justify-between">
              <span className="mono-num text-[11px] font-bold text-accent px-1.5 py-0.5 bg-accent-subtle rounded border border-accent/20">
                {st.standard_code}
              </span>
              <span className="text-[10px] uppercase font-semibold text-textSecondary mono-num">
                {st.clause_ref}
              </span>
            </div>

            <h4 className="font-bold text-sm text-textPrimary leading-snug">{st.topic}</h4>
            <p className="text-xs text-textSecondary leading-relaxed bg-canvas/60 p-2.5 rounded border border-borderline/60">
              {st.content}
            </p>

            <div className="pt-2 border-t border-borderline/60 flex items-center justify-between text-[10px] text-textSecondary">
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" /> Category: {st.category || 'General'}
              </span>
              <span className="text-success font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Engineering Standard
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
