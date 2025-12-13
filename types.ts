export interface Album {
  id: string;
  title: string;
  location: string;
  date: string;
  coverUrl: string;
  photoCount: number;
  rating?: number;
  description?: string;
}

export interface UploadState {
  isUploading: boolean;
  progress: number;
}