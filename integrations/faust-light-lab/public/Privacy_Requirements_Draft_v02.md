# Privacy Indication Requirements · Draft v02

Status: design intent for engineering review. No approved minimum arc or physical visibility claim.

## Required behavior

1. Red must remain continuously readable while the relevant capture activity is active. A short acknowledgement animation must not determine the duration of privacy indication.
2. Apply red after base-state transitions and white photo/acknowledgement cues. User dimming must not reduce it below an independently established privacy floor.
3. Changes to Speaking, Processing, Error or a Sleep request must not clear red while capture is still active. The real product must coordinate camera activity and indication; the web hold only simulates this relationship.
4. If more than one capture activity requires indication, ending one must not clear red for another active activity.

## Coverage specification to finalize

Specify all of these together: horizontal viewing range, vertical viewing range, distance, ambient-light range, minimum visible luminous arc/area, color recognition, minimum output and continuous duration. A count of reserved LEDs is insufficient.

The working horizontal review range is a complete rotation. The present diagnostic elevations are 0°, 5°, 10°, 20° and, in the web demo, 30° above the ring center. These are test coordinates, not an approved ergonomic range. Engineering/product review must confirm the actual required range and distances.

The minimum arc remains **TBD**. Day 1 demonstrated blind spots even with multiple wide markers. Day 2 identifies a simulated interaction between lower-edge shading and emission geometry. Choosing a numeric minimum before resolving the optical path would create false confidence.

## Mapping to discrete output

The Week 4 web implementation specifies marker distribution, requested arc per marker and layout rotation in degrees. It illuminates every logical sector that overlaps a requested arc. This rounds coverage outward, including at the angular seam and at odd LED counts.

- Front is centered on web zone 01. Hardware orientation is unconfirmed.
- The UI reports the actual number of red zones, total nominal sector coverage and largest unlit sector gap.
- Nominal sector coverage includes geometric gaps between rendered emitters. It is not continuous luminous coverage through a real diffuser.
- Wider/more numerous markers increase total emitting area. Per-zone brightness is held independently; total power is not normalized.
- The default single 45° marker at eight zones preserves the old web baseline for comparison. It is not the recommended final solution.
- The engine accepts legacy `privacyCount` parameters for v1 compatibility. The current UI and v2 export use degree-based parameters.

The existing normalized floor of 0.32 is retained for simulation. It is not a measured luminance, current or PWM requirement. Set physical values using powered samples under target conditions.

## Evidence needed before approval

Continuous rotation at the agreed distances and elevations, including angles between static samples; powered clear-cover samples; bright/dim environments; actual camera start/stop and fault behavior; white-cue overlap; minimum user brightness; light leakage into the camera; LED layout tolerances, current, temperature and optical transmission.

Exact ring-level web views require special care: the web emitters are flat, zero-thickness surfaces and can become edge-on. Their disappearance alone is not evidence of a physical device failure. Blender includes emitter depth and different material optics, and is also uncalibrated.
