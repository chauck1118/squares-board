import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth';
import { 
  BoardListResponse, 
  BoardDetailResponse, 
  ClaimSquaresRequest, 
  ClaimSquaresResponse,
  ScoringTableResponse,
  CreateBoardRequest,
  CreateBoardResponse,
  UpdateSquarePaymentResponse,
  BoardPaymentStatusResponse,
  BoardAssignmentResponse,
  BoardAssignmentValidationResponse,
  CreateGameRequest,
  CreateGameResponse,
  UpdateGameScoreRequest,
  UpdateGameScoreResponse,
  BoardGamesResponse,
  AdminScoringTableResponse
} from '../types/board';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}

class ApiService {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add request timestamp for debugging
        config.metadata = { startTime: new Date() };
        
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        // Log response time in development
        if (process.env.NODE_ENV === 'development' && response.config.metadata) {
          const endTime = new Date();
          const duration = endTime.getTime() - response.config.metadata.startTime.getTime();
          console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url}: ${duration}ms`);
        }
        
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config;

        // Handle network errors
        if (!error.response) {
          console.error('Network error:', error.message);
          return Promise.reject(this.createNetworkError(error));
        }

        // Handle 401 errors with token refresh logic
        if (error.response.status === 401 && originalRequest && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => {
              return this.api(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            // Try to refresh token or redirect to login
            await this.handleAuthError();
            this.processQueue(null);
            return this.api(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError);
            this.redirectToLogin();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle other HTTP errors
        return Promise.reject(this.enhanceError(error));
      }
    );
  }

  private createNetworkError(error: AxiosError): AxiosError {
    const enhancedError = { ...error };
    enhancedError.message = 'Network error. Please check your connection and try again.';
    return enhancedError;
  }

  private enhanceError(error: AxiosError<ApiErrorResponse>): AxiosError {
    // Add additional context to errors
    if (error.response?.data?.error) {
      error.message = error.response.data.error.message;
    }
    
    return error;
  }

  private async handleAuthError(): Promise<void> {
    // In a real app, you might try to refresh the token here
    // For now, we'll just clear the auth state
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  private processQueue(error: any): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(null);
      }
    });
    
    this.failedQueue = [];
  }

  private redirectToLogin(): void {
    // Only redirect if not already on login page
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.api.get('/health');
    return response.data;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.api.post('/auth/logout');
  }

  async getCurrentUser(): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.get('/auth/me');
    return response.data;
  }

  // Board methods
  async getBoards(): Promise<BoardListResponse> {
    const response: AxiosResponse<BoardListResponse> = await this.api.get('/boards');
    return response.data;
  }

  async getBoardDetail(boardId: string): Promise<BoardDetailResponse> {
    const response: AxiosResponse<BoardDetailResponse> = await this.api.get(`/boards/${boardId}`);
    return response.data;
  }

  async claimSquares(boardId: string, request: ClaimSquaresRequest): Promise<ClaimSquaresResponse> {
    const response: AxiosResponse<ClaimSquaresResponse> = await this.api.post(`/boards/${boardId}/claim`, request);
    return response.data;
  }

  async getBoardScoring(boardId: string): Promise<ScoringTableResponse> {
    const response: AxiosResponse<ScoringTableResponse> = await this.api.get(`/boards/${boardId}/scoring`);
    return response.data;
  }

  // Admin methods
  async createBoard(boardData: CreateBoardRequest): Promise<CreateBoardResponse> {
    const response: AxiosResponse<CreateBoardResponse> = await this.api.post('/boards', boardData);
    return response.data;
  }

  async updateSquarePayment(squareId: string, paymentStatus: 'PENDING' | 'PAID'): Promise<UpdateSquarePaymentResponse> {
    const response: AxiosResponse<UpdateSquarePaymentResponse> = await this.api.put(`/admin/squares/${squareId}/payment`, { paymentStatus });
    return response.data;
  }

  async getBoardPaymentStatus(boardId: string): Promise<BoardPaymentStatusResponse> {
    const response: AxiosResponse<BoardPaymentStatusResponse> = await this.api.get(`/admin/boards/${boardId}/payment-status`);
    return response.data;
  }

  async triggerBoardAssignment(boardId: string): Promise<BoardAssignmentResponse> {
    const response: AxiosResponse<BoardAssignmentResponse> = await this.api.post(`/admin/boards/${boardId}/assign`);
    return response.data;
  }

  async validateBoardAssignments(boardId: string): Promise<BoardAssignmentValidationResponse> {
    const response: AxiosResponse<BoardAssignmentValidationResponse> = await this.api.get(`/admin/boards/${boardId}/validate-assignments`);
    return response.data;
  }

  async createGame(boardId: string, gameData: CreateGameRequest): Promise<CreateGameResponse> {
    const response: AxiosResponse<CreateGameResponse> = await this.api.post(`/admin/boards/${boardId}/games`, gameData);
    return response.data;
  }

  async updateGameScore(gameId: string, scoreData: UpdateGameScoreRequest): Promise<UpdateGameScoreResponse> {
    const response: AxiosResponse<UpdateGameScoreResponse> = await this.api.put(`/admin/games/${gameId}/score`, scoreData);
    return response.data;
  }

  async getBoardGames(boardId: string): Promise<BoardGamesResponse> {
    const response: AxiosResponse<BoardGamesResponse> = await this.api.get(`/admin/boards/${boardId}/games`);
    return response.data;
  }

  async getAdminScoringTable(boardId: string): Promise<AdminScoringTableResponse> {
    const response: AxiosResponse<AdminScoringTableResponse> = await this.api.get(`/admin/boards/${boardId}/scoring-table`);
    return response.data;
  }
}

export const apiService = new ApiService();