import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { CardSearchQuery, CardSearchResult, Dashboard } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getDashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${API_BASE_URL}/dashboard`);
  }

  searchCards(query: CardSearchQuery): Observable<CardSearchResult[]> {
    let params = new HttpParams();

    // Los filtros vacíos no se mandan: la API ya tiene sus valores por defecto y así la URL
    // de la búsqueda se queda legible.
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return this.http.get<CardSearchResult[]>(`${API_BASE_URL}/search/cards`, { params });
  }
}
