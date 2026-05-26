export type {
  SunoMarkupProject,
  ValidationWarning,
  WarningSeverity
} from '@suno/shared';

export type TagPlacement = 'style' | 'lyrics' | 'both';
export type TagConfidence = 'official' | 'common' | 'experimental';

export type TagCategory =
  | 'structure'
  | 'vocal'
  | 'instrument'
  | 'dynamics'
  | 'production'
  | 'genre'
  | 'subgenre'
  | 'mood'
  | 'tempo'
  | 'rhythm'
  | 'era'
  | 'language'
  | 'avoid'
  | 'custom';

export type TagParameter = {
  key: string;
  label: string;
  type: 'select' | 'multi-select' | 'number' | 'text' | 'slider';
  options?: string[];
  min?: number;
  max?: number;
  defaultValue?: string | number | string[];
};

export type Tag = {
  id: string;
  label: string;
  sunoText: string;
  category: TagCategory;
  placement: TagPlacement;
  confidence: TagConfidence;
  aliases: string[];
  descriptionRu: string;
  descriptionEn?: string;
  compatibleGenres?: string[];
  incompatibleWith?: string[];
  parameters?: TagParameter[];
  examples: string[];
};

export type GenrePreset = {
  id: string;
  name: string;
  stylePrompt: string;
  structureTemplate: string;
  quickTags: string[];
  bpmRange: [number, number];
  recommendedTagIds: string[];
  avoidTagIds: string[];
};

export type SectionOutlineItem = {
  tag: string;
  line: number;
};

export type TagKnowledgeReliability = 'official' | 'community-tested' | 'experimental';

export type TagKnowledgeSetting = {
  key: string;
  label: string;
  explanation: string;
  goodValues?: string[];
  riskyValues?: string[];
};

export type TagKnowledgeExample = {
  title: string;
  prompt: string;
  whyItWorks: string;
};

export type TagKnowledge = {
  tagId: string;
  summaryRu: string;
  effectRu: string;
  howItWorksRu: string;
  usageRu: {
    style?: string;
    lyrics?: string;
    placementAdvice: string;
  };
  settingsRu: TagKnowledgeSetting[];
  examples: TagKnowledgeExample[];
  mistakes: string[];
  conflicts: string[];
  relatedTagIds: string[];
  reliability: TagKnowledgeReliability;
  sourceNotes: string[];
};
