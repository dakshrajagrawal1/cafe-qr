export interface OptionSummary {
  id: string;
  groupId: string;
  name: string;
  extraPricePaise: number;
  isAvailable: boolean;
  sortOrder: number;
}

export interface OptionGroupSummary {
  id: string;
  itemId: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  options: OptionSummary[];
}

export interface ItemSummary {
  id: string;
  cafeId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  pricePaise: number;
  isVeg: boolean;
  isAvailable: boolean;
  isSoldOut: boolean;
  prepTimeMin?: number | null;
  allergenInfo?: string | null;
  spicyLevel: number;
  sortOrder: number;
  optionGroups?: OptionGroupSummary[];
}

export interface CategorySummary {
  id: string;
  cafeId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  items?: ItemSummary[];
}

