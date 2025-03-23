export interface Item {
  _id: string;
  title: string;
  icon: string;
  parentId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Folder {
  _id: string;
  name: string;
  isOpen: boolean;
  parentId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
  
  export type DraggableElement = Item | Folder;