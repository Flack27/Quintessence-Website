import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type RankTier = 'owner' | 'admin' | 'officer' | 'member';

export interface RosterMember {
  memberId: number;
  displayName: string;
  rank: string;
  rankTier: RankTier;
  avatarUrl: string | null;
  gameIds: number[];   // local game ids this member played (drives icon tokens)
}

export type MemberPayload = Omit<RosterMember, 'memberId'>;

@Injectable({
  providedIn: 'root'
})
export class RosterService {
  constructor(private http: HttpClient) { }

  // Public
  getRoster(): Observable<RosterMember[]> {
    return this.http.get<RosterMember[]>('/api/roster');
  }

  // Admin
  addMember(member: MemberPayload): Observable<RosterMember> {
    return this.http.post<RosterMember>('/api/roster', member, { withCredentials: true });
  }

  updateMember(memberId: number, member: MemberPayload): Observable<any> {
    return this.http.put(`/api/roster/${memberId}`, member, { withCredentials: true });
  }

  deleteMember(memberId: number): Observable<any> {
    return this.http.delete(`/api/roster/${memberId}`, { withCredentials: true });
  }

  reorderMembers(memberIds: string[]): Observable<any> {
    return this.http.put('/api/roster/order', { memberIds }, { withCredentials: true });
  }
}
