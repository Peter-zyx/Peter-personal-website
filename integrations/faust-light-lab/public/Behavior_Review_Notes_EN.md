# Week 4 — Speaking and Error Behavior Review

## Review objective

Make events readable through distinct shapes and brief bright accents. Assess calmness through timing and rest intervals. All candidates are visual simulations; this review does not establish physical brightness or optical visibility.

## Candidates

| Behavior | Baseline | Candidate A | Candidate B |
| --- | --- | --- | --- |
| Speaking | Week 3 uniform modulation | A front-centered bloom changes width and brightness | Two fixed opposed patches change emphasis with synthesized speech |
| Error | Week 3 quiet double pulse, with hard edges | Brighter double pulse across the ring, then a low uniform rest | Three separated white patches remain visible between bright double pulses |

Speaking B and Error B are the provisional defaults. Speaking B provides spatial distinction from Ready without rotation. Error B gives a continuing fault a recognizable resting shape. These choices require human comparison; no preference test has been completed. Listening retains its existing breathing pattern.

New Error pulses repeat every 3.2 seconds. Each pulse occupies 0.28 seconds, with 60 ms rise and fall ramps and a 160 ms plateau. Pulse starts are 0 and 0.48 seconds. Error A rests at normalized level 0.08; Error B retains a shaped level of up to 0.42 before global dimming. Those values are engine parameters, not physical output measurements. Error pulse edges are an explicit exception to ordinary conversation transition timing. Red remains reserved for capture indication.

## Matched comparison

Open `Behavior_Review.html` through the local review server. All six diagrams share one 6.4-second timeline, covering two new Error cycles. Samples are generated from the live engine at 30 frames per second, for 8, 12 and 36 zones. The page provides pause, replay, scrubbing and label hiding. Diagrams isolate output shape and timing; they do not simulate the cover or physical LEDs.

1. Compare Speaking at matched times. Check whether it is distinguishable from steady Ready and whether either candidate appears to rotate.
2. Inspect Error at the bright peaks and during its quiet interval. Check whether a continuing fault remains apparent.
3. Repeat at 8, 12 and 36 zones. Coarse sampling can change the apparent shape.
4. Use the live 3D demo to inspect the preferred candidate from front, side and back with the cover visible.
5. Record recognizability and calmness separately. A bright event can remain calm when brief and infrequent.

The live selectors preserve the current phase. Replay from start provides a matched starting point and resumes playback. Capture hold remains active through candidate changes and replay.

## Conversation timing

Default transition: 0.5 seconds. Listening period: 2.8 seconds.

| Time (seconds) | Behavior |
| --- | --- |
| 0–1 | Ready |
| 1–1.5 | Enter Listening |
| 1.5–7.1 | Two complete stable Listening cycles |
| 7.1–7.6 | Enter Processing |
| 7.6–11.6 | Processing |
| 11.6–12.1 | Enter Speaking |
| 12.1–16.5 | Speaking |
| 16.5–17 | Return to Ready |
| 17–18 | Ready |

The sequence computes its schedule from the selected breathing period and transition duration at playback start. Changing either control exits autoplay. Wake sets the state to Ready immediately and plays a 1.5-second entry animation; it has no separate state button.

## Verification and remaining work

The automated suite has 30 tests covering normalized output, candidate behavior, Listening cycle timing, timing snapshots, Wake entry, capture priority, privacy coverage and English UI text. The production build passes, with a bundle-size advisory for the Three.js application.

Browser checks confirmed Speaking variant selection and replay, the default Error B selection, Sleep enabling Wake, Wake immediately reporting Ready with its entry description, and Conversation returning to Ready and free exploration. The comparison page was inspected at 12 zones and a shared 2.00-second quiet interval; Error B retained its separated marks. Pause, scrubbing, count selection, label hiding/restoration and replay were checked. This is functional and visual inspection, not a user preference study or physical validation.

Next decisions: collect a short matched comparison, choose or revise the Speaking/Error candidates, then transfer the selected timing and shape specifications to hardware review. Privacy optics remains a separate open issue documented in `Privacy_Requirements_Draft_v02.md`. No minimum physical arc, LED count, viewing-angle coverage or brightness level is approved by this behavior pass.
