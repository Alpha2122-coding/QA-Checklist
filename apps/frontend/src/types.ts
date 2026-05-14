export type User = {
  id: string;
  name: string;
  email: string;
  role: 'MANAGER' | 'EMPLOYEE';
};

export type ChecklistItem = {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'BLOCKED';
  createdAt: string;
  updatedAt: string;
};
