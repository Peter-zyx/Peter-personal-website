---
title: "Light Control Lamp Design"
category: "AI & Robotics"
year: "2025"
type: "Group project"
summary: "ShyBloom: a responsive flower lantern combining light sensing, an umbrella-style mechanism and adjustable, breathing illumination."
impact: "Integrated a fabricated flower mechanism, Bela-based controls and five LEDs into a physical prototype, documented in a film and design portfolio."
tags: ["Bela", "Arduino / C++", "LDR", "Fusion 360", "Mechanism Design"]
hero: "/images/projects/light-control-lamp/prototype-lit.webp"
links:
  - label: "ShyBloom portfolio"
    url: "/reports/shybloom-portfolio.pdf"
  - label: "Demonstration film"
    url: "/videos/shybloom-demo.mp4"
---

## Overview

ShyBloom is a Group 40 physical-computing project by Cici Song and Yuxuan Zhou. Inspired by mimosa and umbrella mechanisms, the flower lantern responds to light reaching an LDR at the top of its central pillar.

## Outcome

The fabricated prototype integrates a servo-driven rack-and-pinion, coordinated petal supports, five LEDs and Bela-based controls. A one-minute film and five-page portfolio document the result.

## My Role

The supplied portfolio credits Cici Song and Yuxuan Zhou jointly. Concept development, CAD, electronics and fabrication are presented as shared project work because the archive does not allocate individual responsibilities.

## Process

The team moved from concept sketches and Fusion 360 CAD to physical fabrication, assembly and integration. Iterations addressed joint play, excessive slot travel and rack alignment using washers, locking nuts, shorter slots and additional guides.

## Technical / Design Decisions

One servo drives the lower ring vertically through a rack-and-pinion; linked arms open the petals together. The intended behaviour closes the flower in bright light and opens it in darkness. A potentiometer adjusts LED brightness and a button toggles breathing mode. A hand interacts by shading the LDR, rather than through distance sensing.

## Result

The project produced a physical interaction prototype, demonstration film and portfolio. The supplied source uses Arduino-style C++ on Bela; it is a development snapshot with state-transition inconsistencies, not a verified firmware release.

## Reflection

ShyBloom connects form, sensing, movement and light. The portfolio proposes RGB/NeoPixel lighting and petal-mounted LEDs, with further refinement needed in mechanical consistency, durability and control-state validation.
