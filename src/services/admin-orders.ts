import { supabase } from '../lib/supabase';

export interface OrderItem {
  id: string;
  material_id: string;
  material_name: string;
  thickness: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  design_file_name: string;
  design_file_url: string;
}

export interface OrderAttachment {
  id: string;
  attachment_type: string;
  file_id: string;
  description: string | null;
  created_at: string;
}

export interface OrderDetails {
  id: string;
  order_number: string;
  user_id: string;
  customer_email: string;
  customer_name: string;
  status: string;
  subtotal: number;
  tax: number;
  shipping_cost: number;
  total_amount: number;
  shipping_address: any;
  payment_proof_file_id: string | null;
  payment_proof_uploaded_at: string | null;
  payment_confirmed_by: string | null;
  payment_confirmed_by_email: string | null;
  payment_confirmed_by_name: string | null;
  payment_confirmed_at: string | null;
  assigned_operator_id: string | null;
  operator_email: string | null;
  operator_name: string | null;
  assigned_at: string | null;
  production_started_at: string | null;
  production_completed_at: string | null;
  estimated_completion: string | null;
  operator_notes: string | null;
  status_updated_by: string | null;
  status_updated_at: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  attachments: OrderAttachment[];
}

export type OrderStatus =
  | 'pending'
  | 'confirmation_pending'
  | 'in_production'
  | 'cutting'
  | 'post_processing'
  | 'quality_check'
  | 'packaging'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type OrderSortField = 'created_at' | 'order_number' | 'status' | 'total_amount' | 'customer_name';
export type SortDirection = 'asc' | 'desc';

export interface OrderFilters {
  status?: OrderStatus;
  search?: string; // Search by order number or customer name
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Get all orders with optional filtering and sorting
 */
export async function getAllOrders(
  filters?: OrderFilters,
  sortField: OrderSortField = 'created_at',
  sortDirection: SortDirection = 'desc'
): Promise<OrderDetails[]> {
  let query = supabase
    .from('order_details_view')
    .select('*');

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(`order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`);
  }

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  // Apply sorting
  query = query.order(sortField, { ascending: sortDirection === 'asc' });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching orders:', error);
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  return data as OrderDetails[];
}

/**
 * Get single order details
 */
export async function getOrderDetails(orderId: string): Promise<OrderDetails> {
  const { data, error } = await supabase
    .from('order_details_view')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('Error fetching order:', error);
    throw new Error(`Failed to fetch order: ${error.message}`);
  }

  return data as OrderDetails;
}

/**
 * Approve payment and update order status
 */
export async function approvePayment(orderId: string, adminId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'in_production',
      payment_confirmed_by: adminId,
      payment_confirmed_at: new Date().toISOString(),
      status_updated_by: adminId,
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error approving payment:', error);
    throw new Error(`Failed to approve payment: ${error.message}`);
  }
}

/**
 * Reject payment and add notes
 */
export async function rejectPayment(orderId: string, adminId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'pending',
      operator_notes: `Payment rejected: ${reason}`,
      status_updated_by: adminId,
      payment_proof_file_id: null,
      payment_proof_uploaded_at: null,
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error rejecting payment:', error);
    throw new Error(`Failed to reject payment: ${error.message}`);
  }
}

/**
 * Assign order to operator
 */
export async function assignToOperator(orderId: string, operatorId: string, adminId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      assigned_operator_id: operatorId,
      assigned_at: new Date().toISOString(),
      status_updated_by: adminId,
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error assigning to operator:', error);
    throw new Error(`Failed to assign to operator: ${error.message}`);
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  userId: string,
  notes?: string
): Promise<void> {
  const updateData: any = {
    status: newStatus,
    status_updated_by: userId,
  };

  if (notes) {
    updateData.operator_notes = notes;
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order status:', error);
    throw new Error(`Failed to update order status: ${error.message}`);
  }
}

/**
 * Get order status history
 */
export async function getOrderStatusHistory(orderId: string) {
  const { data, error } = await supabase
    .from('order_status_history')
    .select(`
      *,
      changed_by_user:users(full_name, email)
    `)
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching status history:', error);
    // Don't throw - just return empty array if fails
    console.warn('Status history not available, continuing without it');
    return [];
  }

  return data;
}

/**
 * Get all available operators
 */
export async function getOperators() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('role', 'operator');

  if (error) {
    console.error('Error fetching operators:', error);
    throw new Error(`Failed to fetch operators: ${error.message}`);
  }

  return data;
}

/**
 * Get file download URL (for viewing payment proofs and design files)
 * Uses signed URLs for secure access - only authenticated admins can view
 */
export async function getFileUrl(fileId: string): Promise<string> {
  const { data: fileData, error: fileError } = await supabase
    .from('design_files')
    .select('storage_path')
    .eq('id', fileId)
    .single();

  if (fileError || !fileData) {
    console.error('File not found:', fileError);
    throw new Error('File not found');
  }

  console.log('Getting signed URL for file path:', fileData.storage_path);

  // Use createSignedUrl for secure, authenticated access
  // URL expires after 1 hour
  const { data, error } = await supabase.storage
    .from('design-files')
    .createSignedUrl(fileData.storage_path, 3600); // 3600 seconds = 1 hour

  if (error || !data) {
    console.error('Error creating signed URL:', error);
    throw new Error('Failed to create download URL');
  }

  console.log('Generated signed URL (expires in 1 hour)');

  return data.signedUrl;
}

/**
 * Get signed URL from storage path directly
 * Used for design files in order items which store the path not the file ID
 */
export async function getSignedUrlFromPath(storagePath: string): Promise<string> {
  console.log('Getting signed URL for storage path:', storagePath);

  // Use createSignedUrl for secure, authenticated access
  // URL expires after 1 hour
  const { data, error } = await supabase.storage
    .from('design-files')
    .createSignedUrl(storagePath, 3600); // 3600 seconds = 1 hour

  if (error || !data) {
    console.error('Error creating signed URL:', error);
    throw new Error('Failed to create download URL');
  }

  console.log('Generated signed URL (expires in 1 hour)');

  return data.signedUrl;
}

/**
 * Cancel order
 */
export async function cancelOrder(orderId: string, adminId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      operator_notes: `Cancelled by admin: ${reason}`,
      status_updated_by: adminId,
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error cancelling order:', error);
    throw new Error(`Failed to cancel order: ${error.message}`);
  }
}

/**
 * Get order statistics for dashboard
 */
export async function getOrderStatistics() {
  // Get count by status
  const { data: statusCounts, error: statusError } = await supabase
    .from('orders')
    .select('status');

  if (statusError) {
    console.error('Error fetching order statistics:', error);
    throw new Error(`Failed to fetch statistics: ${statusError.message}`);
  }

  // Count orders by status
  const stats = statusCounts.reduce((acc: any, order: any) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  // Get revenue data
  const { data: revenueData, error: revenueError } = await supabase
    .from('orders')
    .select('total_amount, created_at')
    .in('status', ['shipped', 'delivered']);

  if (revenueError) {
    console.error('Error fetching revenue:', revenueError);
  }

  const totalRevenue = revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

  return {
    totalOrders: statusCounts.length,
    pendingPayment: stats.pending || 0,
    awaitingConfirmation: stats.confirmation_pending || 0,
    inProduction: (stats.in_production || 0) + (stats.cutting || 0) + (stats.post_processing || 0) + (stats.quality_check || 0) + (stats.packaging || 0),
    shipped: stats.shipped || 0,
    delivered: stats.delivered || 0,
    cancelled: stats.cancelled || 0,
    totalRevenue,
  };
}
