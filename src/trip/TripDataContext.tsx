import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { useAuth } from "../auth/AuthContext";
import type { CreatedInvitation, TripInvitation, TripMember, TripSummary } from "../lib/supabase/database";
import { supabase } from "../lib/supabase/client";
import { parseTripPayload, readCachedTrip, TRIP_STATE_VERSION, type TripData, type TripPayload } from "../types/trip";
import * as repository from "./normalizedRepository";

const PUSH_DELAY = 900;
export type TripSyncState = "clean" | "dirty" | "saving" | "failed";

interface TripDataContextValue {
  payload: TripPayload | null; data: TripData | null; loading: boolean; error: string | null; usingCache: boolean;
  isReadOnly: boolean; syncState: TripSyncState; trips: TripSummary[]; selectedTrip: TripSummary | null;
  members: TripMember[]; invitations: TripInvitation[];
  updateData: (update: (current: TripData) => TripData) => void; refresh: () => Promise<void>; retrySave: () => Promise<void>;
  selectTrip: (id: string) => void; createTrip: (name: string) => Promise<string>; renameTrip: (name: string) => Promise<void>;
  deleteTrip: (confirmation: string) => Promise<void>; createInvitation: (email: string) => Promise<CreatedInvitation>;
  revokeInvitation: (id: string) => Promise<void>; acceptInvitation: (token: string) => Promise<string>;
}
const TripDataContext = createContext<TripDataContextValue | null>(null);

function cacheKey(userId: string, tripId: string) { return `italy_trip:${userId}:${tripId}`; }
function readCache(userId: string, tripId: string) { try { const raw=localStorage.getItem(cacheKey(userId,tripId)); return raw ? parseTripPayload(JSON.parse(raw)) : null; } catch { return null; } }
function writeCache(userId: string, tripId: string, payload: TripPayload) { try { localStorage.setItem(cacheKey(userId,tripId),JSON.stringify(payload)); } catch { /* optional */ } }

