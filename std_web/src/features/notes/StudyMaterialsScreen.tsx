import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Eye,
  Search,
  Video,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { StudyMaterialModel } from '../../types';
import { studyMaterialsService } from '../../services/studyMaterialsService';

export const StudyMaterialsScreen: React.FC = () => {
  const { language, t } = useLanguage();

  const [materials, setMaterials] = useState<StudyMaterialModel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMaterial, setActiveMaterial] = useState<StudyMaterialModel | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const list = await studyMaterialsService.getAllMaterials();
      if (isMounted) setMaterials(list);
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = ['ALL', ...Array.from(new Set(materials.map((m) => m.category)))];

  const filtered = materials.filter((m) => {
    if (selectedCategory !== 'ALL' && m.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const inTitle = m.title.toLowerCase().includes(query);
      const inDesc = m.description.toLowerCase().includes(query);
      return inTitle || inDesc;
    }
    return true;
  });

  const handleDownload = async (m: StudyMaterialModel) => {
    setDownloadingId(m.id);
    try {
      await studyMaterialsService.downloadMaterial(
        m.id,
        m.fileName || `${m.title.replace(/\s+/g, '_')}.${m.type.toLowerCase()}`
      );
    } catch {
      alert(t('download_failed'));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          {t('notes_title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('notes_subtitle')}
        </p>
      </div>

      {/* Search & Categories */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, formulas, shortcuts, guides..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              {cat === 'ALL' ? t('all_topics') : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Materials List */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            {t('no_materials')}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Study materials uploaded by your institute will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const title =
              language === 'mr' && m.titleMr ? m.titleMr : language === 'hi' && m.titleHi ? m.titleHi : m.title;
            const desc =
              language === 'mr' && m.descriptionMr
                ? m.descriptionMr
                : language === 'hi' && m.descriptionHi
                ? m.descriptionHi
                : m.description;

            const isVideo = m.kind === 'VIDEO' || Boolean(m.embedUrl?.includes('youtube'));

            return (
              <div
                key={m.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex flex-col justify-between shadow-sm group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                      {m.category}
                    </span>
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {m.readTimeMinutes} min
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setActiveMaterial(m)}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isVideo ? <Video className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{isVideo ? 'Watch Video' : t('btn_read_doc')}</span>
                  </button>

                  <button
                    onClick={() => handleDownload(m)}
                    disabled={downloadingId === m.id}
                    title={t('btn_download_file')}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Download className={`w-4 h-4 ${downloadingId === m.id ? 'animate-bounce' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-App Document Preview Modal */}
      {activeMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white truncate max-w-md">
                    {activeMaterial.title}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {activeMaterial.category} • {activeMaterial.readTimeMinutes} min read
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveMaterial(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* YouTube Video Embed if available */}
              {activeMaterial.embedUrl && activeMaterial.embedUrl.includes('youtube') && (
                <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-md">
                  <iframe
                    src={activeMaterial.embedUrl.replace('watch?v=', 'embed/')}
                    title={activeMaterial.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              )}

              {/* Description */}
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeMaterial.description}
              </div>

              {/* Key Takeaways */}
              {activeMaterial.keyPoints.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>{t('key_takeaways')}</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-indigo-950 dark:text-indigo-200 list-disc list-inside">
                    {activeMaterial.keyPoints.map((kp, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {kp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Content Body */}
              {activeMaterial.content && (
                <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-line text-slate-800 dark:text-slate-200">
                  {activeMaterial.content}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {activeMaterial.fileName || `${activeMaterial.title}.pdf`}
              </span>
              <button
                onClick={() => handleDownload(activeMaterial)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t('btn_download_file')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
