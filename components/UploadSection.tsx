import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileImage, CheckCircle2, Sparkles, LogIn, MapPin, Camera, PlusCircle } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { storage, db } from '../firebase';
import { useAuth } from '../src/hooks/useAuth';
import { AISuggestions } from './AISuggestions';
import { analyzePhotoAndGenerateCaption, generateCaptionSuggestions } from '../src/utils/gemini';
import imageCompression from 'browser-image-compression';

interface UploadSectionProps {
  onOpenLoginModal: () => void;
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

export const UploadSection: React.FC<UploadSectionProps> = ({ onOpenLoginModal }) => {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [locationInput, setLocationInput] = useState('');
  const [progressMessage, setProgressMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Suggestions State
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedCaption, setSelectedCaption] = useState('');
  const [customCaption, setCustomCaption] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
      setUploadStatus('idle');

      // AI 분석: 첫 번째 파일에 대해 자동으로 소감 문구 생성
      if (filesArray.length > 0 && aiSuggestions.length === 0) {
        await generateAISuggestions(filesArray[0]);
      }
    }
  };

  // AI 소감 문구 생성
  const generateAISuggestions = async (file: File) => {
    setLoadingAI(true);
    try {
      const suggestions = await generateCaptionSuggestions(file, locationInput);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('AI 추천 생성 실패:', error);
      setAiSuggestions([]);
    } finally {
      setLoadingAI(false);
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

      // AI 분석: 첫 번째 파일에 대해 자동으로 소감 문구 생성
      if (imageFiles.length > 0 && aiSuggestions.length === 0) {
        await generateAISuggestions(imageFiles[0]);
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
      const finalCaption = selectedCaption || customCaption;

      for (let fileIndex = 0; fileIndex < selectedFiles.length; fileIndex++) {
        const file = selectedFiles[fileIndex];

        // AI 분석 (첫 번째 파일만 또는 각 파일마다)
        setProgressMessage(`'${file.name}' AI 분석 중... (${fileIndex + 1}/${selectedFiles.length})`);
        let aiTitle = file.name.replace(/\.[^/.]+$/, "");
        let aiRating = 4;

        try {
          const aiResult = await analyzePhotoAndGenerateCaption(file);
          aiTitle = aiResult.title;
          aiRating = aiResult.rating;
        } catch (error) {
          console.error('AI 분석 실패:', error);
        }

        // 이미지 압축
        setProgressMessage(`'${file.name}' 압축 중... (${fileIndex + 1}/${selectedFiles.length})`);
        const compressionOptions = {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };

        const compressedFile = await imageCompression(file, compressionOptions);

        // 썸네일 생성
        const thumbnailOptions = {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 400,
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
          caption: finalCaption || "",
          aiSuggestions: aiSuggestions.length > 0 ? aiSuggestions : undefined,
          title: aiTitle,
          rating: aiRating,
          date: serverTimestamp(),
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
        setAiSuggestions([]);
        setSelectedCaption('');
        setCustomCaption('');
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
      <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-2xl border border-violet-100 p-6 sm:p-8 text-center backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-violet-500 to-blue-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-violet-200">
            <Camera size={32} className="sm:w-10 sm:h-10" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              여행의 순간을 기록하세요
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">
              로그인하여 사진을 업로드하고 추억을 정리해보세요
            </p>
          </div>
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-full font-bold shadow-lg shadow-violet-200 hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            <LogIn size={20} />
            <span>시작하기</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200/60">
      <div className="grid md:grid-cols-2 gap-0">
        {/* Left Side - Travel Inspiration */}
        <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 p-8 sm:p-12 flex flex-col justify-between min-h-[300px] md:min-h-[400px] overflow-hidden">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white rounded-full animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-24 h-24 border-4 border-white rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
            <div className="absolute top-1/2 left-1/4 w-16 h-16 border-4 border-white rotate-45 animate-spin" style={{ animationDuration: '20s' }}></div>
            <div className="absolute top-1/4 right-1/3 w-20 h-20 border-4 border-white rounded-full animate-bounce" style={{ animationDuration: '4s' }}></div>
          </div>

          {/* Gradient Overlay Animation */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-pulse" style={{ animationDuration: '5s' }}></div>

          {/* Content */}
          <div className="relative z-10 animate-in fade-in slide-in-from-left-5 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6 hover:bg-white/30 transition-all duration-300 hover:scale-105">
              <Camera size={16} className="text-white" />
              <span className="text-white text-sm font-bold">TravelLog</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight animate-in fade-in slide-in-from-left-3 duration-1000">
              여행의 순간을<br />
              영원히 간직하세요
            </h2>

            <p className="text-white/90 text-base sm:text-lg leading-relaxed mb-6 animate-in fade-in slide-in-from-left-3 duration-1000 delay-150">
              아름다운 추억을 사진으로 기록하고,<br />
              장소별로 정리하여 언제든 다시 떠올려보세요.
            </p>

            {/* Features with staggered animation */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-700 delay-300 hover:translate-x-2 transition-transform">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/30 hover:scale-110 transition-all duration-300">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
                <span className="text-white/90 text-sm">장소별 자동 분류</span>
              </div>
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-700 delay-500 hover:translate-x-2 transition-transform">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/30 hover:scale-110 transition-all duration-300">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
                <span className="text-white/90 text-sm">무제한 사진 저장</span>
              </div>
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-700 delay-700 hover:translate-x-2 transition-transform">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/30 hover:scale-110 transition-all duration-300">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
                <span className="text-white/90 text-sm">추억 비디오 제작</span>
              </div>
            </div>
          </div>

          {/* Decorative Icons with hover effects */}
          <div className="relative z-10 flex gap-3 mt-8 animate-in fade-in slide-in-from-bottom-3 duration-1000 delay-1000">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center hover:bg-white/20 hover:scale-125 hover:-rotate-12 transition-all duration-300 cursor-pointer">
              <span className="text-2xl">✈️</span>
            </div>
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center hover:bg-white/20 hover:scale-125 hover:rotate-12 transition-all duration-300 cursor-pointer animate-bounce" style={{ animationDuration: '3s', animationDelay: '0.5s' }}>
              <span className="text-2xl">🏖️</span>
            </div>
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center hover:bg-white/20 hover:scale-125 hover:-rotate-12 transition-all duration-300 cursor-pointer">
              <span className="text-2xl">🗺️</span>
            </div>
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center hover:bg-white/20 hover:scale-125 hover:rotate-12 transition-all duration-300 cursor-pointer animate-bounce" style={{ animationDuration: '3s', animationDelay: '1s' }}>
              <span className="text-2xl">📸</span>
            </div>
          </div>
        </div>

        {/* Right Side - Upload Functionality */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
              <Upload size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">사진 업로드</h3>
              <p className="text-xs text-slate-500">여행 추억을 저장하세요</p>
            </div>
          </div>

          <div className="space-y-4">
            {selectedFiles.length === 0 ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-slate-300 rounded-2xl hover:border-violet-400 hover:bg-violet-50/50 transition-all group"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-blue-100 group-hover:from-violet-200 group-hover:to-blue-200 rounded-2xl flex items-center justify-center transition-all">
                    <Upload className="w-8 h-8 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-700 group-hover:text-violet-600 transition-colors">
                      사진 선택하기
                    </p>
                    <p className="text-sm text-slate-400 mt-1">또는 드래그 & 드롭</p>
                  </div>
                </div>
              </button>
            ) : (
              <>
                {/* Selected Files Preview */}
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-slate-700">
                      선택된 사진 ({selectedFiles.length}장)
                    </span>
                    <button
                      onClick={() => setSelectedFiles([])}
                      className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      전체 삭제
                    </button>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {selectedFiles.slice(0, 5).map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200 group">
                        <FilePreview file={file} />
                        <button
                          onClick={() => removeFile(idx)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X size={20} className="text-white" />
                        </button>
                      </div>
                    ))}
                    {selectedFiles.length > 5 && (
                      <div className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 text-sm font-bold">
                        +{selectedFiles.length - 5}
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 flex items-center justify-center hover:bg-violet-100 transition-colors"
                    >
                      <PlusCircle size={28} className="text-violet-600" />
                    </button>
                  </div>
                </div>

                {/* Location Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="여행 장소 (예: 제주도, 파리)"
                    className="w-full px-4 py-3 pl-11 rounded-xl border-2 border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all bg-white font-medium"
                  />
                  <MapPin size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                {/* AI Suggestions */}
                {(aiSuggestions.length > 0 || loadingAI) && (
                  <AISuggestions
                    suggestions={aiSuggestions}
                    onSelect={(caption) => {
                      setSelectedCaption(caption);
                      setCustomCaption('');
                    }}
                    onRegenerate={() => {
                      if (selectedFiles.length > 0) {
                        generateAISuggestions(selectedFiles[0]);
                      }
                    }}
                    loading={loadingAI}
                    selectedCaption={selectedCaption}
                  />
                )}

                {/* Custom Caption Input */}
                {selectedFiles.length > 0 && (
                  <div className="relative">
                    <textarea
                      value={customCaption}
                      onChange={(e) => {
                        setCustomCaption(e.target.value);
                        if (e.target.value) {
                          setSelectedCaption('');
                        }
                      }}
                      placeholder={selectedCaption || "또는 직접 소감을 입력하세요..."}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all bg-white font-medium resize-none"
                      rows={3}
                    />
                    {customCaption && (
                      <div className="absolute top-2 right-2 text-xs text-slate-400">
                        {customCaption.length}자
                      </div>
                    )}
                  </div>
                )}

                {/* Progress Message */}
                {progressMessage && (
                  <div className="text-sm text-center text-violet-600 font-medium py-3 bg-violet-50 rounded-xl border border-violet-100">
                    {progressMessage}
                  </div>
                )}

                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  disabled={uploadStatus === 'uploading' || uploadStatus === 'success'}
                  className={`
                    w-full py-4 rounded-xl text-base font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all
                    ${uploadStatus === 'success'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gradient-to-r from-violet-600 to-blue-600 hover:shadow-xl hover:shadow-violet-200'}
                    ${uploadStatus === 'uploading' ? 'opacity-80 cursor-wait' : 'transform hover:-translate-y-0.5 active:scale-95'}
                  `}
                >
                  {uploadStatus === 'uploading' && (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      업로드 중...
                    </>
                  )}
                  {uploadStatus === 'success' && (
                    <>
                      <CheckCircle2 size={20} />
                      완료!
                    </>
                  )}
                  {uploadStatus === 'idle' && (
                    <>
                      <Upload size={20} />
                      {selectedFiles.length}장 업로드하기
                    </>
                  )}
                </button>
              </>
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
    </div>
  );
};