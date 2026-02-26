import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileImage, CheckCircle2, LogIn, MapPin, Camera, PlusCircle, Calendar } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { storage, db } from '../firebase';
import { useAuth } from '../src/hooks/useAuth';
import imageCompression from 'browser-image-compression';

interface UploadSectionProps {
  onOpenLoginModal: () => void;
  isCompact?: boolean;
}

const FilePreview = ({ file }: { file: File }) => {
  const [preview, setPreview] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return <img src={preview} alt={file.name} className="w-full h-full object-cover" />;
};

interface UploadSectionProps {
  onOpenLoginModal: () => void;
  isCompact?: boolean;
  isSmartphoneMode?: boolean;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onOpenLoginModal, isCompact = false, isSmartphoneMode = false }) => {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [locationInput, setLocationInput] = useState('');
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [progressMessage, setProgressMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray: File[] = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
      setUploadStatus('idle');
    }
  };


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files) as File[];
      const imageFiles = filesArray.filter(file => file.type.startsWith('image/'));
      setSelectedFiles((prev) => [...prev, ...imageFiles]);
      setUploadStatus('idle');

      if (imageFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...imageFiles]);
        setUploadStatus('idle');
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !user) return;

    setUploadStatus('uploading');

    try {

      for (let fileIndex = 0; fileIndex < selectedFiles.length; fileIndex++) {
        const file = selectedFiles[fileIndex];

        let aiTitle = file.name.replace(/\.[^/.]+$/, "");
        let aiRating = 4;

        // 이미지 압축 (강화된 설정)
        setProgressMessage(`'${file.name}' 최적화 중... (${fileIndex + 1}/${selectedFiles.length})`);
        const compressionOptions = {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1280,
          useWebWorker: true
        };

        const compressedFile = await imageCompression(file, compressionOptions);

        // 썸네일 생성 (강화된 설정)
        const thumbnailOptions = {
          maxSizeMB: 0.1,
          maxWidthOrHeight: 300,
          useWebWorker: true
        };
        const thumbnailFile = await imageCompression(file, thumbnailOptions);

        // 원본 업로드
        setProgressMessage(`'${file.name}' 업로드 중... (${fileIndex + 1}/${selectedFiles.length})`);
        const timestamp = Date.now();
        const storageRef = ref(storage, `photos/${user.uid}/${timestamp}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, compressedFile);
        const downloadUrl = await getDownloadURL(snapshot.ref);

        // 썸네일 업로드
        const thumbnailRef = ref(storage, `thumbnails/${user.uid}/${timestamp}_thumb_${file.name}`);
        const thumbnailSnapshot = await uploadBytes(thumbnailRef, thumbnailFile);
        const thumbnailUrl = await getDownloadURL(thumbnailSnapshot.ref);

        // 이미지 메타데이터 추출
        const img = new Image();
        const imgLoadPromise: Promise<{ width: number, height: number }> = new Promise((resolve) => {
          img.onload = () => {
            resolve({ width: img.width, height: img.height });
          };
          img.src = URL.createObjectURL(file);
        });
        const { width, height } = await imgLoadPromise;
        URL.revokeObjectURL(img.src);

        // Firestore에 저장
        setProgressMessage(`'${file.name}' 저장 중... (${fileIndex + 1}/${selectedFiles.length})`);

        // 만료일 계산 (30일 후)
        const expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

        await addDoc(collection(db, 'photos'), {
          userId: user.uid,
          url: downloadUrl,
          thumbnailUrl: thumbnailUrl,
          location: locationInput.trim() || "기타",
          date: Timestamp.fromDate(new Date(dateInput)),
          uploadedAt: serverTimestamp(),
          metadata: {
            originalName: file.name,
            size: file.size,
            mimeType: file.type,
            width: width,
            height: height
          },
          expiresAt: expiresAt,
          // Legacy fields for backward compatibility
          photoUrl: downloadUrl,
          fileName: file.name,
          createdAt: serverTimestamp(),
          photoCount: 1
        });
      }

      setUploadStatus('success');
      setProgressMessage('모든 사진이 업로드되었습니다!');

      setTimeout(() => {
        setSelectedFiles([]);
        setUploadStatus('idle');
        setProgressMessage('');
        setLocationInput('');
        setDateInput(new Date().toISOString().split('T')[0]); // Reset to today
      }, 2000);

    } catch (error: any) {
      console.error("Upload failed", error);
      const errorMessage = error.code ? `Firebase Error: ${error.code}` : (error.message || '업로드 중 알 수 없는 오류가 발생했습니다.');
      setProgressMessage(`오류 발생: ${errorMessage}`);
      setUploadStatus('idle');
    }
  };

  if (!user) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-sky-50 rounded-2xl border border-indigo-100 p-6 sm:p-8 text-center backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Camera size={32} className="sm:w-10 sm:h-10" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">
              여행의 순간을 기록하세요
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">
              로그인하여 사진을 업로드하고 추억을 정리해보세요
            </p>
          </div>
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-105 transition-all active:scale-95"
          >
            <span>로그인</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-200/60 w-full ${isSmartphoneMode ? 'p-4 min-h-[180px] flex flex-col justify-center' : 'p-6 sm:p-10'}`}>
      <div className="max-w-4xl mx-auto w-full">
        <div className={`flex items-center gap-3 ${isSmartphoneMode ? 'mb-3' : 'mb-8'}`}>
          <div className={`${isSmartphoneMode ? 'w-8 h-8' : 'w-12 h-12'} bg-gradient-to-br from-indigo-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100`}>
            <Upload size={isSmartphoneMode ? 16 : 22} className="text-white" />
          </div>
          <div>
            <h3 className={`${isSmartphoneMode ? 'text-base' : 'text-xl'} font-black text-slate-800 tracking-tight`}>사진 업로드</h3>
            <p className={`${isSmartphoneMode ? 'text-[8px]' : 'text-sm'} font-bold text-slate-400 uppercase tracking-widest`}>Moment Capture System</p>
          </div>
        </div>

        <div className="space-y-6">
          {selectedFiles.length === 0 ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full group"
            >
              <div className={`relative overflow-hidden ${isSmartphoneMode ? 'py-4' : 'py-12'} border-2 border-dashed border-slate-100 rounded-[2rem] hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-500`}>
                <div className={`flex ${isSmartphoneMode ? 'flex-row' : 'flex-col'} items-center justify-center ${isSmartphoneMode ? 'gap-3' : 'gap-4'} relative z-10`}>
                  <div className={`${isSmartphoneMode ? 'w-10 h-10' : 'w-20 h-20'} bg-gradient-to-br from-indigo-50 to-sky-50 group-hover:from-indigo-100 group-hover:to-sky-100 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner`}>
                    <Upload className={`${isSmartphoneMode ? 'w-5 h-5' : 'w-10 h-10'} text-indigo-600 group-hover:scale-110 transition-transform duration-500`} />
                  </div>
                  <div className={isSmartphoneMode ? 'text-left' : 'px-4'}>
                    <p className={`${isSmartphoneMode ? 'text-sm' : 'text-lg'} font-black text-slate-800 group-hover:text-indigo-600 transition-colors`}>
                      여행 사진 선택하기
                    </p>
                    {!isSmartphoneMode && <p className="text-sm text-slate-400 font-medium mt-1">또는 화면으로 파일을 끌어오세요</p>}
                  </div>
                </div>
              </div>
            </button>
          ) : (
            <div className="space-y-5">
              {/* Selected Files Preview */}
              <div className="bg-slate-50/50 rounded-3xl p-5 border border-slate-200/60">
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-sm font-black text-slate-800">
                      선택된 이미지 ({selectedFiles.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-xs text-slate-400 hover:text-red-500 font-bold transition-colors"
                  >
                    전체 취소
                  </button>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {selectedFiles.slice(0, 5).map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-sm transition-transform hover:scale-105 group">
                      <FilePreview file={file} />
                      <button
                        onClick={() => removeFile(idx)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]"
                      >
                        <X size={20} className="text-white" />
                      </button>
                    </div>
                  ))}
                  {selectedFiles.length > 5 && (
                    <div className="flex-shrink-0 w-24 h-24 rounded-2xl border-2 border-white bg-slate-100 flex items-center justify-center text-slate-500 font-black shadow-sm">
                      +{selectedFiles.length - 5}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 w-24 h-24 rounded-2xl border-2 border-dashed border-indigo-200 bg-white flex items-center justify-center hover:border-indigo-400 hover:bg-indigo-50 transition-all shadow-sm group"
                  >
                    <PlusCircle size={32} className="text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                  </button>
                </div>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSmartphoneMode ? 'gap-3' : 'gap-4'}`}>
                {/* Date Input */}
                <div className="relative font-bold">
                  <label className="text-[9px] text-slate-400 uppercase tracking-widest ml-1 mb-1 block">여행 날짜</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className={`w-full ${isSmartphoneMode ? 'px-3 py-2.5 pl-10' : 'px-4 py-3.5 pl-11'} rounded-2xl border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all bg-white text-slate-800 shadow-sm text-sm`}
                    />
                    <Calendar size={isSmartphoneMode ? 16 : 18} className={`absolute ${isSmartphoneMode ? 'left-3.5' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} />
                  </div>
                </div>

                {/* Location Input */}
                <div className="relative font-bold">
                  <label className="text-[9px] text-slate-400 uppercase tracking-widest ml-1 mb-1 block">방문 장소</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="예: 제주도, 파리"
                      className={`w-full ${isSmartphoneMode ? 'px-3 py-2.5 pl-10' : 'px-4 py-3.5 pl-11'} rounded-2xl border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all bg-white text-slate-800 shadow-sm text-sm`}
                    />
                    <MapPin size={isSmartphoneMode ? 16 : 18} className={`absolute ${isSmartphoneMode ? 'left-3.5' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} />
                  </div>
                </div>
              </div>


              {/* Progress Message */}
              {progressMessage && (
                <div className="text-[11px] text-center text-indigo-600 font-black tracking-widest py-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                  {progressMessage.toUpperCase()}
                </div>
              )}

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={uploadStatus === 'uploading' || uploadStatus === 'success'}
                className={`
                    w-full ${isSmartphoneMode ? 'py-3.5 text-sm' : 'py-4 text-base'} rounded-2xl font-black text-white shadow-xl flex items-center justify-center gap-3 transition-all duration-300
                    ${uploadStatus === 'success'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200'
                    : 'btn-premium'}
                    ${uploadStatus === 'uploading' ? 'opacity-80 cursor-wait' : 'transform active:scale-95'}
                  `}
              >
                {uploadStatus === 'uploading' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    SYSTEM UPLOADING...
                  </>
                ) : uploadStatus === 'success' ? (
                  <>
                    <CheckCircle2 size={isSmartphoneMode ? 18 : 20} />
                    SAVED SUCCESSFULLY
                  </>
                ) : (
                  <>
                    <Upload size={isSmartphoneMode ? 18 : 20} />
                    <span>{selectedFiles.length}장의 사진 기록하기</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};