export function TripDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [trips,setTrips]=useState<TripSummary[]>([]); const [selectedId,setSelectedId]=useState<string|null>(null);
  const [payload,setPayload]=useState<TripPayload|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
  const [usingCache,setUsingCache]=useState(false); const [syncState,setSyncState]=useState<TripSyncState>("clean");
  const [members,setMembers]=useState<TripMember[]>([]); const [invitations,setInvitations]=useState<TripInvitation[]>([]);
  const generation=useRef(0); const payloadRef=useRef<TripPayload|null>(null); const pending=useRef<{tripId:string;payload:TripPayload}|null>(null);
  const timer=useRef<number|null>(null); const saving=useRef(false);
  const selectedTrip=trips.find((trip)=>trip.id===selectedId)??null; const isReadOnly=selectedTrip ? selectedTrip.role!=="owner" : true;

  function apply(next: TripPayload, cached=false) { payloadRef.current=next; setPayload(next); setUsingCache(cached); }
  async function loadAccess(tripId:string, owner:boolean) {
    const [nextMembers,nextInvitations]=await Promise.all([repository.listMembers(tripId),owner?repository.listInvitations(tripId):Promise.resolve([])]);
    setMembers(nextMembers); setInvitations(nextInvitations);
  }
  async function loadTrip(tripId:string, silent=false) {
    if(!user)return; const request=++generation.current; if(!silent)setLoading(true); setError(null);
    try { const next=await repository.loadTrip(tripId); if(request!==generation.current)return; apply(next); writeCache(user.id,tripId,next); await loadAccess(tripId,trips.find((t)=>t.id===tripId)?.role==="owner"); setLoading(false); }
    catch(cause){ if(request!==generation.current)return; const cached=readCache(user.id,tripId); if(cached)apply(cached,true); setError(cause instanceof Error?cause.message:"Не удалось загрузить поездку"); setLoading(false); }
  }
  async function discover(preferred?:string) {
    if(!user)return; const request=++generation.current; setLoading(true); setError(null);
    try {
      const available=await repository.listTrips(); if(request!==generation.current)return; setTrips(available);
      if(available.length){ const stored=localStorage.getItem(`italy_trip:selected:${user.id}`); const id=available.some((t)=>t.id===(preferred??stored))?(preferred??stored)!:available[0].id; setSelectedId(id); await loadTrip(id); return; }
      const legacy=readCachedTrip(); const remote=await supabase.from("trip_state").select("payload").eq("id","main").maybeSingle();
      const parsed=!remote.error&&remote.data?parseTripPayload(remote.data.payload):null; apply(parsed??legacy??{v:TRIP_STATE_VERSION,data:null as never},!parsed); if(!parsed&&!legacy)setPayload(null);
      setSelectedId(null); setMembers([]); setInvitations([]); setError(remote.error?"Не удалось загрузить legacy-план.":null); setLoading(false);
    } catch(cause){ if(request===generation.current){setError(cause instanceof Error?cause.message:"Не удалось загрузить поездки");setLoading(false);} }
  }
  async function savePending(){ const work=pending.current;if(!work||saving.current||isReadOnly)return; saving.current=true;setSyncState("saving");
    try{await repository.saveTrip(work.tripId,work.payload.data);if(pending.current===work)pending.current=null;setSyncState(pending.current?"dirty":"clean");setError(null);if(pending.current)schedule();}
    catch(cause){setSyncState("failed");setError(cause instanceof Error?cause.message:"Не удалось сохранить изменения");}finally{saving.current=false;}
  }
  function schedule(){if(timer.current)window.clearTimeout(timer.current);timer.current=window.setTimeout(()=>void savePending(),PUSH_DELAY);}
  function updateData(update:(current:TripData)=>TripData){if(!user||!selectedTrip||isReadOnly||!payloadRef.current)return;const next={...payloadRef.current,data:update(structuredClone(payloadRef.current.data))};apply(next);writeCache(user.id,selectedTrip.id,next);pending.current={tripId:selectedTrip.id,payload:next};setSyncState("dirty");schedule();}

  useEffect(()=>{if(authLoading)return;if(!user){setLoading(false);setTrips([]);setPayload(null);return;}void discover();return()=>{generation.current+=1;};},[authLoading,user?.id]);
  useEffect(()=>{if(!user||!selectedTrip)return;localStorage.setItem(`italy_trip:selected:${user.id}`,selectedTrip.id);return repository.subscribeToTrip(selectedTrip.id,()=>{window.dispatchEvent(new CustomEvent("trip:photos-changed",{detail:selectedTrip.id}));if(!pending.current&&!saving.current)void loadTrip(selectedTrip.id,true);});},[user?.id,selectedTrip?.id]);
  useEffect(()=>()=>{if(timer.current)window.clearTimeout(timer.current);},[]);

  function selectTrip(id:string){if(id===selectedId||!trips.some((t)=>t.id===id))return;if(pending.current)void savePending();generation.current+=1;setSelectedId(id);setPayload(readCache(user!.id,id));setUsingCache(Boolean(readCache(user!.id,id)));void loadTrip(id);}
  async function createTrip(name:string){const id=await repository.createTrip(name);await discover(id);return id;}
  async function renameTrip(name:string){if(!selectedTrip)throw new Error("Поездка не выбрана");await repository.renameTrip(selectedTrip.id,name);await discover(selectedTrip.id);}
  async function deleteTrip(confirmation:string){if(!selectedTrip)throw new Error("Поездка не выбрана");if(confirmation!==selectedTrip.name)throw new Error("Название поездки не совпадает");await repository.deleteTrip(selectedTrip.id);pending.current=null;await discover();}
  async function createInvitation(email:string){if(!selectedTrip)throw new Error("Поездка не выбрана");const created=await repository.createInvitation(selectedTrip.id,email);setInvitations(await repository.listInvitations(selectedTrip.id));return created;}
  async function revokeInvitation(id:string){await repository.revokeInvitation(id);if(selectedTrip)setInvitations(await repository.listInvitations(selectedTrip.id));}
  async function acceptInvitation(token:string){const id=await repository.acceptInvitation(token);await discover(id);return id;}

  return <TripDataContext.Provider value={{payload,data:payload?.data??null,loading:authLoading||loading,error,usingCache,isReadOnly,syncState,trips,selectedTrip,members,invitations,updateData,refresh:()=>selectedTrip?loadTrip(selectedTrip.id):discover(),retrySave:savePending,selectTrip,createTrip,renameTrip,deleteTrip,createInvitation,revokeInvitation,acceptInvitation}}>{children}</TripDataContext.Provider>;
}
export function useTripData(){const value=useContext(TripDataContext);if(!value)throw new Error("useTripData must be used inside TripDataProvider");return value;}
