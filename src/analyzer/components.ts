import * as fs from 'fs';
import { parse } from '@typescript-eslint/typescript-estree';
import { ComponentSummary, FormField, Route } from '../types';

export function analyzeComponent(route: Route): ComponentSummary {
  const summary: ComponentSummary = {
    route: route.path,
    filePath: route.filePath,
    forms: [],
    buttons: [],
    links: [],
    headings: [],
    hasAuthGuard: false,
    rawText: '',
  };

  let source: string;
  try {
    source = fs.readFileSync(route.filePath, 'utf-8');
  } catch {
    return summary;
  }

  try {
    const ast = parse(source, { jsx: true, range: false, loc: false });
    traverse(ast, summary, source);
  } catch {
    // If AST parsing fails, fall back to regex extraction
    extractViaRegex(source, summary);
  }

  summary.hasAuthGuard = detectAuthGuard(source);
  summary.rawText = buildRawText(summary);

  return summary;
}

function traverse(node: any, summary: ComponentSummary, source: string): void {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'JSXElement') {
    const opening = node.openingElement;
    const tagName = getTagName(opening);

    if (tagName === 'input' || tagName === 'Input') {
      summary.forms.push(extractFormField(opening));
    }

    if (tagName === 'textarea' || tagName === 'Textarea') {
      summary.forms.push({ type: 'textarea', ...extractFormField(opening) });
    }

    if (tagName === 'select' || tagName === 'Select') {
      summary.forms.push({ type: 'select', ...extractFormField(opening) });
    }

    if (tagName === 'button' || tagName === 'Button') {
      const text = extractJSXText(node);
      if (text) summary.buttons.push(text);
    }

    if (tagName === 'a' || tagName === 'Link') {
      const text = extractJSXText(node);
      const href = getAttrValue(opening, 'href') || getAttrValue(opening, 'to');
      if (text || href) summary.links.push(`${text || 'link'}${href ? ` → ${href}` : ''}`);
    }

    if (/^h[1-6]$/.test(tagName)) {
      const text = extractJSXText(node);
      if (text) summary.headings.push(text);
    }
  }

  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach(c => traverse(c, summary, source));
    } else if (child && typeof child === 'object' && child.type) {
      traverse(child, summary, source);
    }
  }
}

function getTagName(opening: any): string {
  const name = opening?.name;
  if (!name) return '';
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression') return `${name.object?.name}.${name.property?.name}`;
  return '';
}

function extractFormField(opening: any): FormField {
  return {
    name: getAttrValue(opening, 'name'),
    type: getAttrValue(opening, 'type') || 'text',
    label: getAttrValue(opening, 'aria-label') || getAttrValue(opening, 'placeholder'),
    placeholder: getAttrValue(opening, 'placeholder'),
    required: hasAttr(opening, 'required'),
  };
}

function getAttrValue(opening: any, attrName: string): string | undefined {
  const attrs: any[] = opening?.attributes || [];
  for (const attr of attrs) {
    if (attr.type === 'JSXAttribute' && attr.name?.name === attrName) {
      const val = attr.value;
      if (!val) return 'true';
      if (val.type === 'Literal') return String(val.value);
      if (val.type === 'JSXExpressionContainer' && val.expression?.type === 'Literal') {
        return String(val.expression.value);
      }
    }
  }
  return undefined;
}

function hasAttr(opening: any, attrName: string): boolean {
  return (opening?.attributes || []).some(
    (a: any) => a.type === 'JSXAttribute' && a.name?.name === attrName
  );
}

function extractJSXText(node: any): string {
  const texts: string[] = [];

  function collect(n: any): void {
    if (!n) return;
    if (n.type === 'JSXText') {
      const t = n.value.trim();
      if (t) texts.push(t);
    }
    if (n.type === 'Literal' && typeof n.value === 'string') {
      texts.push(n.value.trim());
    }
    for (const key of Object.keys(n)) {
      if (key === 'parent') continue;
      const child = n[key];
      if (Array.isArray(child)) child.forEach(collect);
      else if (child && typeof child === 'object' && child.type) collect(child);
    }
  }

  collect(node);
  return texts.join(' ').trim().slice(0, 60);
}

function detectAuthGuard(source: string): boolean {
  return (
    source.includes('getServerSession') ||
    source.includes('useSession') ||
    source.includes('redirect(') ||
    source.includes('notFound()') ||
    source.includes('auth()') ||
    source.includes('requireAuth') ||
    source.includes('withAuth')
  );
}

function extractViaRegex(source: string, summary: ComponentSummary): void {
  const buttonMatches = source.matchAll(/<button[^>]*>([^<]{1,60})<\/button>/gi);
  for (const m of buttonMatches) summary.buttons.push(m[1].trim());

  const inputMatches = source.matchAll(/<input[^>]*(?:name|placeholder)="([^"]+)"[^>]*>/gi);
  for (const m of inputMatches) summary.forms.push({ name: m[1] });

  const headingMatches = source.matchAll(/<h[1-6][^>]*>([^<]{1,80})<\/h[1-6]>/gi);
  for (const m of headingMatches) summary.headings.push(m[1].trim());
}

function buildRawText(summary: ComponentSummary): string {
  const lines: string[] = [];

  if (summary.headings.length) lines.push(`Headings: ${summary.headings.join(', ')}`);
  if (summary.buttons.length) lines.push(`Buttons: ${summary.buttons.join(', ')}`);
  if (summary.forms.length) {
    const fields = summary.forms.map(f => [f.label || f.name || f.type, f.required ? '(required)' : ''].filter(Boolean).join(' ')).join(', ');
    lines.push(`Form fields: ${fields}`);
  }
  if (summary.links.length) lines.push(`Links: ${summary.links.slice(0, 5).join(', ')}`);
  if (summary.hasAuthGuard) lines.push('Auth guard: yes');

  return lines.join('\n');
}
