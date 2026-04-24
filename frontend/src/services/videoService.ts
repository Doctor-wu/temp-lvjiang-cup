import axios from 'axios';
import type { Video, VideoItem } from '@/api/types';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { requestCache, CACHE_TTL } from '@/utils/requestCache';

const API_BASE = '/api';

export interface VideoQueryParams {
  page?: number;
  pageSize?: number;
  status?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateVideoRequest {
  title: string;
  bvid: string;
  page: number;
  coverUrl?: string;
  order: number;
  status?: 0 | 1;
}

export interface UpdateVideoRequest {
  title?: string;
  bvid?: string;
  page?: number;
  coverUrl?: string;
  order?: number;
  status?: 0 | 1;
}

export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VideoServiceState {
  videos: Video[];
  loading: boolean;
  error: string | null;
}

let state: VideoServiceState = {
  videos: [],
  loading: false,
  error: null,
};

const listeners: Set<(state: VideoServiceState) => void> = new Set();

function setState(newState: Partial<VideoServiceState>): void {
  state = { ...state, ...newState };
  listeners.forEach(listener => listener(state));
}

function handleError(error: unknown, defaultMessage: string): never {
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  setState({ error: errorMessage, loading: false });
  throw new Error(errorMessage);
}

export const videoService = {
  async getFrontendVideos(): Promise<{ list: VideoItem[]; total: number }> {
    setState({ loading: true, error: null });

    try {
      const response = await axios.get(`${API_BASE}/videos/frontend`);
      setState({ loading: false });
      return response.data;
    } catch (error) {
      handleError(error, '获取前端视频列表失败');
    }
  },

  async getBackendVideos(params?: VideoQueryParams): Promise<PaginatedData<Video>> {
    setState({ loading: true, error: null });

    try {
      const response = await axios.get(`${API_BASE}/videos`, { params });
      const result = response.data;
      setState({ videos: result.list || [], loading: false });
      return result;
    } catch (error) {
      handleError(error, '获取后台视频列表失败');
    }
  },

  async createVideo(data: CreateVideoRequest): Promise<{ id: string }> {
    setState({ loading: true, error: null });

    try {
      const response = await axios.post(`${API_BASE}/videos`, data);
      setState({ loading: false });
      return response.data;
    } catch (error) {
      handleError(error, '创建视频失败');
    }
  },

  async updateVideo(id: string, data: UpdateVideoRequest): Promise<Video> {
    setState({ loading: true, error: null });

    try {
      const response = await axios.patch(`${API_BASE}/videos/${id}`, data);
      const updatedVideo = response.data;
      setState({
        videos: state.videos.map(v => (v.id === id ? updatedVideo : v)),
        loading: false,
      });
      return updatedVideo;
    } catch (error) {
      handleError(error, '更新视频失败');
    }
  },

  async deleteVideo(id: string): Promise<void> {
    setState({ loading: true, error: null });

    try {
      await axios.delete(`${API_BASE}/videos/${id}`);
      setState({
        videos: state.videos.filter(v => v.id !== id),
        loading: false,
      });
    } catch (error) {
      handleError(error, '删除视频失败');
    }
  },

  async batchSort(ids: string[]): Promise<void> {
    setState({ loading: true, error: null });

    try {
      await axios.post(`${API_BASE}/videos/batch-sort`, { ids });
      setState({ loading: false });
    } catch (error) {
      handleError(error, '批量排序失败');
    }
  },

  getState(): VideoServiceState {
    return { ...state };
  },

  clearError(): void {
    setState({ error: null });
  },

  resetState(): void {
    state = {
      videos: [],
      loading: false,
      error: null,
    };
    listeners.forEach(listener => listener(state));
  },
};

export function subscribeToVideoService(callback: (state: VideoServiceState) => void): () => void {
  listeners.add(callback);
  callback(state);

  return () => {
    listeners.delete(callback);
  };
}

export default videoService;
