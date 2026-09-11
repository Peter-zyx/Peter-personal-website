import { defineCollection, z } from "astro:content";

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    category: z.string(),
    year: z.string(),
    type: z.string(),
    summary: z.string(),
    impact: z.string(),
    tags: z.array(z.string()),
    hero: z.string(),
    links: z
      .array(
        z.object({
          label: z.string(),
          url: z.string()
        })
      )
      .optional()
  })
});

export const collections = { projects };
