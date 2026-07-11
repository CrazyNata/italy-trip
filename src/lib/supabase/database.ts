export type TripRole = "owner" | "viewer";

export interface TripSummary {
  id: string;
  ownerId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  role: TripRole;
  revision: number;
}

export interface TripMember {
  tripId: string;
  userId: string;
  email: string;
  role: TripRole;
  createdAt: string;
}

export interface TripInvitation {
  id: string;
  tripId: string;
  email: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
}

export interface CreatedInvitation extends TripInvitation {
  token: string;
}

export interface TripAccess {
  trip: TripSummary;
  members: TripMember[];
  invitations: TripInvitation[];
}

export interface DbRow {
  id: string;
  trip_id: string;
  legacy_id?: string | null;
  position?: number;
  [key: string]: unknown;
}
