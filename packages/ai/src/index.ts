export { AIService } from './ai-service';
export { generateSubjectLines } from './generators/subject-lines';
export { generateEmailCopy } from './generators/email-copy';
export { suggestTemplate } from './generators/template-suggester';
export type {
  SubjectLineRequest,
  SubjectLineResponse,
  EmailCopyRequest,
  EmailCopyResponse,
  TemplateSuggestionRequest,
  TemplateSuggestionResponse,
} from './types';
