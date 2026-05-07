import Dexie, { type Table } from 'dexie';

import type { Recipe } from '@/lib/recipe/schema';

export interface RecipeDraft {
  id: string;
  recipe: Partial<Recipe>;
  createdAt: string;
  updatedAt: string;
}

export interface KitchenKnowledgeRecord {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppSettingsRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

export class CookagentDatabase extends Dexie {
  recipes!: Table<Recipe, string>;
  recipeDrafts!: Table<RecipeDraft, string>;
  kitchenKnowledge!: Table<KitchenKnowledgeRecord, string>;
  appSettings!: Table<AppSettingsRecord, string>;

  constructor() {
    super('cookagent');

    this.version(1).stores({
      recipes:
        '&id, title, createdAt, updatedAt, *classification.mainIngredients, *classification.tags, *classification.dishType, *personal.statusTags',
      recipeDrafts: '&id, createdAt, updatedAt',
      kitchenKnowledge: '&id, title, createdAt, updatedAt, *tags',
      appSettings: '&key, updatedAt',
    });
  }
}

export const db = new CookagentDatabase();
