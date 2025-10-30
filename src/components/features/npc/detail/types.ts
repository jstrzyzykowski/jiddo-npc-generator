export interface OwnerActionsViewModel {
  id: string;
  name: string;
  status: "draft" | "published";
}

export interface NpcModuleViewModel {
  id: "focus" | "travel" | "voice" | "shop" | "keywords";
  label: string;
  isActive: boolean;
}

export interface NpcMetadataViewModel {
  name: string;
  author: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  modules: NpcModuleViewModel[];
}

export interface NpcCodeViewModel {
  xml: string;
  lua: string;
  isCopyDisabled: boolean;
}

export interface NpcDetailViewModel {
  metadata: NpcMetadataViewModel;
  code: NpcCodeViewModel;
  ownerActions: OwnerActionsViewModel;
  isOwner: boolean;
}
