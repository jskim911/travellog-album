import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileImage, CheckCircle2, Sparkles, LogIn, MapPin } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../firebase';
import { analyzePhotoAndGenerateCaption } from '../src/utils/gemini';
import { useAuth } from '../src/hooks/useAuth';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files) as File[];
      const imageFiles = filesArray.filter(file => file.type.startsWith('image/'));
      setSelectedFiles((prev) => [...prev, ...imageFiles]);
      setUploadStatus('idle');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !user) return;

    setUploadStatus('uploading');

    try {
      let fileIndex = 0;
      for (const file of selectedFiles) {
        fileIndex++;
        // 1. Generate Caption with Gemini
        // Increase delay to 4.5s to ensure unique analysis and avoid Rate Limits
        if (selectedFiles.length > 1) {
          setProgressMessage(`'${file.name}' AI가 심층 분석 중... 잠시만 기다려주세요 (${fileIndex}/${selectedFiles.length})`);
          await new Promise(resolve => setTimeout(resolve, 4500));
        }

        setProgressMessage(`'${file.name}' AI 분석 중...`);
        const { title, rating } = await analyzePhotoAndGenerateCaption(file);

        // 2. Upload to Firebase Storage
        setProgressMessage(`'${file.name}' 저장소 업로드 중...`);
        const storageRef = ref(storage, `photos/${user.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);

        // 3. Save metadata to Firestore
        setProgressMessage(`'${file.name}' 앨범에 기록 중...`);
        await addDoc(collection(db, 'photos'), {
          userId: user.uid,
          photoUrl: downloadUrl,
          title: title,
          caption: "", // Impression removed as per user request
          rating: rating,
          fileName: file.name,
          location: locationInput.trim() || "기타",
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
      }, 2000);

    } catch (error: any) {
      console.error("Upload failed", error);
      // Detailed error message for better debugging
      const errorMessage = error.code ? `Firebase Error: ${error.code}` : (error.message || '업로드 중 알 수 없는 오류가 발생했습니다.');
      setProgressMessage(`오류 발생: ${errorMessage}`);
      setUploadStatus('idle'); // Allow retry
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Sparkles size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">로그인하고 여행 기록하기</h2>
            <p className="text-slate-500 mt-2 max-w-sm mx-auto">
              로그인하여 사진을 업로드하고,<br />Gemini AI가 만들어주는 감성 캡션을 경험해보세요.
            </p>
          </div>
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm mt-2"
          >
            <LogIn size={20} />
            <span>로그인하기</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800">새 사진 업로드</h2>
        <p className="text-slate-500 text-sm">AI가 사진을 분석하여 멋진 캡션을 달아드립니다.</p>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center
          ${isDragging
            ? 'border-black bg-zinc-50 scale-[1.02]'
            : 'border-zinc-200 hover:border-zinc-400 bg-white'
          }
        `}
      >
        <div className="bg-zinc-100 p-4 rounded-full mb-4">
          <Upload className={`w-6 h-6 ${isDragging ? 'text-black' : 'text-zinc-400'}`} />
        </div>

        <p className="text-slate-700 font-medium mb-1">
          사진을 이곳에 드래그하거나 선택해주세요
        </p>
        <p className="text-slate-400 text-xs mb-4">AI가 자동으로 캡션을 생성합니다</p>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-2 bg-black text-white hover:bg-zinc-800 rounded-full text-sm font-bold transition-all shadow-sm active:scale-95"
        >
          파일 선택하기
        </button>

        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="mt-6 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">
              선택된 파일 ({selectedFiles.length})
            </span>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-red-500 hover:text-red-600 font-medium"
            >
              모두 지우기
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {selectedFiles.slice(0, 5).map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                <div className="absolute inset-0 bg-slate-100 flex items-center justify-center text-slate-300">
                  <FilePreview file={file} />
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-white hover:text-red-200"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
            {selectedFiles.length > 5 && (
              <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 text-xs font-medium">
                +{selectedFiles.length - 5}
              </div>
            )}
          </div>

          {/* Location Input */}
          <div className="mb-4 animate-in fade-in slide-in-from-top-1">
            <label className="block text-sm font-bold text-slate-700 mb-1.5 pl-1">어디서 찍은 사진인가요?</label>
            <div className="relative">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="여행 장소를 입력하세요 (예: 제주도, 파리)"
                className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-slate-400 bg-slate-50 focus:bg-white"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <MapPin size={18} />
              </div>
            </div>
          </div>

          <div className="text-sm text-center text-blue-600 font-medium mb-3 h-5">
            {progressMessage}
          </div>

          <button
            onClick={handleUpload}
            disabled={uploadStatus === 'uploading' || uploadStatus === 'success'}
            className={`
              w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95
              ${uploadStatus === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-black hover:bg-zinc-800'}
              ${uploadStatus === 'uploading' ? 'opacity-80 cursor-wait' : ''}
            `}
          >
            {uploadStatus === 'uploading' && (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                AI 분석 및 업로드 중...
              </>
            )}
            {uploadStatus === 'success' && (
              <>
                <CheckCircle2 size={18} />
                완료되었습니다!
              </>
            )}
            {uploadStatus === 'idle' && (
              <>
                <Sparkles size={18} />
                AI 캡션 생성 및 업로드
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};