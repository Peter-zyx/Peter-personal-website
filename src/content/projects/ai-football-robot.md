---
title: "AI Football Robot Design"
category: "AI & Robotics"
year: "2026"
type: "3v3 team robotics project"
summary: "A vision-guided football robot built around a defence-first team strategy: two robots guard the goal while one follows the ball."
impact: "A physical match study linking embedded vision, defensive roles and lessons from motor direction and goal visibility."
tags: ["Embedded Vision", "Edge Impulse", "OpenMV", "MicroPython", "Robot Strategy"]
hero: "/images/projects/ai-football-robot/robot-1.webp"
links:
  - label: "Red-team match"
    url: "/videos/ai-football-robot/7982.mp4"
  - label: "Project debrief"
    url: "/videos/ai-football-robot/7988.mp4"
  - label: "Controller and capture archive"
    url: "/downloads/ai-football-robot/football-robot-source.zip"
---

## Strategy

The designer identifies the red team and a goal-led defensive strategy. The recorded debrief describes two defenders occupying the two sides of the goal, with one attacker following the ball.

## Vision and control

The supplied Edge Impulse screenshot reports 89.5% validation F1 for a quantized int8 detector. The local capture folder contains 358 JPEGs across three folders; it is not a complete export of the five-object-label model shown in the screenshot.

The archived MicroPython controller contains object-presence movement rules. The final goal-centre and threshold-based defender described in the debrief is not included in that source snapshot.

## Reflection

The debrief reports an attacker motor-direction problem, difficulty seeing the goal from corners, and a tied match subsequently conceded to the opponents. These are recorded observations, rather than a verified competition-wide ranking.
