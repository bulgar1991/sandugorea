import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

export interface HealthResponse {
  status: string;
  time: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  health() {
    return this.http.get<HealthResponse>(`${this.baseUrl}/health`);
  }
}
