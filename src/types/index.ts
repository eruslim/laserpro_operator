export interface Material {
  id: string;
  name: string;
  type: string; // 'wood', 'acrylic', 'metal', etc. (from database)
  category?: 'wood' | 'acrylic' | 'metal' | 'leather' | 'other'; // For compatibility
  cost_per_sqm?: number; // Price per square meter from material_pricing view
  available_thicknesses: number[]; // From database
  thicknesses?: number[]; // For compatibility
  colors?: string[]; // From database
  description?: string;
  color?: string;
  finish?: string;
  inStock?: boolean;
}

export interface DesignFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  preview?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  cuttingLength?: number;
  pierceCount?: number;
}

export interface Quote {
  materialCost: number;
  cuttingTime: number;
  machineTime: number;
  setupFee: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  customerId: string;
  designFile: DesignFile;
  material: Material;
  thickness: number;
  quantity: number;
  quote: Quote;
  status: 'received' | 'processing' | 'cutting' | 'shipping' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  user_id: string;
  file_id: string; // Reference to design_files table
  material_id: string;
  thickness: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  updated_at: string;
  // Joined data for display
  file?: {
    id: string;
    original_filename: string;
    storage_path: string;
    file_size: number;
  };
  material?: Material;
}
