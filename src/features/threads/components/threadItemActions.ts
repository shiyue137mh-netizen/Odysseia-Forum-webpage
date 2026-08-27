export interface ThreadItemManagementActions {
  onEdit: () => void;
  onRemove: () => void;
  removePending?: boolean;
}
