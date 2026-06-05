export interface Route {
  path: string;
  filePath: string;
  isDynamic: boolean;
  group?: string;
  componentSummary?: string;
}

export interface ComponentSummary {
  route: string;
  filePath: string;
  forms: FormField[];
  buttons: string[];
  links: string[];
  headings: string[];
  hasAuthGuard: boolean;
  rawText: string;
}

export interface FormField {
  name?: string;
  type?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export interface Journey {
  name: string;
  actor: string;
  steps: string[];
  assertions: string[];
  edgeCases: string[];
  relatedRoutes: string[];
}

export interface GeneratedTest {
  journey: Journey;
  fileName: string;
  content: string;
}

export interface RepoAnalysis {
  framework: string;
  routes: Route[];
  components: ComponentSummary[];
  hasAuth: boolean;
  hasApi: boolean;
}

export interface RetrospecOptions {
  repo: string;
  output: string;
  journey?: string;
  baseUrl?: string;
  verbose?: boolean;
}
