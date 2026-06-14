import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, DegreeApplication, AuditLog, UploadedDocument } from '../types';

let supabase: SupabaseClient | null = null;

/**
 * Initialize Supabase client
 */
export function initSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('Supabase credentials not configured');
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
}

/**
 * Get Supabase client (initialize if not already done)
 */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    const client = initSupabase();
    if (!client) throw new Error('Supabase not initialized');
    supabase = client;
  }
  return supabase;
}

// ============================================
// USER OPERATIONS
// ============================================

export async function saveUser(user: User): Promise<User> {
  const client = getSupabase();
  const { data, error } = await client.from('users').upsert(user).select().single();

  if (error) throw error;
  return data;
}

export async function getUser(userId: string): Promise<User | null> {
  const client = getSupabase();
  const { data, error } = await client.from('users').select('*').eq('id', userId).single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const client = getSupabase();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getAllUsers(): Promise<User[]> {
  const client = getSupabase();
  const { data, error } = await client.from('users').select('*');

  if (error) throw error;
  return data || [];
}

// ============================================
// DEGREE APPLICATION OPERATIONS
// ============================================

export async function saveDegreeApplication(app: DegreeApplication): Promise<DegreeApplication> {
  const client = getSupabase();
  const { data, error } = await client.from('degree_applications').upsert(app).select().single();

  if (error) throw error;
  return data;
}

export async function getDegreeApplication(degreeId: string): Promise<DegreeApplication | null> {
  const client = getSupabase();
  const { data, error } = await client
    .from('degree_applications')
    .select('*')
    .eq('degree_id', degreeId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getUserDegrees(userId: string): Promise<DegreeApplication[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('degree_applications')
    .select('*')
    .eq('student_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAllDegreeApplications(): Promise<DegreeApplication[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('degree_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// DOCUMENT OPERATIONS
// ============================================

export async function uploadDocument(
  userId: string,
  file: File,
  docType: string
): Promise<{ url: string; path: string }> {
  const client = getSupabase();
  const timestamp = Date.now();
  const fileName = `${userId}/${docType}/${timestamp}_${file.name}`;

  const { error: uploadError } = await client.storage.from('documents').upload(fileName, file, {
    upsert: true,
  });

  if (uploadError) throw uploadError;

  const { data } = client.storage.from('documents').getPublicUrl(fileName);

  return {
    url: data.publicUrl,
    path: fileName,
  };
}

export async function saveDocumentMetadata(
  userId: string,
  docType: string,
  fileName: string,
  fileUrl: string
): Promise<UploadedDocument> {
  const client = getSupabase();
  const { data, error } = await client
    .from('documents')
    .insert({
      user_id: userId,
      type: docType,
      file_name: fileName,
      file_url: fileUrl,
      ocr_status: 'pending',
      yolo_status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDocumentStatus(
  docId: string,
  ocrStatus?: string,
  yoloStatus?: string,
  extractedData?: Record<string, any>
): Promise<void> {
  const client = getSupabase();
  const updateData: any = {};

  if (ocrStatus) updateData.ocr_status = ocrStatus;
  if (yoloStatus) updateData.yolo_status = yoloStatus;
  if (extractedData) updateData.extracted_data = extractedData;

  const { error } = await client.from('documents').update(updateData).eq('id', docId);

  if (error) throw error;
}

// ============================================
// AUDIT LOG OPERATIONS
// ============================================

export async function addAuditLog(log: AuditLog): Promise<void> {
  const client = getSupabase();
  const { error } = await client.from('audit_logs').insert(log);

  if (error) throw error;
}

export async function getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getAuditLogsByUser(userId: string, limit: number = 50): Promise<AuditLog[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ============================================
// BLOCKCHAIN TRANSACTION OPERATIONS
// ============================================

export async function saveBlockchainTransaction(tx: any): Promise<void> {
  const client = getSupabase();
  const { error } = await client.from('blockchain_transactions').insert(tx);

  if (error) throw error;
}

export async function getBlockchainTransaction(txHash: string): Promise<any> {
  const client = getSupabase();
  const { data, error } = await client
    .from('blockchain_transactions')
    .select('*')
    .eq('tx_hash', txHash)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getAllBlockchainTransactions(): Promise<any[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('blockchain_transactions')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export function subscribeToUserChanges(userId: string, callback: (user: User) => void) {
  const client = getSupabase();

  const subscription = client
    .from('users')
    .on('*', (payload) => {
      if (payload.new.id === userId) {
        callback(payload.new);
      }
    })
    .subscribe();

  return subscription;
}

export function subscribeToDegreeApplications(callback: (app: DegreeApplication) => void) {
  const client = getSupabase();

  const subscription = client
    .from('degree_applications')
    .on('INSERT', (payload) => {
      callback(payload.new);
    })
    .subscribe();

  return subscription;
}

export { getSupabase as getDb, initSupabase as initDb };
