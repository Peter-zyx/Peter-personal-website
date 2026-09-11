---
title: "Prosthetic Limb Analysis"
category: "Engineering Analysis"
year: "2026"
type: "Individual project"
summary: "An ANSYS study of a prosthetic running blade, comparing geometry and material choices through stress, deformation, modal and fatigue analysis."
impact: "The iterated CFRP model raised the first natural frequency from 97.2 to 147 Hz and reduced tip deformation from 6.68 to 3.24 mm, with a mass trade-off."
tags: ["ANSYS", "Finite Element Analysis", "Modal Analysis", "Materials", "Biomechanics"]
hero: "/images/projects/prosthetic-limb-analysis/blade-icon.svg"
links:
  - label: Read the full FEA report
    url: /reports/prosthetic-running-blade.pdf
---

## Overview

I developed and iterated a prosthetic running blade, comparing an equivalent isotropic CFRP model with Aluminium 2014 T4 in ANSYS. The study covers static stress, deformation, first natural frequency and material-specific fatigue assessment.

## Outcome

The final CFRP geometry reached 147 Hz first natural frequency, compared with 97.2 Hz for the baseline fine mesh. Deformation fell from approximately 6.68 to 3.24 mm; reported mass increased from approximately 0.8 to 1.3 kg.

## My Role

I completed the analysis and report individually.

## Process

I moved from a sketch and baseline CAD geometry to a raised front tip and smoother lower curve, checking both geometries with quadratic coarse, medium and fine meshes. Global/local sizes were 24/12, 16/8 and 10/5 mm.

## Technical / Design Decisions

The CFRP model used simplified isotropic properties: 65 GPa Young’s modulus, 0.30 Poisson’s ratio and 1550 kg/m³ density. A fixed upper connection and simplified normal/friction loads supported a controlled comparison rather than a full running gait simulation.

## Result

Both material models exceeded the brief’s 50 Hz frequency criterion. Aluminium fatigue analysis returned 10^8 cycles against a 10^6-cycle requirement. CFRP had no reliable S–N curve in this study, so its 266.7 MPa allowable-stress check is a strength-based screening, not a predicted fatigue life.

## Reflection

Greater stiffness improves the reported structural and modal metrics but does not alone establish better running performance. Socket compliance, impact loading, laminate direction and physical testing remain important next steps.
