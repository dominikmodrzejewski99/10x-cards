export interface TableLazyLoadEvent {
  first: number;
  rows: number;
  sortField: string;
  sortOrder: number;
}

export interface ReorderEvent {
  id: number;
  newIndex: number;
}
