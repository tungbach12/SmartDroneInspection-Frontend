import { api } from '@/shared/api/client';

export type FrequencyUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

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

export interface SuggestedFrequency {
  id: string;
  frequencyUnit: FrequencyUnit;
  frequencyInterval: number;
  sortOrder: number;
}

export interface SuggestedFrequencyInput {
  frequencyUnit: FrequencyUnit;
  frequencyInterval: number;
}

export const catalogKeys = {
  all: ['catalog'] as const,
  categories: () => [...catalogKeys.all, 'categories'] as const,
  frequencies: (categoryId: string) => [...catalogKeys.all, 'frequencies', categoryId] as const,
};

export const catalogApi = {
  listCategories: () => api.get<Category[]>('/asset-categories').then((r) => r.data),

  createCategory: (input: CategoryInput) =>
    api.post<Category>('/asset-categories', input).then((r) => r.data),

  updateCategory: (id: string, input: CategoryInput) =>
    api.put<Category>(`/asset-categories/${id}`, input).then((r) => r.data),

  listFrequencies: (categoryId: string) =>
    api
      .get<SuggestedFrequency[]>(`/asset-categories/${categoryId}/suggested-frequencies`)
      .then((r) => r.data),

  addFrequency: (categoryId: string, input: SuggestedFrequencyInput) =>
    api
      .post<SuggestedFrequency>(
        `/asset-categories/${categoryId}/suggested-frequencies`,
        input,
      )
      .then((r) => r.data),

  deleteFrequency: (categoryId: string, frequencyId: string) =>
    api
      .delete<void>(`/asset-categories/${categoryId}/suggested-frequencies/${frequencyId}`)
      .then((r) => r.data),
};
