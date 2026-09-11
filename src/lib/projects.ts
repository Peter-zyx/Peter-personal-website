import {archiveOrder} from "./projectPresentation";
export type Project = {
  slug: string;
  title: string;
  category: string;
  year: string;
  type: string;
  summary: string;
  impact: string;
  tags: string[];
  hero: string;
  links?: {
    label: string;
    url: string;
  }[];
  Content: () => unknown;
};

type ProjectModule = {
  frontmatter: Omit<Project, "slug" | "Content">;
  Content: () => unknown;
};

const modules = import.meta.glob<ProjectModule>("../content/projects/*.md", {
  eager: true
});

export const projects = Object.entries(modules)
  .map(([path, module]) => ({
    slug: path.split("/").pop()?.replace(".md", "") ?? "",
    ...module.frontmatter,
    Content: module.Content
  }))
  .sort((a, b) => {
    const rank = (slug: string) => archiveOrder.includes(slug) ? archiveOrder.indexOf(slug) : 99;
    return rank(a.slug) - rank(b.slug) || a.title.localeCompare(b.title);
  });

export const categories = [
  "All",
  ...Array.from(new Set(projects.map((project) => project.category)))
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
