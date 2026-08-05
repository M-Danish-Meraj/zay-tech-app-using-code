import axios from 'axios';
import { Platform } from 'react-native';

// For Android Emulator, localhost is 10.0.2.2. For iOS, it is localhost.
// Replace this with your computer's local IP address (e.g., 'http://192.168.1.50:5000') 
// if testing on a physical mobile device.
const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5000/api',
  ios: 'http://localhost:5000/api',
  default: 'http://localhost:5000/api',
});

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds timeout for n8n processing
});

export const apiService = {
  async generatePost(prompt) {
    const response = await apiClient.post('/generate', { prompt });
    return response.data;
  },

async approvePost(data) {
    const response = await apiClient.post('/approve', {
      generationId: data.generationId,
      resumeUrl: data.resumeUrl,
      imageUrl: data.imageUrl,
      imageName: data.imageName,
      caption: data.caption
    });
    return response.data;
  },

  async rejectPost(generationId, resumeUrl) {
    const response = await apiClient.post('/reject', { generationId, resumeUrl });
    return response.data;
  },

  async getHistory() {
    const response = await apiClient.get('/history');
    return response.data;
  },

  async getSheetsUrl() {
    const response = await apiClient.get('/sheets-url');
    return response.data;
  },

  // File downloads are handled differently in mobile (e.g., via backend URL sharing or linking)
  getDownloadUrl(type, post) {
    // Generate direct download endpoint link
    const queryParams = new URLSearchParams({
      imageName: post.imageName || '',
      imageUrl: post.imageUrl || '',
      caption: post.caption || '',
      createdAt: post.createdAt || ''
    }).toString();
    return `${API_BASE_URL}/download/${type}?${queryParams}`;
  },

  async getHealth() {
    const response = await apiClient.get('/health');
    return response.data;
  }
  
};
