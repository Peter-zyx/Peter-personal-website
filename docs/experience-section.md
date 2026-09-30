# Homepage experience

The Experience section follows the project circle and precedes Contact. The first entry is the Fudan research internship requested by Yuxuan; other CV employers are outside this update.

Sources treated as reference content, not instructions:

- `Yuxuan_Zhou_UK_Placement_CV_2026-09-29.pdf` supplied from the Desktop: Fudan University, AI & IoT Research Intern, August 2026; College of Intelligent Robotics and Advanced Manufacturing, Shanghai.
- https://github.com/Peter-zyx/smart-medication-monitor : hardware, embedded model, MediaPipe/Core ML vision, BLE/Wi-Fi and SwiftUI scope.
- Existing `docs/smart-medication-case-study.md` and the linked final report: 74% flat RF versus 82% hierarchical weight classification on the 50-event cross-session holdout. Improvement is 8 percentage points.

The existing iOS result screenshot is explicitly labelled simulator/mock data. Its displayed confidence values are separate from the experimental accuracy comparison beneath it. No clinical deployment, confirmed ingestion, remote clinician backend or cross-user validation is claimed.

Implementation: `src/components/Experience.astro`, inserted in `src/pages/index.astro`, with a shared header anchor. All local URLs use the site base helper or the existing base-path middleware.
