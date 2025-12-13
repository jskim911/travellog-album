import React, { useState, useEffect } from 'react';
import { Camera, PlusCircle, LayoutGrid, Settings, LogOut, User as UserIcon } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, where, deleteDoc, doc } from 'firebase/firestore';
import { db, storage } from './firebase';
import { deleteObject, ref } from 'firebase/storage';
import { UploadSection } from './components/UploadSection';
import { AlbumItem } from './components/AlbumItem';
import { VideoCreatorModal } from './components/VideoCreatorModal';
import { Video, X, CheckCircle2, Film, Trash2 } from 'lucide-react';
import { LoginModal } from './components/LoginModal';
import { Album } from './types';
import { useAuth } from './src/hooks/useAuth';

const App: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Video Creation State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<Set<string>>(new Set());
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('전체');

  const filteredAlbums = activeTab === '전체'
    ? albums
    : albums.filter(a => a.location === activeTab);

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      // Exit mode
      setIsSelectionMode(false);
      setSelectedAlbumIds(new Set());
    } else {
      setIsSelectionMode(true);
    }
  };

  const toggleAlbumSelection = (album: Album) => {
    const newSelected = new Set(selectedAlbumIds);
    if (newSelected.has(album.id)) {
      newSelected.delete(album.id);
    } else {
      newSelected.add(album.id);
    }
    setSelectedAlbumIds(newSelected);
  };

  const handleDeleteAlbum = async (id: string, photoUrl: string) => {
    if (!window.confirm("정말 이 사진을 삭제하시겠습니까? 복구할 수 없습니다.")) return;

    try {
      await deleteDoc(doc(db, 'photos', id));
      const imageRef = ref(storage, photoUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.error("Error removing document: ", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedAlbumIds.size === 0) return;
    if (!window.confirm(`선택한 ${selectedAlbumIds.size}장의 사진을 정말 삭제하시겠습니까?`)) return;

    try {
      const selectedAlbums = albums.filter(a => selectedAlbumIds.has(a.id));
      for (const album of selectedAlbums) {
        await deleteDoc(doc(db, 'photos', album.id));
        const imageRef = ref(storage, album.coverUrl);
        await deleteObject(imageRef).catch(e => console.warn("Image delete failed", e));
      }
      setSelectedAlbumIds(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error("Batch delete error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // Fetch data from Firestore
  useEffect(() => {
    if (!user) {
      setAlbums([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'photos'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Client-side sorting
      const sortedDocs = snapshot.docs.sort((a, b) => {
        const dateA = a.data().createdAt?.seconds || 0;
        const dateB = b.data().createdAt?.seconds || 0;
        return dateB - dateA; // Descending order
      });

      const fetchedPhotos = sortedDocs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.caption || '제목 없음',
          location: data.location || 'Unknown',
          date: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Just now',
          coverUrl: data.photoUrl,
          photoCount: 1,
          rating: data.rating,
          description: data.caption // Map caption (impression) to description
        } as Album;
      });
      setAlbums(fetchedPhotos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Helper to get selected album objects
  const selectedAlbums = albums.filter(a => selectedAlbumIds.has(a.id));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Camera size={20} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              TravelLog
            </h1>
          </div>

          <nav className="flex items-center gap-6">
            {authLoading ? (
              <div className="w-8 h-8 rounded-full bg-zinc-100 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-full hover:bg-zinc-100 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 overflow-hidden ring-2 ring-white shadow-sm">
                    <img
                      src={user.photoURL || "https://picsum.photos/id/64/200/200"}
                      alt={user.displayName || "User"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="hidden sm:block text-sm font-semibold text-zinc-700">{user.displayName}</span>
                </div>
                <button
                  onClick={signOut}
                  className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-full transition-all"
                  title="로그아웃"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-6 py-2.5 bg-black text-white text-sm font-bold rounded-full hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                로그인
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">

        {/* Upload Section */}
        <section className="max-w-3xl mx-auto mb-12 transform hover:scale-[1.01] transition-transform duration-500">
          <UploadSection onOpenLoginModal={() => setIsLoginModalOpen(true)} />
        </section>

        {/* List Header & Controls */}
        {user && (
          <div className="flex items-end justify-between mb-8 mt-16 px-2 border-b border-zinc-200 pb-4">
            <div>
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Gallery</h2>
              <p className="text-zinc-500 mt-1 font-medium">나만의 특별한 여행 기록</p>
            </div>

            <div className="flex items-center gap-3">
              {isSelectionMode ? (
                <>
                  <span className="text-sm font-medium text-violet-600 animate-in fade-in">
                    {selectedAlbumIds.size}개 선택됨
                  </span>
                  {selectedAlbumIds.size > 0 && (
                    <>
                      <button
                        onClick={handleDeleteSelected}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 text-sm font-bold rounded-full shadow-sm transition-all flex items-center gap-2 animate-in zoom-in-50"
                      >
                        <Trash2 size={16} />
                        삭제
                      </button>
                      <button
                        onClick={() => setIsVideoModalOpen(true)}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-full shadow-lg transition-all flex items-center gap-2 animate-in zoom-in-50"
                      >
                        <Film size={16} />
                        비디오 생성
                      </button>
                    </>
                  )}
                  <button
                    onClick={toggleSelectionMode}
                    className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full transition-colors"
                    title="취소"
                  >
                    <X size={20} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={toggleSelectionMode}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold rounded-full shadow-md transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    <span>선택 / 관리</span>
                  </button>
                  <span className="px-3 py-1 bg-zinc-100 text-zinc-600 text-xs rounded-full font-bold">
                    {albums.length} Photos
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Location Tabs */}
        {user && albums.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 px-1 scrollbar-hide">
            {['전체', ...Array.from(new Set(albums.map(a => a.location))).sort()].map((loc) => (
              <button
                key={loc}
                onClick={() => setActiveTab(loc)}
                className={`
                  px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all
                  ${activeTab === loc
                    ? 'bg-black text-white shadow-md transform scale-105'
                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}
                `}
              >
                {loc}
              </button>
            ))}
          </div>
        )}

        {/* Content Grid */}
        {authLoading || loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-72 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
                <div className="h-48 bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !user ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
              <LayoutGrid size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900">로그인이 필요합니다</h3>
            <p className="text-slate-500 mt-1">로그인하여 당신만의 여행 앨범을 만들어보세요.</p>
          </div>
        ) : albums.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Camera size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900">아직 사진이 없습니다</h3>
            <p className="text-slate-500 mt-1">위의 업로드 섹션에서 첫 번째 사진을 올려보세요!</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-3 lg:columns-5 gap-4 space-y-4 mx-auto">
            {filteredAlbums.map((album) => (
              <AlbumItem
                key={album.id}
                album={album}
                onDelete={handleDeleteAlbum}
                isSelectionMode={isSelectionMode}
                isSelected={selectedAlbumIds.has(album.id)}
                onToggleSelect={toggleAlbumSelection}
              />
            ))}
          </div>
        )}
      </main>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <VideoCreatorModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        selectedAlbums={selectedAlbums}
      />
    </div >
  );
};

export default App;