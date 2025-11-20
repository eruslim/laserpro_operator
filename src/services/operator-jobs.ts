import { supabase } from '../lib/supabase';

export interface JobItem {
  id: string;
  material_name: string;
  thickness: number;
  quantity: number;
  design_file_name: string;
  design_file_url: string;
}

export interface Job {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  assigned_at: string;
  production_started_at: string | null;
  production_completed_at: string | null;
  operator_notes: string | null;
  estimated_completion: string | null;
  items: JobItem[];
  shipping_address: any;
  tracking_number: string | null;
  tracking_url: string | null;
  total_items: number;
}

export type ProductionStatus =
  | 'cutting'
  | 'post_processing'
  | 'quality_check'
  | 'packaging';

/**
 * Get all jobs assigned to the current operator
 */
export async function getAssignedJobs(operatorId: string): Promise<Job[]> {
  console.log('[OPERATOR] Fetching jobs for operator ID:', operatorId);

  const { data, error } = await supabase
    .from('order_details_view')
    .select('*')
    .eq('assigned_operator_id', operatorId)
    .in('status', ['cutting', 'post_processing', 'quality_check', 'packaging', 'in_production'])
    .order('assigned_at', { ascending: true });

  if (error) {
    console.error('[OPERATOR] Error fetching jobs:', error);
    throw new Error(`Failed to fetch jobs: ${error.message}`);
  }

  console.log('[OPERATOR] Found jobs:', data?.length || 0, data);
  return data as Job[];
}

/**
 * Start production on a job
 */
export async function startProduction(jobId: string, operatorId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cutting',
      production_started_at: new Date().toISOString(),
      status_updated_by: operatorId,
    })
    .eq('id', jobId);

  if (error) throw error;
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string,
  newStatus: ProductionStatus,
  operatorId: string,
  notes?: string
): Promise<void> {
  const updateData: any = {
    status: newStatus,
    status_updated_by: operatorId,
  };

  if (notes) {
    updateData.operator_notes = notes;
  }

  // If completing (moving to packaging), set production_completed_at
  if (newStatus === 'packaging') {
    updateData.production_completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', jobId);

  if (error) throw error;
}

/**
 * Add production notes to a job
 */
export async function addProductionNotes(
  jobId: string,
  notes: string,
  operatorId: string
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      operator_notes: notes,
      status_updated_by: operatorId,
    })
    .eq('id', jobId);

  if (error) throw error;
}

/**
 * Get job status history
 */
export async function getJobStatusHistory(jobId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('order_status_history')
    .select(`
      *,
      changed_by_user:users(full_name, email)
    `)
    .eq('order_id', jobId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Status history not available, continuing without it');
    return [];
  }

  return data || [];
}

/**
 * Get signed URL from storage path
 */
export async function getSignedUrlFromPath(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('design-files')
    .createSignedUrl(storagePath, 3600);

  if (error || !data) {
    console.error('Error creating signed URL:', error);
    throw new Error('Failed to create download URL');
  }

  return data.signedUrl;
}

/**
 * Mark job as ready for shipping
 */
export async function markReadyForShipping(
  jobId: string,
  operatorId: string
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'packaging',
      production_completed_at: new Date().toISOString(),
      status_updated_by: operatorId,
    })
    .eq('id', jobId);

  if (error) throw error;
}

/**
 * Ship order with tracking information
 */
export async function shipOrder(
  jobId: string,
  operatorId: string,
  trackingNumber?: string,
  trackingUrl?: string
): Promise<void> {
  const updateData: any = {
    status: 'shipped',
    shipped_at: new Date().toISOString(),
    status_updated_by: operatorId,
  };

  if (trackingNumber) {
    updateData.tracking_number = trackingNumber;
  }

  if (trackingUrl) {
    updateData.tracking_url = trackingUrl;
  }

  const { error} = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', jobId);

  if (error) throw error;
}
