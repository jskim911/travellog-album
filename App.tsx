import React, { useState, useEffect, useMemo } from 'react';
import {
  Camera, PlusCircle, LayoutGrid, Settings, LogOut, User as UserIcon, Shield,
  Clock, Calendar as CalendarIcon, MapPin as MapPinIcon, Grid3x3, Download,
  Smartphone, Monitor, Home, X, CheckCircle2, Trash2, BookOpen, Map,
  Image as ImageIcon, Sparkles
} from 'lucide-react';
import { collection, query, onSnapshot, where, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db, storage } from './firebase';
import { deleteObject, ref } from 'firebase/storage';
import { UploadSection } from './components/UploadSection';
import { PhotoCard } from './components/PhotoCard';
import { HeroBanner } from './components/HeroBanner';
import { StoryboardCreator } from './components/StoryboardCreator';
import { RoadmapPage } from './components/Roadmap/RoadmapPage';
import { LoginModal } from './components/LoginModal';
import { SignupModal } from './components/SignupModal';
import { AdminPanel } from './components/AdminPanel';
import { ProfileEditModal } from './components/ProfileEditModal';
import { Album, User, UserStatus } from './types';
import { useAuth } from './src/hooks/useAuth';

const App: React.FC = () => {
  const authData = useAuth();
  const user = authData?.user;
  const authLoading = authData?.loading;
  const signOut = authData?.signOut;

  const [currentPage, setCurrentPage] = useState<'gallery' | 'roadmap'>('gallery');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isStoryboardOpen, setIsStoryboardOpen] = useState(false);
  const [isSmartphoneMode, setIsSmartphoneMode] = useState(false);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'all' | 'by-date' | 'by-location'>('all');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => setRuntimeError(e.message);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const groupedAlbums = useMemo(() => {
    if (viewMode === 'all') return { '전체': albums };
    return albums.reduce((acc, album) => {
      const key = viewMode === 'by-date' ? album.date : album.location;
      if (!acc[key]) acc[key] = [];
      acc[key].push(album);
      return acc;
    }, {} as Record<string, Album[]>);
  }, [albums, viewMode]);

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) setSelectedAlbumIds(new Set());
  };

  const toggleAlbumSelection = (album: Album) => {
    const newSelected = new Set(selectedAlbumIds);
    if (newSelected.has(album.id)) newSelected.delete(album.id);
    else newSelected.add(album.id);
    setSelectedAlbumIds(newSelected);
  };

  const handleDeleteAlbum = async (id: string, photoUrl: string) => {
    if (!window.confirm("정말 이 사진을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, 'photos', id));
      const imageRef = ref(storage, photoUrl);
      await deleteObject(imageRef).catch(e => console.warn("Storage delete failed", e));
    } catch (error) {
      console.error("Delete error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    const handleResize = () => setIsSmartphoneMode(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setUserStatus(null);
      setIsAdmin(false);
      setUserData(null);
      setLoading(false);
      return;
    }

    const adminEmails = ['jskim6748@gmail.com', 'jskim911@travellog.com', 'jskim911@gmail.com'];
    const isAdminUser = adminEmails.includes(user.email?.toLowerCase().trim() || '');
    setIsAdmin(isAdminUser);

    const checkUserStatus = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserStatus(isAdminUser ? 'approved' : (data.status as UserStatus));
        } else {
          setUserStatus(isAdminUser ? 'approved' : 'pending');
        }
      } catch (error) { console.error('Status check error:', error); }
    };
    checkUserStatus();
  }, [user, authLoading]);

  useEffect(() => {
    if (!user || userStatus !== 'approved') {
      setAlbums([]);
      if (!authLoading) setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'photos'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.caption || '제목 없음',
          location: data.location || 'Unknown',
          date: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Just now',
          coverUrl: data.photoUrl,
          photoCount: 1,
          rating: data.rating,
          description: data.caption,
          createdAtSeconds: data.createdAt?.seconds || 0
        };
      });
      setAlbums(fetched.sort((a, b) => b.createdAtSeconds - a.createdAtSeconds) as Album[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, userStatus, authLoading]);

  const handleDownloadSelected = async () => {
    for (const id of selectedAlbumIds) {
      const album = albums.find(a => a.id === id);
      if (!album) continue;
      try {
        const response = await fetch(album.coverUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${album.title}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (e) { console.error('Download failed', e); }
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`선택한 ${selectedAlbumIds.size}장의 사진을 삭제할까요?`)) return;
    for (const id of selectedAlbumIds) {
      const album = albums.find(a => a.id === id);
      if (album) {
        await deleteDoc(doc(db, 'photos', id));
        await deleteObject(ref(storage, album.coverUrl)).catch(() => { });
      }
    }
    setSelectedAlbumIds(new Set());
    setIsSelectionMode(false);
  };

  const isActuallyLoading = authLoading || (user && userStatus === null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative font-sans">
      <header className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="w-full px-4 sm:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-4">
              <div className="relative cursor-pointer group" onClick={() => setCurrentPage('gallery')}>
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-600 to-sky-500 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all">
                  <Camera size={24} className="text-white" />
                </div>
              </div>
              {user && userStatus === 'approved' && (
                <div className="hidden md:flex ml-10 p-1.5 bg-slate-200/50 rounded-2xl text-[15px]">
                  <button onClick={() => setCurrentPage('gallery')} className={`px-8 py-3 rounded-xl font-extrabold tracking-tight transition-all ${currentPage === 'gallery' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>갤러리</button>
                  <button onClick={() => setCurrentPage('roadmap')} className={`px-8 py-3 rounded-xl font-extrabold tracking-tight transition-all ${currentPage === 'roadmap' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>로드맵</button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {authLoading ? (
                <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
              ) : user ? (
                <>
                  {isAdmin && <button onClick={() => setIsAdminPanelOpen(true)} className="p-2.5 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"><Shield size={18} /></button>}
                  <div onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-3 px-1.5 py-1.5 pr-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group">
                    <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`} alt="User" className="w-9 h-9 rounded-xl object-cover group-hover:scale-105 transition-transform" />
                    <span className="hidden sm:block text-xs font-black group-hover:text-indigo-600">{user.displayName}님</span>
                  </div>
                  <button onClick={() => signOut?.()} className="p-2.5 text-slate-400 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsLoginModalOpen(true)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900">로그인</button>
                  <button onClick={() => setIsSignupModalOpen(true)} className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">회원가입</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 pt-6">
        {user && userStatus === 'pending' && (
          <div className="max-w-4xl mx-auto mb-8 p-8 bg-white border border-yellow-200 rounded-[2rem] text-center shadow-xl shadow-yellow-50/50">
            <h3 className="text-xl font-black text-slate-900 mb-2">승인 대기 중입니다 ⏳</h3>
            <p className="text-slate-500 font-medium">관리자가 승인하면 여행 기록을 시작할 수 있습니다. 잠시만 기다려주세요!</p>
          </div>
        )}

        {currentPage === 'roadmap' && userStatus === 'approved' ? (
          <RoadmapPage
            isSmartphoneMode={isSmartphoneMode}
            selectedTripId={selectedTripId}
            onSelectTrip={setSelectedTripId}
            onBack={() => setCurrentPage('gallery')}
          />
        ) : (
          <>
            {user && userStatus === 'approved' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                <HeroBanner />
                <UploadSection onOpenLoginModal={() => setIsLoginModalOpen(true)} isCompact={true} />
              </div>
            )}

            {user && userStatus === 'approved' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between my-8 pb-4 border-b border-slate-200">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gallery</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{albums.length} Moments Captured</p>
                </div>
                <div className="flex items-center gap-3 mt-6 sm:mt-0">
                  <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 shadow-inner">
                    {[
                      { id: 'all', label: '전체' },
                      { id: 'by-date', label: '날짜' },
                      { id: 'by-location', label: '장소' }
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => setViewMode(m.id as any)}
                        className={`px-5 py-2 rounded-xl text-[13px] font-black transition-all ${viewMode === m.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="w-px h-8 bg-slate-200 mx-1" />
                  <button onClick={toggleSelectionMode} className={`p-2.5 rounded-2xl transition-all ${isSelectionMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300'}`}><CheckCircle2 size={20} /></button>
                  {isSelectionMode && selectedAlbumIds.size > 0 && (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                      <button onClick={() => setIsStoryboardOpen(true)} className="p-2.5 bg-violet-600 text-white rounded-2xl shadow-lg hover:bg-violet-700 transition-all"><BookOpen size={20} /></button>
                      <button onClick={handleDeleteSelected} className="p-2.5 bg-red-500 text-white rounded-2xl shadow-lg hover:bg-red-600 transition-all"><Trash2 size={20} /></button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isActuallyLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="aspect-[4/5] bg-slate-200 rounded-[2rem] animate-pulse" />)}
              </div>
            ) : !user ? (
              <div className="text-center py-32 bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100 shadow-2xl shadow-slate-200/50">
                <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <Camera size={48} className="text-slate-200" />
                </div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">TravelLog를 시작하세요</h3>
                <p className="text-slate-400 mt-2 font-medium">당신만의 특별한 여행 순간을 기록해보세요.</p>
                <button onClick={() => setIsLoginModalOpen(true)} className="mt-10 px-12 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">지금 시작하기</button>
              </div>
            ) : albums.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <p className="text-slate-400 font-black uppercase tracking-widest text-sm">아직 등록된 사진이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-16">
                {(Object.entries(groupedAlbums) as [string, Album[]][]).map(([groupTitle, groupAlbums]) => (
                  <div key={groupTitle} className="space-y-8">
                    {viewMode !== 'all' && (
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-full" />
                        <div>
                          <h3 className="text-xl font-black text-slate-800 tracking-tight">{groupTitle}</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{groupAlbums.length} SHOOTS</p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                      {groupAlbums.map(album => (
                        <PhotoCard
                          key={album.id}
                          album={album}
                          onDelete={handleDeleteAlbum}
                          isSelectionMode={isSelectionMode}
                          isSelected={selectedAlbumIds.has(album.id)}
                          onToggleSelect={toggleAlbumSelection}
                          showMetadata={!isSmartphoneMode}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <SignupModal isOpen={isSignupModalOpen} onClose={() => setIsSignupModalOpen(false)} onSwitchToLogin={() => { setIsSignupModalOpen(false); setIsLoginModalOpen(true); }} />
      <ProfileEditModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      {isAdmin && <AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} currentUserUid={user?.uid || ''} adminName={user?.displayName || '관리자'} adminEmail={user?.email || ''} />}
      {isStoryboardOpen && <StoryboardCreator isOpen={isStoryboardOpen} onClose={() => setIsStoryboardOpen(false)} selectedAlbums={albums.filter(a => selectedAlbumIds.has(a.id))} />}
    </div>
  );
};

export default App;