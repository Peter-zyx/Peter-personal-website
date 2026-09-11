---
title: "Dancing Segway Design"
category: "AI & Robotics"
year: "2026"
type: "Group project"
summary: "A two-wheel MicroPython platform exploring beat-driven choreography, motor feedback and a separate pitch-based balance controller."
impact: "A moving physical prototype and a staged archive of audio, motion and feedback-control experiments."
tags: ["MicroPython", "Embedded Control", "Beat Detection", "PID", "Physical Prototyping"]
hero: "/images/projects/dancing-segway/poster.webp"
links:
  - label: "Prototype demonstration"
    url: "/videos/dancing-segway/prototype-demo.mp4"
  - label: "Development source archive"
    url: "/downloads/dancing-segway/dancing-segway-source.zip"
---

## Overview

A robotics project on the Pyboard / PyBench teaching platform, developed through audio-reactive LEDs, tilt-to-motor experiments, wheel-speed feedback, beat-triggered choreography and a separate pitch PID controller.

## Choreography

The dance controller samples microphone input at 8 kHz, gathers energy in 160-sample windows and advances through the saved FBFBLRLR sequence on accepted beats. The balance program is a separate entry point, with a target 5 ms control interval and slower OLED updates.

## Evidence

The supplied 34-second video documents physical prototype motion. The source archive records development stages and retains the original teaching-library attribution. Integrated dancing and balancing performance is not established by these materials.
