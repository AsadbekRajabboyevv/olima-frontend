export interface Complaint {
  id: string;
  organizationId: string;
  conversationId: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
}
