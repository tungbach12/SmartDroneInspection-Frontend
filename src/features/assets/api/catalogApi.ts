import { api } from '@/shared/api/client';

export interface Category {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface CategoryInput {
  code: string;
  name: string;
  description?: string | null;
}

export type ChecklistTemplateType = 'CATEGORY_INSPECTION_ITEM' | 'PRE_FLIGHT' | 'POST_FLIGHT';

export interface ChecklistTemplate {
  id: string;
  templateType: ChecklistTemplateType;
  categoryId: string | null;
  label: string;
  sortOrder: number;
  active: boolean;
}

export interface CreateChecklistTemplateInput {
  templateType: ChecklistTemplateType;
  categoryId?: string | null;
  label: string;
  sortOrder?: number;
}

export interface UpdateChecklistTemplateInput {
  label: string;
  sortOrder?: number;
  active?: boolean;
}

export const catalogKeys = {
  all: ['catalog'] as const,
  categories: () => [...catalogKeys.all, 'categories'] as const,
  checklistTemplates: (type?: ChecklistTemplateType, categoryId?: string | null) =>
    [...catalogKeys.all, 'checklist-templates', type ?? 'ALL', categoryId ?? 'GLOBAL'] as const,
};

export const catalogApi = {
  listCategories: () => api.get<Category[]>('/asset-categories').then((r) => r.data),

  createCategory: (input: CategoryInput) =>
    api.post<Category>('/asset-categories', input).then((r) => r.data),

  updateCategory: (id: string, input: CategoryInput) =>
    api.put<Category>(`/asset-categories/${id}`, input).then((r) => r.data),

  listChecklistTemplates: (params?: { type?: ChecklistTemplateType; categoryId?: string | null }) =>
    api
      .get<ChecklistTemplate[]>('/asset-categories/checklist-templates', {
        params: {
          ...(params?.type ? { type: params.type } : {}),
          ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
        },
      })
      .then((r) => r.data),

  createChecklistTemplate: (input: CreateChecklistTemplateInput) =>
    api
      .post<ChecklistTemplate>('/asset-categories/checklist-templates', input)
      .then((r) => r.data),

  updateChecklistTemplate: (id: string, input: UpdateChecklistTemplateInput) =>
    api
      .put<ChecklistTemplate>(`/asset-categories/checklist-templates/${id}`, input)
      .then((r) => r.data),

  deleteChecklistTemplate: (id: string) =>
    api.delete(`/asset-categories/checklist-templates/${id}`).then(() => undefined),
};
