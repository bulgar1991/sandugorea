import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import {
  AdminSessionInfo,
  CustomerProject,
  DriveStatus,
  LoginEventInfo,
  NewProject,
  ProjectDetail,
  ProjectPhoto,
  ProjectSummary,
  Stats,
} from '@models/project.models';

/** Typed wrapper around the admin + customer project API. */
@Injectable({ providedIn: 'root' })
export class ProjectsApi {
  private readonly http = inject(HttpClient);

  // ---- Admin: projects
  stats() {
    return firstValueFrom(this.http.get<Stats>('/api/admin/stats'));
  }

  list() {
    return firstValueFrom(this.http.get<ProjectSummary[]>('/api/admin/projects'));
  }

  get(id: string) {
    return firstValueFrom(this.http.get<ProjectDetail>(`/api/admin/projects/${id}`));
  }

  create(data: NewProject) {
    return firstValueFrom(this.http.post<ProjectDetail>('/api/admin/projects', data));
  }

  setActive(id: string, active: boolean) {
    return firstValueFrom(this.http.patch<void>(`/api/admin/projects/${id}`, { active }));
  }

  /** Generates a new password on the server; returned once. */
  resetPassword(id: string) {
    return firstValueFrom(
      this.http.post<{ password: string }>(`/api/admin/projects/${id}/password`, null),
    );
  }

  delete(id: string) {
    return firstValueFrom(this.http.delete<void>(`/api/admin/projects/${id}`));
  }

  send(id: string, includeNewPassword: boolean) {
    return firstValueFrom(
      this.http.post<{ sentAt: string; password: string | null }>(
        `/api/admin/projects/${id}/send`,
        {
          includeNewPassword,
        },
      ),
    );
  }

  /** One file per request, with upload progress events. */
  upload(id: string, file: File): Observable<HttpEvent<ProjectPhoto>> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ProjectPhoto>(`/api/admin/projects/${id}/photos`, form, {
      reportProgress: true,
      observe: 'events',
    });
  }

  deletePhoto(id: string, photoId: string) {
    return firstValueFrom(this.http.delete<void>(`/api/admin/projects/${id}/photos/${photoId}`));
  }

  // ---- Admin: account security
  security() {
    return firstValueFrom(
      this.http.get<{ totpEnabled: boolean; recoveryCodesLeft: number }>(
        '/api/admin/account/security',
      ),
    );
  }

  changePassword(current: string, next: string) {
    return firstValueFrom(this.http.post<void>('/api/admin/account/password', { current, next }));
  }

  sessions() {
    return firstValueFrom(this.http.get<AdminSessionInfo[]>('/api/admin/account/sessions'));
  }

  revokeOtherSessions() {
    return firstValueFrom(this.http.delete<void>('/api/admin/account/sessions/others'));
  }

  history() {
    return firstValueFrom(this.http.get<LoginEventInfo[]>('/api/admin/account/history'));
  }

  regenerateRecoveryCodes() {
    return firstValueFrom(
      this.http.post<{ codes: string[] }>('/api/admin/account/recovery-codes', null),
    );
  }

  // ---- Google Drive
  driveStatus() {
    return firstValueFrom(this.http.get<DriveStatus>('/api/admin/drive'));
  }

  /** URL of Google's consent screen to send the browser to. */
  driveConnect() {
    return firstValueFrom(this.http.post<{ url: string }>('/api/admin/drive/connect', null));
  }

  driveDisconnect() {
    return firstValueFrom(this.http.delete<void>('/api/admin/drive'));
  }

  // ---- Customer
  customerProject() {
    return firstValueFrom(this.http.get<CustomerProject>('/api/customer/project'));
  }
}
