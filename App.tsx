import React, { useState, useEffect } from 'react';
import { Camera, PlusCircle, LayoutGrid, Settings, LogOut, User as UserIcon, Shield, Clock, Calendar as CalendarIcon, MapPin as MapPinIcon, Grid3x3, Download } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, where, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db, storage } from './firebase';
import { deleteObject, ref } from 'firebase/storage';
import { UploadSection } from './components/UploadSection';
import { PhotoCard } from './components/PhotoCard';
import { GallerySection } from './components/GallerySection';
import { StoryboardCreator } from './components/StoryboardCreator';
import { RoadmapPage } from './components/Roadmap/RoadmapPage';
import { EmojiGeneratorModal } from './components/Emoji/EmojiGeneratorModal';
import { X, CheckCircle2, Trash2, BookOpen, Map, Image as ImageIcon, Smile } from 'lucide-react';
import { LoginModal } from './components/LoginModal';
import { SignupModal } from './components/SignupModal';
import { AdminPanel } from './components/AdminPanel';
import { Album, User, UserStatus } from './types';
import { useAuth } from './src/hooks/useAuth';

const App: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();

  // Navigation State
  const [currentPage, setCurrentPage] = useState<'gallery' | 'roadmap'>('gallery');

  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isStoryboardOpen, setIsStoryboardOpen] = useState(false);
  const [isEmojiModalOpen, setIsEmojiModalOpen] = useState(false);

  // User status and admin check
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);

  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<Set<string>>(new Set());

  // View Mode: 'all' | 'by-date' | 'by-location'
  const [viewMode, setViewMode] = useState<'all' | 'by-date' | 'by-location'>('all');
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

  // Download selected photos
  const handleDownloadSelected = async () => {
    if (selectedAlbumIds.size === 0) return;

    const selectedAlbums = albums.filter(a => selectedAlbumIds.has(a.id));

    for (const album of selectedAlbums) {
      try {
        const response = await fetch(album.coverUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${album.title || 'photo'}_${album.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download failed:', error);
      }
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

  // Check user status and admin privileges
  useEffect(() => {
    if (!user) {
      setUserStatus(null);
      setIsAdmin(false);
      return;
    }

    const checkUserStatus = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const fullUserData = {
            ...data,
            uid: userDoc.id,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : undefined,
            retentionPeriod: data.retentionPeriod || 30
          } as User;

          setUserStatus(fullUserData.status);
          setUserData(fullUserData);

          // Check if user is admin
          // Only specific emails have admin access
          const adminEmails = ['jskim6748@gmail.com']; // Real admin email
          const isAdminUser = adminEmails.includes(user.email || '');
          setIsAdmin(isAdminUser);
          console.log(`Current User: ${user.email}, IsAdmin: ${isAdminUser}`); // 디버깅용: 현재 사용자가 관리자인지 확인
        } else {
          setUserStatus(null);
          setUserData(null);
        }
      } catch (error) {
        console.error('Error checking user status:', error);
      }
    };

    checkUserStatus();
  }, [user]);

  // Fetch data from Firestore
  useEffect(() => {
    if (!user || userStatus !== 'approved') {
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
  }, [user, userStatus]);



  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative">
      {/* Header */}
      {/* Modern Header with Gradient */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-violet-50 via-white to-blue-50 border-b border-slate-200/60 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative cursor-pointer" onClick={() => setCurrentPage('gallery')}>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200 transform hover:scale-105 transition-all duration-300">
                  <Camera size={20} className="sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div className="hidden xs:block cursor-pointer" onClick={() => setCurrentPage('gallery')}>
                <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent tracking-tight">
                  TravelLog
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium -mt-0.5">여행의 모든 순간</p>
              </div>

              {/* Navigation Tabs (Desktop/Tablet) */}
              {user && userStatus === 'approved' && (
                <div className="hidden md:flex ml-8 bg-slate-100/50 p-1.5 rounded-2xl">
                  <button
                    onClick={() => setCurrentPage('gallery')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-lg font-bold transition-all ${currentPage === 'gallery'
                      ? 'bg-white text-violet-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <ImageIcon size={20} />
                    여행 갤러리 만들기
                  </button>
                  <button
                    onClick={() => setCurrentPage('roadmap')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-lg font-bold transition-all ${currentPage === 'roadmap'
                      ? 'bg-white text-violet-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <Map size={20} />
                    여행 계획 세우기
                  </button>
                </div>
              )}
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Navigation Toggle (Simple version for now) */}
              {user && userStatus === 'approved' && (
                <div className="flex md:hidden mr-2">
                  <button
                    onClick={() => setCurrentPage(currentPage === 'gallery' ? 'roadmap' : 'gallery')}
                    className="p-2 bg-slate-100 rounded-full text-violet-600"
                  >
                    {currentPage === 'gallery' ? <Map size={20} /> : <ImageIcon size={20} />}
                  </button>
                </div>
              )}

              {authLoading ? (
                <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
              ) : user ? (
                <>
                  {/* Data Retention Display */}
                  {userStatus === 'approved' && userData && (
                    <div className="hidden lg:flex flex-col items-end mr-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-medium">서비스 이용기간</span>
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-violet-500" />
                        <span className="text-sm font-bold text-slate-800">
                          D-{Math.max(0, Math.ceil(((userData.createdAt instanceof Date ? userData.createdAt.getTime() : Date.now()) + (userData.retentionPeriod || 30) * 86400000 - Date.now()) / 86400000))}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Admin Button */}
                  {isAdmin && (
                    <button
                      onClick={() => setIsAdminPanelOpen(true)}
                      className="flex items-center gap-1 p-2 sm:p-2.5 text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-full transition-all"
                      title="관리자 패널"
                    >
                      <Shield size={18} className="sm:w-5 sm:h-5" />
                      <span className="text-xs font-bold hidden sm:inline">관리자</span>
                    </button>
                  )}

                  {/* User Profile */}
                  <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-violet-400 to-blue-400 overflow-hidden ring-2 ring-white shadow-md">
                      <img
                        src={user.photoURL || "https://picsum.photos/id/64/200/200"}
                        alt={user.displayName || "User"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm font-bold text-slate-800 leading-none">{user.displayName}</p>
                      <p className="text-[10px] text-slate-500 leading-none mt-0.5">
                        {userStatus === 'approved' ? '승인됨' : userStatus === 'pending' ? '승인 대기' : '프리미엄'}
                      </p>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={signOut}
                    className="p-2 sm:p-2.5 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-full transition-all backdrop-blur-sm border border-transparent hover:border-slate-200/60"
                    title="로그아웃"
                  >
                    <LogOut size={18} className="sm:w-5 sm:h-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsSignupModalOpen(true)}
                    className="px-4 py-2 sm:px-5 sm:py-2.5 bg-white text-violet-600 text-sm font-bold rounded-full border-2 border-violet-600 hover:bg-violet-50 transition-all"
                  >
                    회원가입
                  </button>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-5 py-2 sm:px-6 sm:py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-bold rounded-full hover:shadow-lg hover:shadow-violet-200 transition-all transform hover:-translate-y-0.5"
                  >
                    로그인
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">

        {/* Pending Approval Banner */}
        {user && userStatus === 'pending' && (
          <div className="max-w-4xl mx-auto mb-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center">
                <Clock size={24} className="text-yellow-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-yellow-900">승인 대기 중</h3>
                <p className="text-yellow-700 mt-1">
                  관리자가 가입을 승인하면 모든 기능을 사용하실 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'roadmap' && userStatus === 'approved' ? (
          <RoadmapPage />
        ) : (
          <>
            {/* Compact Upload Button - Only show when approved */}
            {user && userStatus === 'approved' && (
              <div className="fixed bottom-6 right-6 z-40">
                <button
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                  className="group relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-violet-600 to-blue-600 rounded-full shadow-2xl shadow-violet-300 hover:shadow-violet-400 transition-all duration-300 transform hover:scale-110 active:scale-95"
                >
                  <div className="absolute inset-0 bg-white/20 rounded-full blur-xl group-hover:bg-white/30 transition-all"></div>
                  <PlusCircle size={28} className="sm:w-8 sm:h-8 text-white relative z-10 mx-auto" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                </button>
                <input
                  id="file-upload-input"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      console.log('Files selected:', files);
                    }
                  }}
                />
              </div>
            )}

            {/* Upload Section - Compact Version */}
            {userStatus === 'approved' && (
              <section className="w-full mb-6 sm:mb-8">
                <UploadSection onOpenLoginModal={() => setIsLoginModalOpen(true)} />
              </section>
            )}

            {/* List Header & Controls */}
            {user && userStatus === 'approved' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-6 sm:mb-8 mt-8 sm:mt-16 px-2 border-b border-zinc-200 pb-3 sm:pb-4 gap-3 sm:gap-0">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">Gallery</h2>
                  <p className="text-zinc-500 mt-0.5 sm:mt-1 text-sm sm:text-base font-medium">나만의 특별한 여행 기록</p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                  {isSelectionMode ? (
                    <>
                      <span className="text-xs sm:text-sm font-medium text-violet-600 animate-in fade-in">
                        {selectedAlbumIds.size}개 선택됨
                      </span>
                      {selectedAlbumIds.size > 0 && (
                        <>
                          <button
                            onClick={() => setIsStoryboardOpen(true)}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-xs sm:text-sm font-bold rounded-full shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 animate-in zoom-in-50"
                          >
                            <BookOpen size={14} className="sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">스토리보드</span>
                          </button>
                          <button
                            onClick={() => setIsEmojiModalOpen(true)}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs sm:text-sm font-bold rounded-full shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 animate-in zoom-in-50"
                          >
                            <Smile size={14} className="sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">이모지</span>
                          </button>
                          <button
                            onClick={handleDownloadSelected}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs sm:text-sm font-bold rounded-full shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 animate-in zoom-in-50"
                          >
                            <Download size={14} className="sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">다운로드</span>
                          </button>
                          <button
                            onClick={handleDeleteSelected}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-100 hover:bg-red-200 text-red-600 text-xs sm:text-sm font-bold rounded-full shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 animate-in zoom-in-50"
                          >
                            <Trash2 size={14} className="sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">삭제</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={toggleSelectionMode}
                        className="p-1.5 sm:p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full transition-colors"
                        title="취소"
                      >
                        <X size={18} className="sm:w-5 sm:h-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      {/* View Mode Toggle */}
                      <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
                        <button
                          onClick={() => setViewMode('all')}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'all'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                          title="전체 보기"
                        >
                          <Grid3x3 size={14} className="inline mr-1" />
                          <span className="hidden sm:inline">전체</span>
                        </button>
                        <button
                          onClick={() => setViewMode('by-date')}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'by-date'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                          title="날짜별"
                        >
                          <CalendarIcon size={14} className="inline mr-1" />
                          <span className="hidden sm:inline">날짜별</span>
                        </button>
                        <button
                          onClick={() => setViewMode('by-location')}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'by-location'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                          title="장소별"
                        >
                          <MapPinIcon size={14} className="inline mr-1" />
                          <span className="hidden sm:inline">장소</span>
                        </button>
                      </div>

                      <button
                        onClick={() => setIsEmojiModalOpen(true)}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs sm:text-sm font-bold rounded-full shadow-md transition-all flex items-center gap-1.5 sm:gap-2"
                      >
                        <Smile size={14} className="sm:w-4 sm:h-4" />
                        <span>이모지 만들기</span>
                      </button>

                      <button
                        onClick={toggleSelectionMode}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold rounded-full shadow-md transition-all flex items-center gap-1.5 sm:gap-2"
                      >
                        <CheckCircle2 size={14} className="sm:w-4 sm:h-4" />
                        <span>선택 / 관리</span>
                      </button>
                      <span className="px-2.5 py-1 sm:px-3 sm:py-1 bg-zinc-100 text-zinc-600 text-xs rounded-full font-bold">
                        {albums.length} Photos
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Location Tabs */}
            {user && userStatus === 'approved' && albums.length > 0 && (
              <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 px-1 scrollbar-hide">
                {['전체', ...Array.from(new Set(albums.map(a => a.location))).sort()].map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setActiveTab(loc)}
                    className={`
                  px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all
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
              viewMode === 'by-date' ? (
                // Date Grouping View
                <div className="space-y-8">
                  {Object.entries(
                    filteredAlbums.reduce((groups, album) => {
                      const dateKey = album.date; // Assuming album.date is string "YYYY. M. D." or similar
                      if (!groups[dateKey]) groups[dateKey] = [];
                      groups[dateKey].push(album);
                      return groups;
                    }, {} as Record<string, Album[]>)
                  ).map(([date, groupAlbums]) => (
                    <div key={date}>
                      <h3 className="text-xl font-bold text-slate-800 mb-4 px-2">{date}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mx-auto">
                        {groupAlbums.map((album) => (
                          <PhotoCard
                            key={album.id}
                            album={album}
                            onDelete={handleDeleteAlbum}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedAlbumIds.has(album.id)}
                            onToggleSelect={toggleAlbumSelection}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Default View (All or filtered by location, flattened)
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mx-auto">
                  {filteredAlbums.map((album) => (
                    <PhotoCard
                      key={album.id}
                      album={album}
                      onDelete={handleDeleteAlbum}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedAlbumIds.has(album.id)}
                      onToggleSelect={toggleAlbumSelection}
                    />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </main>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <SignupModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        onSwitchToLogin={() => {
          setIsSignupModalOpen(false);
          setIsLoginModalOpen(true);
        }}
      />

      {
        isAdmin && (
          <AdminPanel
            isOpen={isAdminPanelOpen}
            onClose={() => setIsAdminPanelOpen(false)}
            currentUserUid={user?.uid || ''}
            adminName={user?.displayName || '관리자'}
            adminEmail={user?.email || ''}
          />
        )
      }

      {
        isStoryboardOpen && (
          <StoryboardCreator
            isOpen={isStoryboardOpen}
            onClose={() => setIsStoryboardOpen(false)}
            selectedAlbums={albums.filter(a => selectedAlbumIds.has(a.id))}
          />
        )
      }

      {
        isEmojiModalOpen && (
          <EmojiGeneratorModal
            isOpen={isEmojiModalOpen}
            onClose={() => setIsEmojiModalOpen(false)}
            photos={selectedAlbumIds.size > 0 ? albums.filter(a => selectedAlbumIds.has(a.id)) : albums}
          />
        )
      }
    </div >
  );
};

export default App;